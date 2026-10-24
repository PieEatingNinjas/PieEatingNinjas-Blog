---
title: "Gotcha: opening default app for file in UWP"
description: "Doing UWP development, when you've been doing WPF/WinForms development for years, can cause some confusion sometimes. A colleague of mine got stuck when trying to launch the defaul"
pubDate: "2019-11-22"
legacy: {"id":1569,"path":"/2019/11/22/gotcha-opening-default-app-for-file-in-uwp/","taxonomySlugs":{"categories":["c","uwp"],"tags":[]}}
categories: ["C#","uwp"]
tags: []
---

Doing UWP development, when you've been doing WPF/WinForms development for years, can cause some confusion sometimes. A colleague of mine got stuck when trying to launch the default application for a particular file he generated in code:

```csharp
var file = await savePicker.PickSaveFileAsync(); 
System.Diagnostics.Process.Start(file.Path)
```

Now, although devs who have been doing .NET development might easily think the above code looks OK, it doesn't work, all it does is throwing an `AccessDenied` exception.

Note that UWP apps are running sandboxed, so you are not allowed to use `Proccess.Start`.

You should be using the `Windows.System.Launcher` api to do this in UWP instead:

```csharp
await Launcher.LaunchFileAsync(file);
```
