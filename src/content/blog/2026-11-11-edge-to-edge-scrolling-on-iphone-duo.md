---
title: "Edge-to-Edge CollectionView Scrolling on iPhone Duo"
description: "How I got a .NET MAUI CollectionView to scroll behind the iPhone Duo's disappearing title bar without hiding its first item."
pubDate: "2026-11-11"
categories: ["C#", "maui", "ios", "iPhone Duo"]
tags: []
heroImage: "/assets/2026-11-11-edge-to-edge.gif"
codeRepositories: ["https://github.com/PieEatingNinjas/DuoExtensions.Maui"]
---

While testing a .NET MAUI app on the iPhone Duo simulator, one change immediately stood out: the title scrolled out of the way.

In my app, the regular-sized title stayed put on a regular iPhone. On Duo, it scrolled out of the way without any special scroll configuration, and the list moved up with it. Almost all of the space was reclaimed, but a small gap of a few pixels remained at the top.

That last gap was the problem. The list already followed the title bar; I wanted it to finish the journey and reach the screen edge, without sacrificing the safe position of the first item when the page opened.

True edge-to-edge scrolling. Easier said than done.

## One setting, two almost-correct results

The obvious place to start was `SafeAreaEdges`. Changing the top edge of the page gave me two different problems.

### `None`: the title covers the first item

With the top safe-area edge set to `None`, the `CollectionView` could extend behind the title bar. Once I started scrolling, the result was close to what I wanted.

But when the page opened, the first item started behind the title. The list reached the edge, but its initial position was wrong.

### `Container`: a small gap remains

Setting the top edge to `Container` protected the first item. The page looked right when it opened.

Then I scrolled. The list moved up as the title bar disappeared, but stopped a few pixels short of the screen edge. Good enough? Maybe, but not great for my OCD.

<div class="screenshot-comparison">
  <figure>
    <img src="/assets/2026-11-11-edge-none.png" alt="The first CollectionView item scrolls behind the iPhone Duo title bar when the page safe area is set to None." />
    <figcaption>None: the list reaches the edge, but the title can cover the first item.</figcaption>
  </figure>
  <figure>
    <img src="/assets/2026-11-11-edge-container.png" alt="The CollectionView keeps its first item below the title bar but leaves a small gap above the list while scrolling." />
    <figcaption>Container: the first item is safe, but a small gap remains while scrolling.</figcaption>
  </figure>
</div>

## The viewport should reach the edge. The first item should not.

Those requirements sound contradictory until we separate two things:

- The **viewport** is the visible area through which the list scrolls. It should extend behind the system bars.
- The **content insets** give the scrollable content a safe starting and ending position inside that viewport.

Insets are part of the scroll mechanism, it's not a permanent margin outside the list. The first item can start below the title while later items scroll behind it. When the title moves away, the viewport is already there to fill the space.

UIKit can do this with automatic inset adjustment. There is no need to guess the title bar's height or update a margin on every scroll event. The native scroll view needs the correct safe-area information.

## Where the information was missing

MAUI sets the native `CollectionView`'s `ContentInsetAdjustmentBehavior` to `Never`. I thought switching it to `Automatic` would be an easy fix, but that alone wasn't enough.

In my test, the page knew how much space to leave for the system bars, but the native collection view wasn't getting the information it needed to do the same. As a result, turning on automatic insets still left the first item behind the title.

MAUI's [iOS collection view handler](https://github.com/dotnet/maui/blob/10.0.110/src/Controls/src/Core/Handlers/Items2/ItemsViewHandler2.iOS.cs) creates a native controller and uses its view for the `CollectionView`. The handler doesn't itself attach that controller as a child of the page's controller. Without a parent controller to forward the appearance notification, UIKit wasn't getting the signal it needed. Once I sent that notification explicitly, UIKit could calculate the inset needed to keep the first item clear of the title.

There was one more piece: allowing the page layout to extend behind opaque bars as well. Together, these changes let UIKit position the content while the list itself reaches the edge, without hard-coded bar heights or scroll-dependent margins.

## The fix, without hand-wiring the controller

The prototype helped me understand the problem. The reusable fix is now available in [DuoExtensions.Maui](https://github.com/PieEatingNinjas/DuoExtensions.Maui). Its `UseEdgeToEdgeCollectionView()` opt-in registers a custom iOS `CollectionView` handler. There is a little native boilerplate in the handler to put the pieces in place:

- When the handler connects, it switches the native collection view to automatic content inset adjustment.
- When the view loads, it configures the collection controller and the owning controller to allow layout behind opaque bars, including the top edge.
- If the collection controller has no parent controller, it sends a paired appearance transition so UIKit can establish its safe-area information. If it already has a parent, the handler leaves appearance forwarding to that hierarchy.
- When the view unloads or the handler disconnects, it balances any appearance transition it started and restores the owning controller's previous layout settings.

The handler does the UIKit plumbing; UIKit still calculates the adjusted content insets. For the full details, see the [handler implementation](https://github.com/PieEatingNinjas/DuoExtensions.Maui/blob/main/DuoExtensions.Maui/Platforms/iOS/EdgeToEdgeCollectionViewHandler.cs).

First, add the package:

```bash
dotnet add package DuoExtensions.Maui
```

Then opt in to the handler in `MauiProgram.cs`:

```csharp
using DuoExtensions.Maui;

builder
    .UseMauiApp<App>()
    .UseEdgeToEdgeCollectionView();
```

This is a separate opt-in; `UseDuoExtensions()` does not enable it automatically. The handler applies to all iOS `CollectionView` controls in the app. If your app already registers a custom `CollectionView` handler, combine the implementations rather than registering a second one.

Keep the `CollectionView` as the page's direct content, and let the page extend vertically behind the bars:

```xml
<ContentPage
    ...
    SafeAreaEdges="Container, None"
    BackgroundColor="White"
    Shell.BackgroundColor="Transparent">
    <CollectionView BackgroundColor="Transparent" ...>
        ...
    </CollectionView>
</ContentPage>
```

`SafeAreaEdges="Container, None"` keeps the horizontal container safe area and removes the page's vertical safe area. UIKit's automatic insets then keep the scrollable content safely positioned inside the extended viewport.

The package's edge-to-edge implementation is for iOS `CollectionView`s. A page with a standard `ScrollView` works as expected when setting the SafeAreaEdges appropriately, without needing the custom handler.

## Try it out

The edge-to-edge handler is part of [DuoExtensions.Maui on NuGet](https://www.nuget.org/packages/DuoExtensions.Maui). It requires .NET 10 and the iOS 27.1 SDK; the app's iOS target must be `net10.0-ios27.1` for the package's native implementation to be selected. The iOS deployment minimum can remain iOS 15.0. On other platforms, this extension has no effect.

The [README](https://github.com/PieEatingNinjas/DuoExtensions.Maui/blob/main/README.md#edge-to-edge-collectionview-scrolling) has the setup details, and the [demo app](https://github.com/PieEatingNinjas/DuoExtensions.Maui/tree/main/DuoExtensions-Demo) includes an Edge-to-Edge example. The library is an experiment, so if you run into an unexpected layout or lifecycle issue, [open an issue](https://github.com/PieEatingNinjas/DuoExtensions.Maui/issues) with your MAUI, iOS and Xcode versions and steps to reproduce it.
