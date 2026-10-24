---
title: "Fixing build issue in MAUI preview 8"
description: "Since a few week I've been playing around with preview builds of .NET MAUI. Installing MAUI Preview 8 A couple of days ago Microsoft released the latest preview version of MAUI: pr"
pubDate: "2021-09-19"
legacy: {"id":1805,"path":"/2021/09/19/fixing-build-issue-in-maui-preview-8/","taxonomySlugs":{"categories":["android","maui","visual-studio"],"tags":[]}}
categories: ["android","maui","visual-studio"]
tags: []
---

Since a few week I've been playing around with preview builds of .NET MAUI.

# Installing MAUI Preview 8

A couple of days ago [Microsoft released the latest preview version of MAUI](https://devblogs.microsoft.com/dotnet/update-on-dotnet-maui/): preview 8. Although I'm pretty sure I've followed every step of the [installation guide](https://docs.microsoft.com/en-us/dotnet/maui/get-started/installation), including uninstalling earlier versions of Visual Studio 2022 and .NET6, it didn't work immediately on my machine.

# The issue

## CS0246: The type or namespace name could not be found

After installing all the bits, I opened up Visual Studio 2022 and created a new MAUI app using the Template:

![](/wp-content/uploads/2021/09/maui-template.jpg)

When building the app, I got the following 2 error messages:  `The type or namespace name 'IStartup' could not be found` and  `The type or namespace name 'IAppHostBuilder' could not be found` .

After trying out some stuff, it turned out I was still using the previous .NET MAUI App Template. Apparently the old template wasn't uninstalled. Still not sure if I missed something or if it was something specific to my machine... Anyway, I managed to fix this issue by running the following cmd command:

```bash
dotnet new --install  Microsoft.Maui.Templates::6.0.100-rc.1.1608
```

As I saw the command's output, my suspicions were confirmed:

```text
Microsoft.Maui.Templates is already installed, version: 6.0.100-preview.7.1345, it will be replaced with version 6.0.100-rc.1.1608.
```

After re-opening Visual Studio 2022 I also noticed that the .NET MAUI App template got an updated icon (the long awaited MAUI icon) and a 'New' badge:

![](/wp-content/uploads/2021/09/maui-template-new.jpg)

After creating a new MAUI project with this updated template, I was able to successfully build it on my machine! 😎

## Running on simulator

I wasn't able to simulate this, but I noticed that the first time I wanted to run my newly created MAUI App on an Android simulator that not much happened. I'd see Visual Studio telling me the build was successful, but the app wasn't launched on the simulator. In order to fix this, you need to make sure that the 'Deploy' flag is checked in your Configuration Manager.

I haven't seen this missing flag since, but if somebody would run into it and doesn't immediately know what to do: you're welcome! :-)
