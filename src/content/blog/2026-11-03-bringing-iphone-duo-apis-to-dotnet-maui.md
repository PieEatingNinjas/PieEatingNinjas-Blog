---
title: "Bringing iPhone Duo APIs to .NET MAUI"
description: "DuoExtensions.Maui brings adaptive Shell toolbar preferences and window-aware hinge monitoring to .NET MAUI apps running on iPhone Duo."
pubDate: "2026-11-03"
categories: ["C#", "maui", "ios", "iPhone Duo"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/DuoExtensions.Maui"]
---

In my [previous post about getting a .NET MAUI app running on the iPhone Duo](/2026/10/28/net-maui-iphone-duo/), I explored how iOS adapts its tab bar and toolbar to the Duo's different poses. UIKit does a lot of that work for us, but what if an app needs to influence the layout—or react to the device's hinge?

That's why I built **DuoExtensions.Maui**: a small experimental library that makes selected iOS APIs easier to use from .NET MAUI.

<!-- GIF: Show the demo app on the iPhone Duo simulator, folded and unfolded, with the Shell bars adapting to each pose. -->

## What does the library provide?

The first preview focuses on two things:

- **Adaptive Shell toolbars:** set preferences for individual toolbar actions, vertical bars, and how crowded vertical bars compress their contents.
- **Hinge monitoring:** observe the hinge status and angle for a particular MAUI window.

These are preferences and readings from UIKit, not a custom toolbar renderer or a promise that a specific control will always appear in a particular place. iOS makes the final layout decision.

## Install and enable it

The package is available on NuGet as [`DuoExtensions.Maui`](https://www.nuget.org/packages/DuoExtensions.Maui/0.1.0-preview.1). Add it to your app:

```bash
dotnet add package DuoExtensions.Maui --version 0.1.0-preview.1
```

Then enable the integrations in `MauiProgram.cs`:

```csharp
using DuoExtensions.Maui;

builder
    .UseMauiApp<App>()
    .UseDuoExtensions();
```

`UseDuoExtensions()` registers the iOS Shell integration and the hinge service. If you only need one feature, you can instead call `UseDuoShellToolbars()` or `UseHingeMonitoring()`.

## Set preferences for toolbar actions

An individual Shell toolbar item can support both horizontal and vertical bars, with a preference for the vertical one:

```xml
<ContentPage.ToolbarItems>
    <ToolbarItem Text="Share"
                 IconImageSource="share.png"
                 duo:ToolbarItemAxisBehavior.AxisBehavior="VerticalPreferred" />
</ContentPage.ToolbarItems>
```

The available values are `Automatic`, `HorizontalOnly`, and `VerticalPreferred`. You can also change the preference in code:

```csharp
ToolbarItemAxisBehavior.SetAxisBehavior(
    ShareAction, ToolbarAxisBehavior.VerticalPreferred);
```

Explicitly set an initial value—even `Automatic`—on actions you plan to update later. That lets the library track the item when Shell creates its native toolbar. `HorizontalOnly` only selects an axis; it doesn't choose whether the action appears at the top or bottom.

<!-- GIF: On the simulator, change the Share action's axis preference and show how UIKit places it in horizontal and vertical bars. Treat placement as illustrative, not guaranteed. -->

## Configure the vertical bars

You can ask UIKit to choose whether vertical bars are appropriate, or opt the whole Shell out of them:

```xml
<Shell ...
       xmlns:duo="clr-namespace:DuoExtensions.Maui;assembly=DuoExtensions.Maui"
       duo:ToolbarLayout.VerticalBehavior="Automatic">
```

`Automatic` lets UIKit decide; it does not force a vertical layout. `Disabled` is a Shell-wide preference, so it remains in effect as you switch tabs.

When a vertical bar gets crowded, you can also tell UIKit which group should get priority:

```xml
<ContentPage ...
             duo:ToolbarLayout.CompressionBehavior="PrefersToolbarItems">
```

Choose `PrefersToolbarItems` or `PrefersTabBar`, or leave it at `Automatic`. This setting belongs to the page's navigation item, and its effect is easiest to see when the vertical layout has limited space.

<!-- GIF: Show the demo's vertical-bar toggle, then compare the compression options on the page with several toolbar actions and tabs. -->

The library also exposes `ToolbarLayout.VerticalEdge`, a read-only value (`Leading`, `Trailing`, or `Unspecified`) that you can bind to or read in code. It reports the edge UIKit supplies; it doesn't move the bar. The values are logical edges, so account for right-to-left layouts if you need a physical direction.

## Read hinge state for a window

Hinge monitoring doesn't depend on Shell. Inject `IHingeService` into a page and ask for an observer for that page's window:

```csharp
var observer = hingeService.ForWindow(Window
    ?? throw new InvalidOperationException("The page must belong to a window."));

observer.StateChanged += OnStateChanged;
ShowReading(observer.CurrentState);
```

`HingeState` contains a status—`Unknown`, `Closed`, `PartiallyOpen`, or `FullyOpen`—and an angle in degrees. `CurrentState` can be `null` when no reading is available; that is not the same as a closed hinge or a zero-degree angle. Subscribe while the page is visible, show the current value after subscribing, and unsubscribe when the page disappears.

<!-- GIF: On the iPhone Duo simulator, move the device through closed, partially open, and fully open poses while the demo's hinge status and angle update. -->

The service returns the same observer for the same window and manages its lifetime. Call `ForWindow` on that window's UI thread; event handlers run there too. The API is window-aware because UIKit attaches hinge interaction to a view hierarchy—not to a global device sensor—and separate windows can have different reading availability.

## A few things to know before trying it

This is an experimental preview, so APIs and implementation may change. The library targets .NET 10 and the iOS 27.1 SDK APIs, with an iOS deployment minimum of 15.0. Toolbar preferences have no effect before iOS 27.1; hinge monitoring reports unsupported on systems without API support. `IsSupported` indicates OS support, not whether the current device has hinge hardware or a reading is available.

The shared target keeps the public API available to cross-platform apps, but this preview has no native implementation for Android, Mac Catalyst, or Windows. And if your app already registers a custom iOS Shell renderer, the toolbar integration needs to be combined with it—renderer registrations don't compose automatically.

The [repository](https://github.com/PieEatingNinjas/DuoExtensions.Maui) includes a demo app for trying the toolbar and hinge features. I'd love feedback, especially if you find unexpected behavior on a simulator or device, or a simpler way to expose these APIs.
