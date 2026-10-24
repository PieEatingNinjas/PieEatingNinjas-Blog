---
title: "Displaying PDF files in a UWP app"
description: "In this short blogpost I want to show you how I've used the Windows.Data.Pdf.PdfDocument class in order to render a PDF file inside my UWP app. In order to open a PDF from a UWP ap"
pubDate: "2016-02-06"
legacy: {"id":498,"path":"/2016/02/06/displaying-pdf-files-in-a-uwp-app/","taxonomySlugs":{"categories":["c","uwp","xaml"],"tags":[]}}
categories: ["C#","uwp","xaml"]
tags: []
---

In this short blogpost I want to show you how I've used the _Windows.Data.Pdf.PdfDocument_ class in order to render a PDF file inside my UWP app.

In order to open a PDF from a UWP app, you can ofcourse, always use _Windows.System.Launcher.LaunchUriAsync_ like this:

**using LauncherOptions**

```csharp
Windows.System.LauncherOptions options = new Windows.System.LauncherOptions();
options.ContentType = "application/pdf";
Windows.System.Launcher.LaunchUriAsync(new Uri(fileUrl), options);
```

This works great, but your file is being opened in an other app. And this might not be what you want. We just want the content of the PDF file being rendered inside our UWP app itself.

![PDF content in UWP](/wp-content/uploads/2016/02/pdf-print-screen.png) PDF content in UWP

And that's very simple to do!

First we need to load a PDF document in a _Windows.Data.Pdf.PdfDocument object_. There are two way to do this: From a _StorageFile_ or from a _Stream_.

**LoadFromFileAsync**

```csharp
public async void OpenLocal()
{
    StorageFile f = await 
        StorageFile.GetFileFromApplicationUriAsync(new Uri("ms-appx:///Assets/pdffile.pdf"));
    PdfDocument doc = await PdfDocument.LoadFromFileAsync(f);

    Load(doc);
}
```

**LoadFromStreamAsync**

```csharp
public async void OpenRemote()
{
    HttpClient client = new HttpClient();
    var stream = await client.GetStreamAsync(url);
    var memStream = new MemoryStream();
    await stream.CopyToAsync(memStream);
    memStream.Position = 0;
    PdfDocument doc = await PdfDocument.LoadFromStreamAsync(memStream.AsRandomAccessStream());

    Load(doc);
}
```

This _PdfDocument_ object has a method _GetPage(int pageIndex)_ which returns a _PdfPage_ object. This object represents a single page of our _PdfDocument_ and has this interesting method: _RenderToStreamAsync_. This method accepts a _IRandomAccessStream_ and optionally _PdfPageRenderOptions_. Once the page is rendered to the _Stream_, we can set it to a _BitmapImage_ by using the _BitmapImage_'s _SetSource(Asyc)_ method.

```csharp
var page = pdfDoc.GetPage(0);

using (InMemoryRandomAccessStream stream = new InMemoryRandomAccessStream())
{
    await page.RenderToStreamAsync(stream);
    await bitmapImage.SetSourceAsync(stream);
}
```

This _BitmapImage_ can now be easily bound to the _Source_ property of an _Image_ in XAML. Or, in this case, we can bind our collection of _PdfPages_ to an _ItemsControl_ and display an _Image_ for each item.

**Binding**

```xml
<ScrollViewer ZoomMode="Enabled" Background="DarkGray" Grid.Column="1">
    <ItemsControl ItemsSource="{Binding PdfPages, ElementName=root}">
        <ItemsControl.ItemTemplate>
            <DataTemplate>
                <Image Source="{Binding}" Margin="0 2" />
            </DataTemplate>
        </ItemsControl.ItemTemplate>
    </ItemsControl>
</ScrollViewer>
```

 Complete code-behind:

**Code-behind**

```csharp
public MainPage()
{
    this.InitializeComponent();           
}

public async void OpenLocal()
{
    StorageFile f = await 
        StorageFile.GetFileFromApplicationUriAsync(new Uri("ms-appx:///Assets/pdffile.pdf"));
    PdfDocument doc = await PdfDocument.LoadFromFileAsync(f);

    Load(doc);
}

public async void OpenRemote()
{
    HttpClient client = new HttpClient();
    var stream = await 
        client.GetStreamAsync("http://www.adobe.com/content/dam/Adobe/en/accessibility/products/acrobat/pdfs/acrobat-x-accessible-pdf-from-word.pdf");
    var memStream = new MemoryStream();
    await stream.CopyToAsync(memStream);
    memStream.Position = 0;
    PdfDocument doc = await PdfDocument.LoadFromStreamAsync(memStream.AsRandomAccessStream());

    Load(doc);
}

async void Load(PdfDocument pdfDoc)
{
    PdfPages.Clear();

    for (uint i = 0; i < pdfDoc.PageCount; i++)
    {
        BitmapImage image = new BitmapImage();

        var page = pdfDoc.GetPage(i);

        using (InMemoryRandomAccessStream stream = new InMemoryRandomAccessStream())
        {
            await page.RenderToStreamAsync(stream);
            await image.SetSourceAsync(stream);
        }

        PdfPages.Add(image);
    }
}

public ObservableCollection<BitmapImage> PdfPages
{
    get;
    set;
} = new ObservableCollection<BitmapImage>();
```

And that's all there is to it!

Sources: [https://1drv.ms/u/s!AtU3InGVXXeFi44ogMTAbHvtAXyDYw](https://1drv.ms/u/s!AtU3InGVXXeFi44ogMTAbHvtAXyDYw)

# UPDATE

I made a PdfViewerControl you can use in order to easily display PDF files in your UWP apps. It's available, together with the source code in GitHub.

See this blogpost: [UWP Simple PDF viewer](/2016/09/19/uwp-simple-pdf-viewer/ "UWP Simple PDF viewer")
