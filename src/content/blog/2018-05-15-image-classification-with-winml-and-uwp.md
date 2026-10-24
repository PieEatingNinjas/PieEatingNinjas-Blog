---
title: "Image classification with WinML and UWP"
description: "Please take a look at my recent blogpost Image classification with WinML and UWP (update) to see what has been changed when using the latest and greatest tooling and apis. During t"
pubDate: "2018-05-15"
legacy: {"id":1164,"path":"/2018/05/15/image-classification-with-winml-and-uwp/","taxonomySlugs":{"categories":["ai","c","cognitive-services","custom-vision","ml","uwp","visual-studio"],"tags":[]}}
categories: ["C#","ai","cognitive-services","custom-vision","ml","uwp","visual-studio"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/DisneyCastleClassification"]
---

**Please take a look at my recent blogpost [Image classification with WinML and UWP (update)](/2019/04/22/image-classification-with-winml-and-uwp-update/ "Image classification with WinML and UWP (update)") to see what has been changed when using the latest and greatest tooling and apis.**

During the Windows Developer Day, Microsoft has spoken a lot about WinML. From that moment on, I was trying to find some spare time to start playing with this. I finally managed to build a very simple UWP Console app that does image classification, using a ONNX file that I trained in the cloud. In this blogpost I'll show you exactly how I've built this. The resulting UWP Console app will take all images from the executing folder, classify them and will add the classification as a Tag to the metadata of the image. All of this running on your local machine!

# Creating and training our Machine Learning Model

Microsoft has created the [Custom Vision Service](https://www.customvision.ai/ "Custom Vision Service") that we can use in order to create Custom Vision Classifiers. It allows us to upload images, categorize them, train our Machine Learning Model (model for short in this context) and export it as an ONNX file that we can use in UWP.

Once you are signed-in in the Custom Vision Service, you can create projects. The project I created for this demo, is one to identify the different iconic castles from the Disney theme parks around the world:

[![Create new custom vision project](/wp-content/uploads/2018/05/NewProject.jpg)](/wp-content/uploads/2018/05/NewProject.jpg)

When creating a new project, you need to identify the Project Type and the Domain. For this example, I choose 'Classification' and 'Landmarks (compact)'. The '... Compact' project types are lightweight models to be used on iOS and Android. For sake of this demo, I'll go for compact here, so I can experiment with iOS and Android later on as well.

Next, we can start adding images to our project. I Googled/Binged for photos of the 3 most beautiful Disney Castles (Anaheim, Shanghai and -of course- Paris), downloaded them, selected them in the tool, tagged and uploaded them. For this demo I added 20 images of each castle. Microsoft recommends to have at least 50, but for this simple demo 20 turns out to be sufficient. Once that is done, you should see the Tags you've created on the left-hand side on the screen.

![Tags](/wp-content/uploads/2018/05/Tags.jpg)

By selecting one or multiple tags, the images get filtered so you quickly check if your tags are OK.

Now, we can train our model. This is very easy, you just have to click the green 'Train' button on top of the page. Once your model has been trained, the Custom Vision Service will show you the performance of your model:

[![Performance](/wp-content/uploads/2018/05/Performance.jpg)](/wp-content/uploads/2018/05/Performance.jpg)

As I'm a newby in all this ML and AI stuff, I can't yet really give a detailed explanation about the numbers in the report. But, everything is above 90% so I assume our model is good enough to be used in a demo! ;-)

Next, we can Export our model so we can use it offline. To do this, simply click the 'Export' button at the top of the page and select ONNX Windows ML. It might be a good idea to rename your ONNX file to something more descriptive. Finally, we can move over to Visual Studio and start coding our UWP app!

# Building our UWP app

Let's recap for a second here... The resulting console app should take all images from the executing folder, analyze each one and properly update its metadata. So apart from the analyzing-part, nothing really new or fancy needs to be done, so let's do these things first.

## Creating a UWP Console app

In an [earlier blogpost](/2018/04/05/creating-a-uwp-console-app-in-c/ "Creating a UWP Console app in C#") I stipulated how to create a UWP Console App. The cool thing with UWP Console (and Mutli-Instancing) Apps is that when they are launched from the command line, the app is granted permissions to the file-system from the current working directory and below.

So getting the images from the executing folder is really easy:

**Getting files from executing folder**

```csharp
private static async Task<IEnumerable<StorageFile>> GetImagesFromExecutingFolder()
{
    var folder = await StorageFolder.GetFolderFromPathAsync(Environment.CurrentDirectory);

    var queryOptions = new QueryOptions(CommonFileQuery.DefaultQuery, new List<string>() { ".jpg", ".png" });

    return await folder.CreateFileQueryWithOptions(queryOptions)?.GetFilesAsync();
}
```

## Updating the tag of an image

After I categorized the image, I want to update its metadata and set the name of the castle as a tag. Using UWP it is possible to update the tag metadata of an image:

**Update tag property of image**

```csharp
private static async Task UpdateImageTagMetadata(ImageProperties imageProperties, params string[] tags)
{
    var propertiesToSave = new List<KeyValuePair<string, object>>()
    {
        new KeyValuePair<string, object>("System.Keywords", String.Join(';', tags))
    };
    await imageProperties.SavePropertiesAsync(propertiesToSave);
}
```

This `ImageProperties` type that is being passed-in in this method, is an object that I can retrieve from a `StorageFile`. It contains a bunch of image-related properties of that file.

**Accessing ImageProperties**

```csharp
foreach (StorageFile image in await GetImagesFromExecutingFolder())
{
    var imageproperties = await image.Properties.GetImagePropertiesAsync();
}
```

## Doing some Machine Learning locally on the device

And now, for the grand finale: let's add some AI to our console app!

In Visual Studio, right click on your Assets folder in your UWP project and select 'Add Existing Item'. Next, select the ONNX file you've downloaded earlier. Visual Studio should automatically add a wrapper class around your model (if you have installed the Microsoft Visual Studio Tools for AI, see the notes at the end of the post). Also don't forget to set the Build Action of the ONNX file to 'Content'!

![Generated wrapper class](/wp-content/uploads/2018/05/wrapperclass.jpg)

This wrapper class allows us to work with our ONNX file locally on our device. If you take a look at the generated class, you'll see that generated names of the classes and methods are a bit... obscure, to say at least. So I did some renaming to ease working with this generated code:

**Renaming of generated wrapper class**

```csharp
public sealed class ModelInput
{
    public VideoFrame data { get; set; }
}

public sealed class ModelOutput
{
    public IList<string> classLabel { get; set; }
    public IDictionary<string, float> loss { get; set; }
    public ModelOutput()
    {
        this.classLabel = new List<string>();
        this.loss = new Dictionary<string, float>()
        {
            { "Anaheim", float.NaN },
            { "Paris", float.NaN },
            { "Shanghai", float.NaN },
        };
    }
}

public sealed class Model
{
    private LearningModelPreview learningModel;
    public static async Task<Model> CreateModel(StorageFile file)
    {
        LearningModelPreview learningModel = await LearningModelPreview.LoadModelFromStorageFileAsync(file);
        Model model = new Model();
        model.learningModel = learningModel;
        return model;
    }
    public async Task<ModelOutput> EvaluateAsync(ModelInput input) {
        ModelOutput output = new ModelOutput();
        LearningModelBindingPreview binding = new LearningModelBindingPreview(learningModel);
        binding.Bind("data", input.data);
        binding.Bind("classLabel", output.classLabel);
        binding.Bind("loss", output.loss);
        LearningModelEvaluationResultPreview evalResult = await learningModel.EvaluateAsync(binding, string.Empty);
        return output;
    }
}
```

Once this is in place, the only thing that is left to do, is using this generated class to evaluate our images. And this is basically a 3-step process: Load, Bind and ultimatly Evaluate.

So first we need to load our model in our app:

**Loading ONNX model**

```csharp
StorageFile modelFile = 
    await StorageFile.GetFileFromApplicationUriAsync(new Uri($"ms-appx:///Assets/DisneyCastles.onnx"));
Model model = await Model.CreateModel(modelFile);
```

The second step, Bind, is creating our input for the model. This will be the image that we want to evaluate.

**Binding input**

```csharp
ModelInput ModelInput = new ModelInput();
ModelInput.data = inputImage;
```

There is some extra work here that needs to be done. The data property of the `ModelInput` object is of type `VideoFrame` and the only thing we have at the moment are objects of type `StorageFile`. So, in order to pass our images to our model, we need to convert a `StorageFile` to a `VideoFrame`.

**Converting StorageFile to VideoFrame**

```csharp
private static async Task<VideoFrame> GetVideoFrame(StorageFile file)
{
    SoftwareBitmap softwareBitmap;
    using (IRandomAccessStream stream = await file.OpenAsync(FileAccessMode.Read))
    {
        // Create the decoder from the stream 
        BitmapDecoder decoder = await BitmapDecoder.CreateAsync(stream);

        // Get the SoftwareBitmap representation of the file in BGRA8 format
        softwareBitmap = await decoder.GetSoftwareBitmapAsync();
        softwareBitmap = SoftwareBitmap.Convert(softwareBitmap, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);

        return VideoFrame.CreateWithSoftwareBitmap(softwareBitmap);
    }
}
```

And finally, we can evaluate our image against our ONNX model.

**Evaluating ONNX model**

```csharp
var ModelOutput = await model.EvaluateAsync(ModelInput);
var topCategory = ModelOutput.loss.OrderByDescending(kvp => kvp.Value).FirstOrDefault().Key;
```

By calling the `EvaluateAsync` method on our model, we can pass-in the input containing the image we want to evaluate. Through the `loss`  property on the `ModelOutput` class, we can see the probability percentage per category. So we can simply use Linq in order to get the most probable category of our image! How cool is this?! 8-) Now we just need to take all of our building blocks and tie it all together.

