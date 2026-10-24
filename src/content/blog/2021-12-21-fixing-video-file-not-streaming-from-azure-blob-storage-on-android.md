---
title: "Fixing video file not streaming from Azure Blob Storage on Android"
description: "Oh ooh! Video file not streaming on Android... While developing a Xamarin.Forms app, we encountered an issue where an mp4 file wouldn't play on Android, on iOS everything worked pe"
pubDate: "2021-12-21"
legacy: {"id":1818,"path":"/2021/12/21/fixing-video-file-not-streaming-from-azure-blob-storage-on-android/","taxonomySlugs":{"categories":["android","azure","c","xamarin"],"tags":[]}}
categories: ["C#","android","azure","xamarin"]
tags: []
---

# Oh ooh! Video file not streaming on Android...

While developing a Xamarin.Forms app, we encountered an issue where an mp4 file wouldn't play on Android, on iOS everything worked perfectly!

To display the video we are using the MediaElement from the [Xamarin Forms Community Toolkit](https://github.com/xamarin/XamarinCommunityToolkit)  and our video file is hosted in Azure Blob Storage.

The crazy thing is that I encountered this issue before on an other project, but I couldn't remember what I had to do to fix it. Hence I'm writing it down and hope I can help anybody else with it as well. :-)

After searching around, I found -again- that I have to set the DefaultServiceVersion of the Blob service to 2011-08-18 in order to make the video streaming work on Android. As far as I can see, there is no way to set this in the portal, but it can be done via code:

```csharp
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Shared.Protocol;

var account = CloudStorageAccount.Parse("MY_BLOB_STROAGE_CONNECTION_STRING");
var blobs = account.CreateCloudBlobClient();
await blobs.SetServicePropertiesAsync(new ServiceProperties()
{
    DefaultServiceVersion = "2011-08-18"
});
```

**Note:** I'm using the deprecated WindowsAzure.Storage NuGet package here, which is superseded by the Azure.Storage.Blobs package. But unfortunately, I'm not getting the latter to work... Might look into it, but for now, this still works ;-)

Now take a look at your Xamarin app on Android and you'll see that your video is playing now! #magic
