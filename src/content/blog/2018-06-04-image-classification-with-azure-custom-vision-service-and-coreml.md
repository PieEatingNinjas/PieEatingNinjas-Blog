---
title: "Image classification with Azure Custom Vision Service and CoreML"
description: "In my previous blogpost I created a small PoC to show you how to work with the Azure Custom Vision Service and WinML. In this blogpost we are going to take the same model that I ha"
pubDate: "2018-06-04"
legacy: {"id":1197,"path":"/2018/06/04/image-classification-with-azure-custom-vision-service-and-coreml/","taxonomySlugs":{"categories":["ai","azure","c","cognitive-services","custom-vision","ml","xamarin"],"tags":[]}}
categories: ["C#","ai","azure","cognitive-services","custom-vision","ml","xamarin"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/DisneyCastleClassificationCoreML"]
---

In my [previous blogpost](/2018/05/15/image-classification-with-winml-and-uwp/ "Image classification with WinML and UWP") I created a small PoC to show you how to work with the Azure Custom Vision Service and WinML. In this blogpost we are going to take the same model that I have trained back then, export it as a CoreML model and use it in iOS using Xamarin. I was surprised by how easy it is to do!

# Export the model and convert it

Firstly, I'm going back to [Azure Custom Vision Service](https://www.customvision.ai/ "Azure Custom Vision Service") where I previously created a project and trained a model that classifies pictures of Disney castles. More information about this can be found in my previous blogpost.

In the Performance tab, I can click the Export button and select CoreML to download a Machine Learning Model that can be used by iOS' CoreML framework. Once downloaded, there is an additional thing we need to do in order to use it as iOS requires a compiled model (a directory ending with _.mlmodelc_). To compile our _.mlmodel_ file that we just downloaded, we need to execute the following script (on your Mac):

```bash
xcrun coremlcompiler compile [YOUR_MODEL_NAME].mlmodel [YOUR_OUTPUT_FOLDER]
```

This is what the resulting .mlmodelc folder looks like:

![The resulting mlmodelc folder](/wp-content/uploads/2018/06/Screen-Shot-2018-06-03-at-16.55.14.png)

Once we have done this, we can open Visual Studio and create a new Xamarin iOS project.

# Add compiled model to Xamarin.iOS project

In Visual Studio, right click the Resources folder of the Xamarin.iOS project and select 'Add Existing Folder...'. Select the \*.mlmodelc folder that the CoreMLCompiler has created. Make sure that the _Build Action_ of every file that has been included  ( \*.bin, \*.net, \*.shape, \*.weights) is set to _BundleResource_.

![Compiled model added as Resource](/wp-content/uploads/2018/06/Screen-Shot-2018-06-03-at-17.03.33.png)

# Initialise the model and classification request

Finally, we need to write (very little) code to use our model to do our classification.

**Loading the compiled model in Xamarin iOS**

```csharp
void LoadMLModel()
{
    // Load the ML model
    var assetPath = NSBundle.MainBundle.GetUrlForResource("44105f291f4648b2b0ad7d42d639cb20", "mlmodelc");
    var mlModel = MLModel.Create(assetPath, out NSError mlErr);
    var vModel = VNCoreMLModel.FromMLModel(mlModel, out NSError vnErr);

    ClassificationRequest = new VNCoreMLRequest(vModel, HandleClassification);
}
```

First, we need to create an _NSUrl_ that points to the .mlmodelc folder in the app's resources.

Next, we need to create an _MLModel_ from this url.

As we are working with images, we are not just going to use this model directly. Instead, we will be using the _VNCoreMLModel_ object which is a wrapper around a Core ML model, that can be used to do Vision recognition requests.

Once we have an instance of a _VNCoreMLModel_ object, containing our trained classification model, we can create a _VNCoreMLRequest_ object. To create an instance of a _VNCoreMLRequest_ object, we pass in the _VNCoreMLModel_ and a completion handler. Fast forward: later on in code we will reference this request object. When the classification is done, the completion handler delegate will be called where we are able to read the result of the classification.

# Picking an image and showing it on screen

In the app, there is a button which allows the user to select an image from the phone's album. Once an image is selected, it is shown on screen and a button appears that will do the classification of the chosen image. Not going into detail here, as this 'generic' code has nothing to do with the topic itself.

**Picking photo and showing it on screen**

```csharp
partial void LoadImage_Clicked(UIButton sender)
{
    picker = new UIImagePickerController();
    picker.SourceType = UIImagePickerControllerSourceType.PhotoLibrary;
    picker.MediaTypes = UIImagePickerController.AvailableMediaTypes(UIImagePickerControllerSourceType.PhotoLibrary);
    picker.FinishedPickingMedia += Picker_FinishedPickingMedia;
    PresentViewController(picker, animated: true, completionHandler: null);
}

void Picker_FinishedPickingMedia(object sender, UIImagePickerMediaPickedEventArgs e)
{
    NSUrl referenceURL = e.Info[new NSString("UIImagePickerControllerReferenceUrl")] as NSUrl;

    pickedImage = e.Info[UIImagePickerController.OriginalImage] as UIImage;
    if (pickedImage != null)
    {
        image.Image = pickedImage;
        btnAnalyze.Hidden = false;
    }
    picker.DismissModalViewController(true);
}
```

# Doing the image classification

Once the user has selected an image, a button will appear. When clicking this button, the chosen image will be classified using the Machine Learning Model that we initially created in Azure, downloaded, compiled and referenced in our app.

**Triggering the Classification request**

```csharp
partial void Analyze_Clicked(UIButton sender)
{
    //load image
    var handler = new VNImageRequestHandler(pickedImage.CGImage, new VNImageOptions());
    DispatchQueue.DefaultGlobalQueue.DispatchAsync(() =>
    {
        handler.Perform(new VNRequest[] { ClassificationRequest }, out NSError err);
    });
}
```

First, we create a _VNImageRequestHandler_. This is an object that process one or more image analysis requests on a single image. We pass in the image selected by the user.

Next, we can call the _Perform_ method on this object, passing in the analysis we want to do. Earlier we initialised the _ClassificationRequest_ member which has a reference to our Machine Learning Model and a completion handler that get's triggered when the classification is done. So we pass in this _ClassificationRequest_.

Once the classification is done, we can get the result in the completion handler delegate of the _ClassificationRequest_:

**Getting the classification result**

```csharp
void HandleClassification(VNRequest request, NSError error)
{
    try
    {
        var observations = request.GetResults<VNClassificationObservation>();

        var best = observations[0]; // first/best classification result

        DispatchQueue.MainQueue.DispatchAsync(() =>
        {
            var alert = UIAlertController.Create($"We think it's the castle in {best.Identifier}", 
                                                 $"We are { best.Confidence * 100f:#.00}% confident", 
                                                 UIAlertControllerStyle.Alert);
            alert.AddAction(UIAlertAction.Create("Thanks!", UIAlertActionStyle.Default, (obj) => { }));
            PresentViewController(alert, true, null);
        });
    }
    catch (Exception ex)
    {
        //¯\_(ツ)_/¯
    }
}
```

We can get the classification by calling the generic _GetResults_ method on the _request_ object, passing in _VNClassificationObservation_ as the type parameter (because classifications is what we expect).

We take the first result from this array, as this is the one with the highest confidence. All that is left to do, is show this to the user! Done! 8-)

![Image classification CoreML](/wp-content/uploads/2018/06/Jun-03-2018-18-12-48.webp)

# Conclusion

It is very easy to train your image classification models in Azure, using the Custom Vision Service. Exporting these models and using them offline in combination with CoreML or WinML (as discussed in an earlier blogpost), is just peanuts! Adding artificial intelligence to your apps has never been easier! :-)

The code can be found on [GitHub](https://github.com/PieEatingNinjas/DisneyCastleClassificationCoreML "DisneyCastleClassificationCoreML").
