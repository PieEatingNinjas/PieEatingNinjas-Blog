---
title: "Accessing UWP APIs from a Win32 application"
description: "The term UWP is used for a lot of things: UI (WinUI), the Windows AppModel, Windows Runtime API, Store Apps,... As I'm planning to keep this a short blogpost, I'm not going to disc"
pubDate: "2020-11-30"
legacy: {"id":1680,"path":"/2020/11/30/accessing-uwp-apis-from-a-win32-application/","taxonomySlugs":{"categories":["c","uwp","visual-studio"],"tags":[]}}
categories: ["C#","uwp","visual-studio"]
tags: []
---

The term UWP is used for a lot of things: UI (WinUI), the Windows AppModel, Windows Runtime API, Store Apps,...  As I'm planning to keep this a short blogpost, I'm not going to discuss this here :D For sake of this blogpost UWP APIs== the [Window Runtime API](https://docs.microsoft.com/en-us/uwp/api/?view=winrt-19041).

# Just 1 NuGet package

In a [previous blogpost](/2020/02/15/reading-belgian-eid-in-uwp-using-smartcardreader/ "Reading Belgian eID in UWP using SmartCardReader"), I talked about how I used the `Windows.Devices.SmartCards.SmartCardReader`class to access an eID and read the content from it. This demo was written in a UWP app (you know, the 'full'/'classic'/store/modern UI/... UWP kinda app).

What few people know, is that these Windows Runtime APIs aren't exclusive for these kinds of app. It's possible to access these APIs from WinForms, WPF, even from the Console.

The only thing you have to do to make this work is adding a reference to the Microsoft.Windows.SDK.Contract [NuGet Package](https://www.nuget.org/packages/Microsoft.Windows.SDK.Contracts/10.0.17134.1000?_src=template). Once that package is added, we can use the Windows Runtime APIs!

# Show me the money!

I created a new .NET Core Console application and added areference to the Microsoft.Windows.SDK.Contract NuGet package.

Afterwards I simply added some code that uses specific Windows Runtime APIs:

```csharp
public static async Task Main(string[] args)
{
    Console.WriteLine("Hello World!");

    string selector = SmartCardReader.GetDeviceSelector();

    DeviceInformationCollection smartCardReaders =
        await DeviceInformation.FindAllAsync(selector);

    foreach (var item in smartCardReaders)
    {
        Console.WriteLine($"Connected device: {item.Name}");
    }
    Console.ReadKey();
}
```

When I plug in a SmartCardReader into my PC and run the console app, I see everything running as expected, the console app is succesfully accessing the Windows Runtime APIs:

![](/wp-content/uploads/2020/11/connectedDevice.jpg)