# Let's tie it all up

This is what my resulting code looks like:

**The resulting code**

```csharp
public class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Running...");

        Run().ContinueWith((_) => Console.WriteLine("Done!"));
        
        Console.ReadKey();
    }

    private static async Task Run()
    {
        StorageFile modelFile =
            await StorageFile.GetFileFromApplicationUriAsync(new Uri($"ms-appx:///Assets/DisneyCastles.onnx"));
        Model model = await Model.CreateModel(modelFile);

        foreach (StorageFile image in await GetImagesFromExecutingFolder())
        {
            Console.Write($"Processing {image.Name}... ");
            var videoFrame = await GetVideoFrame(image);

            ModelInput ModelInput = new ModelInput();
            ModelInput.data = videoFrame;

            var ModelOutput = await model.EvaluateAsync(ModelInput);
            var topCategory = ModelOutput.loss.OrderByDescending(kvp => kvp.Value).FirstOrDefault();

            Console.Write($"DONE ({topCategory.Key} {topCategory.Value:P2})\n");

            await UpdateImageTagMetadata(await image.Properties.GetImagePropertiesAsync(), topCategory.Key);
        }
    }

    private static async Task<IEnumerable<StorageFile>> GetImagesFromExecutingFolder()
    {
        var folder = await StorageFolder.GetFolderFromPathAsync(Environment.CurrentDirectory);

        var queryOptions = new QueryOptions(CommonFileQuery.DefaultQuery, new List<string>() { ".jpg", ".png" });

        return await folder.CreateFileQueryWithOptions(queryOptions)?.GetFilesAsync();
    }

    private static async Task UpdateImageTagMetadata(ImageProperties imageProperties, params string[] tags)
    {
        var propertiesToSave = new List<KeyValuePair<string, object>>()
        {
            new KeyValuePair<string, object>("System.Keywords", String.Join(';', tags))
        };
        await imageProperties.SavePropertiesAsync(propertiesToSave);
    }

    private static async Task<VideoFrame> GetVideoFrame(StorageFile file)
    {
        SoftwareBitmap softwareBitmap;
        using (IRandomAccessStream stream = await file.OpenAsync(FileAccessMode.Read))
        {
            // Create the decoder from the stream 
            BitmapDecoder decoder = await BitmapDecoder.CreateAsync(stream);

            // Get the SoftwareBitmap representation of the file in BGRA8 format
            softwareBitmap = await decoder.GetSoftwareBitmapAsync();
            softwareBitmap = SoftwareBitmap.Convert(softwareBitmap, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);

            return VideoFrame.CreateWithSoftwareBitmap(softwareBitmap);
        }
    }
}
```

When I run this from the console, this is the output, just as I expected:

![DisneyCastles result console](/wp-content/uploads/2018/05/resultConsole.jpg)

![DisneyCastles result explorer](/wp-content/uploads/2018/05/result.jpg)

I have to say that I'm really astonished with the result! With just a few lines of code and some model training in the cloud, I can create an intelligent console app! **WinML is awesome!**

You can find my code, including some images to test the app with, on my [GitHub](https://github.com/PieEatingNinjas/DisneyCastleClassification "GitHub - Disney Castle Classification").

## Notes

-   This only runs on Windows version 1803 and up
-   Make sure you have Visual Studio 15.7.1 (or up)
-   Install the [Microsoft Visual Studio Tools for AI](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.vstoolsai-vs2017 "Microsoft Visual Studio Tools for AI")
