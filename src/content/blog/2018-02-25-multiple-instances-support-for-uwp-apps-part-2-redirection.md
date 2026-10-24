---
title: "Multiple instances support for UWP apps (Part 2): Redirection"
description: "In my previous blogpost, I showed you how we can opt-in for multi instance support in the Windows RS4 update. In last week's 'Windows Community Standup', Kevin and Andrew talked ab"
pubDate: "2018-02-25"
legacy: {"id":1100,"path":"/2018/02/25/multiple-instances-support-for-uwp-apps-part-2-redirection/","taxonomySlugs":{"categories":["c","rs4","uwp"],"tags":[]}}
categories: ["C#","rs4","uwp"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/SimplePdfViewer"]
---

In my [previous blogpost](/2018/02/06/multiple-instances-support-for-uwp-apps/ "Multiple instances support for UWP apps"), I showed you how we can opt-in for multi instance support in the Windows RS4 update.

In last week's ['Windows Community Standup'](https://channel9.msdn.com/Events/Ch9Live/Windows-Community-Standup/Kevin-Gallo-February-2018 "'Windows Community Standup' on Channel 9"), Kevin and Andrew talked about some new stuff that is coming to UWP in the upcoming RS4 update: multi instancing and UWP Console apps. They also elaborated more on **'Multi-Instance Redirection'**. This allows us to write our own logic in order to determine whether we should create a new instance of our UWP app or open an already existing instance. You see this behavior everywhere in Win32 applications like for example Excel: clicking an Excel file in the Windows Explorer will open the document in Excel, if we click another Excel file in the explorer, this will open in a new instance. If we click the first file again in the explorer, the instance of Excel that already has this file open will come to the foreground, no new instance will be created. And now, we can also do this in UWP and I'm going to show you how to do it.

# Opt-in for multi-instance support

First, I added multi-instance support to my app, just like I've stipulated in my [previous post](/2018/02/06/multiple-instances-support-for-uwp-apps/ "Multiple instances support for UWP apps"). Adding the following to you Appxmanifest file will give your app support for running in multiple instances.

**Reference to the RS4 namespace**

```xml
xmlns:desktop4="http://schemas.microsoft.com/appx/manifest/desktop/windows10/4"
```

**Opting-in for multi-istance support**

```xml
desktop4:SupportsMultipleInstances="true"
```

I also, added a **File Type Association** to my app so that I can launch my app from a file. If you want to learn more about File Type Associations, you can read the [docs](https://docs.microsoft.com/en-us/windows/uwp/launch-resume/handle-file-activation "Multiple instances support for UWP apps") or look at this [tutorial](http://grogansoft.com/blog/?p=1197 "Open your App with a File Association (Windows 10 UWP)").

# Add DISABLE\_XAML\_GENERATED\_MAIN Compilation Symbol

In the Properties window of our UWP app, we need to add **DISABLE\_XAML\_GENERATED\_MAIN** to the Conditional Compilation Symbols. This prevents the build system from generating the default Main method.

![Conditional compilation symbols](/wp-content/uploads/2018/02/CompileSymbol.jpg)

But how will our UWP start without a Main method? Simple, we are going to write our own because it's exactly there where we want to put our logic to determine whether we want to create a new instance of our app or not.

# Writing our own Main method

First, we need to add an new static class to our project, let's call it Program. In this class we can now add our Main method and start writing our own logic.

**Main method**

```csharp
public static class Program
{
    static void Main(string[] args)
    {

    }
}
```

Through the new `AppInstance` class we get an API that will help us for these kinds of scenarios. We can use it to get the Activation Event Args in order to know how our app was activated.

**GetActivatedEventArgs**

```csharp
IActivatedEventArgs activatedArgs = AppInstance.GetActivatedEventArgs();
```

In this particular scenario, we are going to check if our app was activated through a file via file type association. We can know this by looking if the ActivatedArgs are of type `FileActivatedEventArgs`.

**Check FileActivatedEventArgs**

```csharp
if(activatedArgs is FileActivatedEventArgs fileArgs)
{
    IStorageItem file = fileArgs.Files.FirstOrDefault();
    if(file != null)
    {
        ....
    }
}
```

Now, let's step back for a second... What do we want to achieve here? We want the user to open pdf files in our SimplePdfViewer app. When the user decides to open a pdf file with our app, we want to create a new instance of our app. Except when that particular file is already open in some instance, then we want to bring that particular instance to the foreground in Windows.

Through the `AppInstance` class, we can register and retrieve instances of our app using a key:

**Using FindOrRegisterInstanceForKey**

```csharp
var instance = AppInstance.FindOrRegisterInstanceForKey(key);
```

If the key that we pass in isn't already registered with an instance of our app, this method will create a new instance and will associate the passed-in key with it. If, on the other hand, the key is already associated with an instance, no new instance will be created.

In our example, we can use the file path of our pdf file as the key. So that means that for files that aren't open yet, a new instance will be created. If, however, we want to re-open a file where there is already an instance registered for its path, we won't create a new instance. Through the `IsCurrentInstance` property of the `AppInstance` object the we get back, we can check if it is a newly created instance or not. If its value is true, then we know it is a new instance, else the instance that we get back is the instance that was already associated with this particular key.

**Find Or Register Instance For Key**

```csharp
if(file != null)
{
    var key = file.Path;

    //Register for this key (path of the file) or get instance that was already registered with this key.
    var instance = AppInstance.FindOrRegisterInstanceForKey(key);
    if (instance.IsCurrentInstance)
    {
        // If we successfully registered this instance, we can now just
        // go ahead and do normal XAML initialization.
        global::Windows.UI.Xaml.Application.Start((p) => new App());
    }
    else
    {
        // Some other instance has registered for this key, so we'll 
        // redirect this activation to that instance instead.
        instance.RedirectActivationTo();
    }
}
```

As you can see in the code above, when it is a new instance for our key (`IsCurrentInstance == true`), we start a new instance of our app. If that is not the case, if there was already an instance associated with this key, we can call the `RedirectActivationTo` method on our instance in order to put that instance to the foreground in Windows.

And that is exactly what we were trying to achieve! 8-)

![](/wp-content/uploads/2018/02/MultiInstanceRedirection.webp)

The updated code can be found on the [MultiInstance Redirection branch](https://github.com/PieEatingNinjas/SimplePdfViewer/tree/MultiInstanceRedirection "MultiInstance Redirection branch") of this project.

# Visual Studio Templates

If you want to create a new multi-instance UWP app, you can download the [project template](https://marketplace.visualstudio.com/items?itemName=AndrewWhitechapelMSFT.MultiInstanceApps "project template") from the Visual Studio Marketplace.

_**Don’t forget: if you want to try this out yourself, make sure you are on a RS4 insiders build (it think this is version 17069 and up), together with the latest preview SDK. Also, I noticed that I needed to build in Release mode in order for the app to launch (don’t know why Debug doesn’t work, but I guess Microsoft will fix this)!**_
