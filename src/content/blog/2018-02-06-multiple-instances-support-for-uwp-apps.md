---
title: "Multiple instances support for UWP apps"
description: "Redstone 4 Later this year Microsoft will be shipping the Windows 10 Redstone 4 (RS4) update. New features of this upcoming update are starting to surface in the latest Windows Ins"
pubDate: "2018-02-06"
legacy: {"id":1071,"path":"/2018/02/06/multiple-instances-support-for-uwp-apps/","taxonomySlugs":{"categories":["rs4","uwp"],"tags":[]}}
categories: ["rs4","uwp"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/SimplePdfViewer"]
---

# Redstone 4

Later this year Microsoft will be shipping the Windows 10 Redstone 4 (RS4) update. New features of this upcoming update are starting to surface in the latest Windows Insider builds. I've been playing around with these builds and it seems that the ability of having multiple instances of a UWP app is on its way. Yes, it looks like RS 4 is yet another update packed with cool new features for UWP!

From the get-go, UWP apps were designed to only have one single instance running at a time. Now, finally, it seems Microsoft is giving us -developers- the opportunity to opt-in for having multi-instance support. We can decide whether we want our app to only have one or multiple instances.

# Let's opt-in for multiple instances

To opt-in for multiple instance support, we first just need to add the following namespace to our appxmanifest.

**Reference to the RS4 namespace**

```xml
xmlns:desktop4="http://schemas.microsoft.com/appx/manifest/desktop/windows10/4"
```

Once we have done that, we can add the this `desktop4:SupportsMultipleInstances="true"` to the Application element in our appxmanifest. Like this:

```xml
<Applications>
    <Application Id="App"
      Executable="$targetnametoken$.exe"
      EntryPoint="MyMultiInsanceApp.App"
      desktop4:SupportsMultipleInstances="true">
      <uap:VisualElements
        DisplayName="MyMultiInsanceApp"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png"
        Description="MyMultiInsanceApp" BackgroundColor="transparent">
        <uap:DefaultTile Wide310x150Logo="Assets\Wide310x150Logo.png"/>
        <uap:SplashScreen Image="Assets\SplashScreen.png" />
      </uap:VisualElements>
    </Application>
</Applications>
```

And that's it! That's all we need to do in order to support multiple instances of our app!

**Don't forget: if you want to try this out yourself, make sure you are on a RS4 insiders build (it think this is version 17069 and up), together with the latest preview SDK. Also, I noticed that I needed to build in Release mode in order for the app to launch (don't know why Debug doesn't work, but I guess Microsoft will fix this)!**

# Sample

I've got this 'old' sample on GitHub, [SimplePdfViewer](https://github.com/PieEatingNinjas/SimplePdfViewer "SimplePdfViewer"), which is a very simple Pdf viewer (who would have guessed?!? :roll: )... This kind of app should support running multiple instances, right? Especially if the app should have File Type Associations (which it currently hasn't). So I added the above stuff to the **manifest** of the app, updated the **Target Version** to 17083, built on **Release** and BOOM: the app can now be opened multiple times! 8-)

![Multi instace uwp app](/wp-content/uploads/2018/02/MultiInstance.webp "Multi instace uwp app")

The updated code can be found on the [MultiInstance branch](https://github.com/PieEatingNinjas/SimplePdfViewer/tree/MultiInstance "MultiInstance branch") of this project.
