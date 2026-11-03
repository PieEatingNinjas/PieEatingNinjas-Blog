---
title: "Bringing iPhone Duo APIs to .NET MAUI"
description: "Adaptive toolbars in Shell and window-aware hinge support with DuoExtensions.Maui."
pubDate: "2026-11-03"
categories: ["C#", "maui", "ios", "iPhone Duo"]
tags: []
heroImage: "/assets/2026-11-03-Header.webp"
codeRepositories: ["https://github.com/PieEatingNinjas/DuoExtensions.Maui"]
---

The iPhone Duo introduces new ways for apps to adapt their toolbars and layouts. With the matching .NET for iOS SDK, the native APIs are available from C# in a .NET MAUI app. But available doesn't necessarily mean easy to use from **Shell or XAML**: MAUI doesn't yet expose all of these settings, and Shell manages some of the native controls for us.

To bridge that gap, I put together a small **DuoExtensions.Maui** library. It wraps the native integration in attached properties, helpers, and a hinge service, so we can use these features from our MAUI pages without repeating the platform plumbing.

_This is a playground project, not a polished library. I have no idea how long this approach will stay relevant: the .NET MAUI team might add similar support, probably with a much cleaner implementation than mine. Or, if there's interest and the approach proves useful, perhaps some of it could find a home in the .NET MAUI Community Toolkit. For now, let's experiment and see where it goes. Tell me what you think!_

In this post, we'll look at:

- **Toolbar item axis behavior**: which bar axes an individual action supports.
- **Vertical toolbar behavior**: letting iOS choose the bar layout or opting out of vertical bars.
- **Vertical toolbar compression**: prioritizing toolbar actions or tabs when space is limited.
- **The vertical toolbar edge**: reading the system's preferred edge for a vertical bar.
- **The hinge API**: observing hinge status and angle through a window-specific service.


## Try the demo

The separate [DuoExtensions-Demo app](https://github.com/PieEatingNinjas/DuoExtensions.Maui/tree/main/DuoExtensions-Demo) is a clean, iOS-only Shell sample with five tabs: **Axis**, **Compression**, **Vertical**, **Edge**, and **Hinge**. It references the library directly, compiles against the iOS 27.1 SDK, and supports deployment to iOS 15.0 and later.


## Enabling DuoExtensions.Maui

The library is available as the [`DuoExtensions.Maui` NuGet package](https://www.nuget.org/packages/DuoExtensions.Maui/0.1.0-preview.1). Add the package to your app:

```bash
dotnet add package DuoExtensions.Maui --version 0.1.0-preview.1
```

Enable the integration once in `MauiProgram.cs`:

```csharp
using DuoExtensions.Maui;

builder
    .UseMauiApp<App>()
    .UseDuoExtensions();
```

For the XAML examples, declare the library namespace on the page:

```xml
xmlns:duo="clr-namespace:DuoExtensions.Maui;assembly=DuoExtensions.Maui"
```

`UseDuoExtensions()` registers the custom Shell renderer on iOS and adds `IHingeService` to dependency injection. On other targets it leaves the handlers unchanged and provides a hinge service that reports the API as unsupported. It replaces Shell's renderer registration, so apps with an existing custom Shell renderer need to combine the implementations.

The library includes a shared target so its public APIs remain available in cross-platform code, while UIKit integration is compiled only for iOS. Its iOS target explicitly uses the 27.1 SDK for these new APIs; runtime checks still allow the app to run on older iOS versions.

The two features can also be enabled independently: `builder.UseHingeMonitoring()` adds only the hinge service, without requiring Shell or replacing its renderer; `builder.UseDuoShellToolbars()` enables only Shell toolbars. `UseDuoExtensions()` is the shortcut for both.

## Toolbar item axis behavior

On iPhone Duo, iOS can move toolbar actions into a vertical bar along the side of the display. **Axis behavior** tells the system which bar axes an item supports:

- **Automatic** lets iOS choose the appropriate placement.
- **HorizontalOnly** restricts the item to horizontal bars. If no horizontal bar is available, the item isn't shown.
- **VerticalPreferred** supports both axes, but prefers the vertical bar when horizontal and vertical bars are both available.

This is a preference for an individual action, not a way to force a vertical bar into existence. iOS still decides which bars are available for the current layout.

### Using it in .NET MAUI

MAUI's `ToolbarItem` doesn't currently expose this setting or an iOS-specific extension for it. The library adds the attached property `ToolbarItemAxisBehavior.AxisBehavior`, backed by the `ToolbarAxisBehavior` enum:

```xml
<ContentPage.ToolbarItems>
    <ToolbarItem x:Name="AxisDemoToolbarItem"
                 Text="Share"
                 IconImageSource="items.png"
                 duo:ToolbarItemAxisBehavior.AxisBehavior="Automatic"
                 Clicked="OnToolbarActionClicked" />
</ContentPage.ToolbarItems>
```

We can then change the preference from MAUI code:

```csharp
ToolbarItemAxisBehavior.SetAxisBehavior(
    AxisDemoToolbarItem,
    ToolbarAxisBehavior.VerticalPreferred);
```

Two caveats matter:

- **The mapping needs an `AutomationId`.** This implementation matches it to the native button's accessibility identifier. You can provide one yourself; otherwise, the tracker generates one for configured items.
- **Explicitly set an initial value**, even if it's `Automatic`. The tracker only subscribes to items with the attached property explicitly set when it processes the toolbar; other buttons are ignored. Leaving it unset and assigning it later in code won't trigger a native update on its own. That's why the XAML above explicitly sets `Automatic`, despite it being the property's default.

The platform integration only applies on iOS 27.1 and later.

I also reproduced this behavior in a native SwiftUI app, so it isn't specific to the MAUI integration. Is it a bug or a feature? I honestly don't know. The practical takeaway is simple: don't change the axis behavior on the fly.


<figure class="article-screenshot">
  <img src="/assets/2026-11-03-axes.gif" alt="The demo app showing the difference in Automatic, HorizontalOnly, and VerticalPreferred" />
</figure>

### Under the hood

I bit off more than I could chew with this one; I didn't expect it to be such a pain. MAUI's `ToolbarItem`s aren't `UIElement`s, and Shell renders them through a separate path, so there's no straightforward way to get the native `UIBarButtonItem` from a `ToolbarItem`. I ended up adding some boilerplate in a custom Shell renderer: `ToolbarLayoutShellRenderer` supplies a page renderer tracker that matches configured items to Shell's existing `UIBarButtonItem`s through their automation identifiers. It then applies the native setting:

```csharp
item.AxisBehavior = UIBarButtonItemAxisBehavior.VerticalPreferred;
```

The order matters: before calling MAUI's `UpdateToolbarItems()`, the tracker ensures configured items have an `AutomationId`. MAUI copies that ID to the native button's `AccessibilityIdentifier`. After MAUI creates the buttons, the tracker searches the native controller hierarchy and matches those identifiers. This updates the buttons Shell actually displays rather than creating replacements.

The tracker observes `PropertyChanged` only on explicitly configured items. It caches weak references to the matching native buttons for later updates and rebuilds those matches when Shell rebuilds the toolbar. When the tracked page changes, it detaches the old items' event handlers.

This mapping feels a little hacky; if there's a simpler approach—or MAUI introduces a better integration point—I'd love to hear about it! The [renderer and tracker implementation](https://github.com/PieEatingNinjas/DuoExtensions.Maui/blob/main/DuoExtensions.Maui/Platforms/iOS/ToolbarLayoutShellRenderer.cs) contains the details.

## Vertical toolbar behavior

Axis behavior is an individual item's preference. `ToolbarVerticalBehavior`, used with SwiftUI's `toolbarVerticalBehavior(_:)`, answers a different question: **should this presentation use a vertical bar at all?**

- **Automatic** lets the system decide.
- **Disabled** opts out: controls fall back to the usual horizontal top and bottom bars.

Disabling the vertical bar wins over an item's `VerticalPreferred` preference (hence '_Preferred_'). Apple recommends making this a stable design choice, not constantly switching layouts as the user navigates.

### Using it in .NET MAUI

MAUI doesn't expose this setting directly. Our `ToolbarLayout` helper lets us set it for the whole Shell:

```csharp
ToolbarLayout.SetVerticalBehavior(
    Shell.Current,
    ToolbarVerticalBehavior.Disabled);
```

`Automatic` hands the choice back to iOS; it doesn't force vertical bars on an ordinary iPhone. The **Vertical** tab contains a picker to compare the two layouts. It's a demo control, not a recommendation to expose a constantly changing layout preference in a real app.

### Under the hood

Behind the scenes, this works a little differently from axis behavior. UIKit doesn't provide a property we can assign to; instead, it asks a native view controller for its preference. MAUI's iOS `ShellRenderer` **is itself a native view controller**, so our custom renderer can answer that question by overriding `PreferredVerticalBarBehavior`:

```csharp
public override UIVerticalBarBehavior PreferredVerticalBarBehavior =>
    ToolbarLayout.GetVerticalBehavior(Shell) == ToolbarVerticalBehavior.Disabled
        ? UIVerticalBarBehavior.Disabled
        : UIVerticalBarBehavior.Automatic;
```

There is one Shell-specific wrinkle: MAUI wraps the renderer in an outer `ShellFlyoutRenderer`, even in this tab-based sample. UIKit's preference lookup must reach our inner renderer. We override `CreateFlyoutRenderer()` to supply a small `ToolbarLayoutFlyoutRenderer` subclass that delegates that lookup to it.

The relevant UIKit property is `ChildViewControllerForPreferredVerticalBarBehavior`: returning a controller delegates the decision to that child; returning `null` uses the current controller's own preference. Our outer controller returns the Shell renderer, while the Shell renderer returns `null`. In short: **forward to our renderer, then use its preference**, rather than a page's.

When the attached value changes on iOS 27.1+, the helper tells UIKit to re-evaluate the preference using `SetNeedsUpdateOfVerticalBarConfiguration()`. The attached property stores the choice; that invalidation asks UIKit to query the override again. It doesn't directly rearrange the controls: UIKit still handles the layout and transition.

<figure class="article-screenshot">
  <img src="/assets/2026-11-03-novbar.gif" alt="The demo app showing what it looks like to Disable to Vertical tab bar" />
</figure>

## Vertical toolbar compression

Toolbar actions and tab navigation can share the same vertical region. What happens when there isn't enough room for both?

`ToolbarVerticalCompressionBehavior`, used with SwiftUI's `toolbarVerticalCompressionBehavior(_:)`, expresses which controls should retain space:

- **Automatic** uses the system's default policy.
- **PrefersToolbarItems** keeps toolbar actions visible for longer; the tab bar compresses first.
- **PrefersTabBar** keeps tab navigation visible for longer; toolbar actions compress first.

This is a priority, not a guarantee that every action remains visible. For example, tabs may collapse to the selected tab, or toolbar actions may move into an overflow menu. It only matters when those bars share a vertical region and space is constrained—not simply when you scroll a page.

### Using it in .NET MAUI

MAUI doesn't expose this setting, so I added a page-level attached property to `ToolbarLayout`:

```xml
<ContentPage
    ...
    duo:ToolbarLayout.CompressionBehavior="PrefersToolbarItems">
```

Or, from code:

```csharp
ToolbarLayout.SetCompressionBehavior(
    this,
    ToolbarVerticalCompressionBehavior.PrefersTabBar);
```

The **Compression** tab demonstrates this with eight toolbar actions and a compression picker. Try it in a vertical Duo layout with vertical bars enabled. iOS determines the actual overflow presentation; in a horizontal or spacious layout, changing the preference may have no visible effect.

### Under the hood

This follows the same pattern as axis behavior: store a MAUI preference, apply it to UIKit, and observe changes. It's simpler here because the tracker already has the page's native controller:

```csharp
controller.NavigationItem.VerticalBarCompressionBehavior =
    UIVerticalBarCompressionBehavior.PrefersBarItems;
```

`NavigationItem` holds a screen's navigation. UIKit calls this option `PrefersBarItems`, whereas our MAUI enum uses `PrefersToolbarItems`.

The page renderer tracker applies the preference when the page or its native renderer becomes available, and reapplies it after toolbar updates. This covers either initialization order: the MAUI value may exist before the native controller does.

MAUI's base tracker already observes the page. We override `OnPagePropertyChanged` and check for `CompressionBehaviorProperty.PropertyName` to forward runtime changes to UIKit. Unlike axis behavior, we don't need a separate subscription for each button, so setting a first value later also works.

### Keeping action titles in the overflow menu

One extra detail surfaced in the Compression demo: the overflow menu showed icons, but no action titles, even though each MAUI `ToolbarItem.Text` was set.

In MAUI 10.0.110's iOS implementation, primary toolbar items with an `IconImageSource` take the icon-rendering path, which doesn't copy `Text` to the native `UIBarButtonItem.Title`. The normal bar still shows the icon, but UIKit's overflow presentation needs that native title to label the action. Setting the MAUI text alone therefore isn't enough.

After matching Shell's native buttons, the library now explicitly copies the text:

```csharp
nativeItem.Title = toolbarItem.Text;
```

The tracker also observes `ToolbarItem.Text` changes and updates the native title, and reapplies it whenever Shell rebuilds the toolbar. This applies to actions explicitly opted into axis tracking with `ToolbarItemAxisBehavior.AxisBehavior`, including `Automatic`; it doesn't require replacing the native buttons or building a custom overflow menu. The icons and click handling remain managed by MAUI, and UIKit still decides which actions overflow and how they are presented.

<figure class="article-screenshot">
  <img src="/assets/2026-11-03-compression.gif" alt="The demo app showing the difference in Automatic, PrefersToolbarItems and PrefersTabBar Compression Behavior" />
</figure>

## The vertical toolbar edge

SwiftUI's `toolbarVerticalEdge` tells us the system's preferred edge: **leading**, **trailing**, or no applicable edge. It's **read-only**, and it isn't a “vertical toolbar is visible” flag. A preference can still be available when no vertical bar is visible.

This is useful for positioning your own content relative to system controls. Don't infer the edge from screen width or orientation alone; the system also takes its current context and locale into account.

### Using it in .NET MAUI

The library exposes the edge through a read-only attached property:

```csharp
var edge = ToolbarLayout.GetVerticalEdge(this);
```

For the **Edge** tab, a small page property makes it easy to bind to:

```csharp
public ToolbarVerticalEdge VerticalEdge => ToolbarLayout.GetVerticalEdge(this);
```

The attached property's change notification uses the same name, so this binding updates when the native trait changes (`PageRoot` is the page's `x:Name`):

```xml
<Label x:DataType="local:SettingsPage"
       Text="{Binding Source={x:Reference PageRoot}, Path=VerticalEdge}" />
```

The result is `Leading`, `Trailing`, or `Unspecified`. That last value represents contexts where the system doesn't place a vertical bar; it isn't a reason to assume "leading." There's deliberately no public setter: this reflects a system preference, not a request to move the system bar.

### Under the hood

UIKit exposes the edge as a trait on the native page view:

```csharp
var edge = nativeView.TraitCollection.VerticalBarEdge;
```

Our Shell page tracker reads that trait from the **page controller's native view**, rather than calculating an edge from the display size. It publishes the initial value and registers that view for `UITraitCollection.SystemTraitsAffectingVerticalBarEdge` to follow later changes. Observing each page matters: Shell caches tabs, and a cached page's edge can change while another tab is selected. Observing only Shell's root layout can leave a stale value when returning to that page.

The callback holds only a weak reference to the MAUI page. When the tracker changes page or renderer, it unregisters the previous view before observing the replacement; tracker disposal also clears the registration through the normal page cleanup.

The result is translated to our MAUI enum and stored through a private `BindablePropertyKey`. That key lets the library update the read-only attached property without exposing a public setter. MAUI raises the property's change notification, which keeps the page's binding up to date; no polling is needed.

Like the other toolbar integrations, this requires iOS 27.1+. On older versions the settings have no native effect, and the sample reports the edge as `Unspecified`.

<figure class="article-screenshot">
  <img src="/assets/2026-11-03-wherebar.gif" alt="The demo app showing the ToolbarVerticalEdge property in different poses." />
</figure>
<!-- GIF: In the Edge tab, rotate and fold the Duo simulator and show the live Leading/Trailing/Unspecified value and arrow without deriving it from orientation. -->

## Hinge status and angle

The toolbar APIs let iOS adapt the system controls. The hinge API gives our own UI information about how the device is folded:

- **Status**: `Unknown`, `Closed`, `PartiallyOpen`, or `FullyOpen`.
- **Angle**: the current hinge angle. The library exposes it in **degrees**.

Prefer status when you only need to distinguish closed, partially open, and fully open. `FullyOpen` means as far as the device allows; don't hard-code an angle to detect it. Apple also controls the frequency and precision of angle updates, so this isn't a fixed-rate sensor stream.

### Using it in .NET MAUI

Unlike the toolbar plumbing, hinge monitoring doesn't depend on Shell. `UseDuoExtensions()` registers a **singleton** `IHingeService`. Inject it into a page, then call `ForWindow(Window)` to get that window's shared observer. The library handles native attachment and cleanup; no wiring in `App` or `AppShell` is needed.

Register the demo page so Shell can resolve its constructor dependencies:

```csharp
using DuoExtensions.Maui;
builder.Services.AddTransient<HingePage>();
```

The Shell tab uses a normal XAML template:

```xml
<ShellContent ContentTemplate="{DataTemplate local:HingePage}"
              Route="HingePage" />
```

The **Hinge** tab shows the current status and angle as Duo is folded or unfolded. The same constructor and lifecycle code also works on a regular MAUI page outside Shell:

```csharp
private readonly IHingeService _hingeService;
private IHingeObserver? _hinge;

public HingePage(IHingeService hingeService)
{
    InitializeComponent();
    _hingeService = hingeService;
}

protected override void OnAppearing()
{
    base.OnAppearing();
    _hinge = _hingeService.ForWindow(Window
        ?? throw new InvalidOperationException("The page must belong to a window."));
    _hinge.StateChanged += OnHingeStateChanged;
    UpdateReading(_hinge.CurrentState);
}

protected override void OnDisappearing()
{
    if (_hinge is not null)
    {
        _hinge.StateChanged -= OnHingeStateChanged;
        _hinge = null;
    }
    base.OnDisappearing();
}

private void OnHingeStateChanged(object? sender, HingeStateChangedEventArgs e) =>
    UpdateReading(e.State);
```

`CurrentState` and the event's `State` are nullable: no reading is available yet, or the view hierarchy no longer provides hinge information. Don't treat that as a closed hinge or keep displaying an old angle. `IsSupported` only tells us that the OS API is available, **not** that the device has hinge hardware.

Call `ForWindow` once the page belongs to a window, such as in `OnAppearing`, not its constructor. Repeated calls for the same window return the same `IHingeObserver`, so different pages can subscribe without creating duplicate native interactions. Reading `CurrentState` immediately after subscribing also displays updates received while the page was hidden.

#### One physical hinge, so why an observer per window?

That was my first thought too: the app runs on one device, so surely one shared hinge reading is enough? Physically, yes: creating another window doesn't create another hinge, and windows receiving readings for the same hinge should describe the same physical state.

The distinction is **how UIKit delivers those readings**. This isn't a global sensor API: a `UIHingeInteraction` observes the hinge associated with its view's hierarchy. UIKit can report no hinge for that hierarchy, including when the interaction leaves a hierarchy that provides updates.

If we merged everything into one global state, an unavailable update from one window could erase a valid reading for another. Keeping an observer per window preserves that context without making every page manage a native interaction.

So there is still **one singleton service throughout the app**. `ForWindow(Window)` simply selects the shared observer for the page's window: same window, same observer; different window, separate availability and lifecycle. We pass the window explicitly because with multiple windows there isn't one unambiguous global "current window."

Request the observer on the window's UI thread; events are delivered there too. Consumers only unsubscribe from their own events, not dispose the shared observer. Monitoring continues until the window is destroyed, when the library releases the interaction and event handlers.

<figure class="article-screenshot">
  <img src="/assets/2026-11-03-hinge.gif" alt="The demo app showing the state values of the Hingeservice while folding the iPhone." />
</figure>


### Under the hood

UIKit's `UIHingeInteraction` is an interaction attached to a native view. Its callback supplies an initial hinge state and subsequent updates, including when the interaction moves between view hierarchies. Our implementation attaches one interaction to the MAUI window's native `UIWindow`, which is itself a `UIView`. This keeps monitoring independent of Shell navigation.

The callback maps `UIHingeStatus` to our shared enum and converts UIKit's radians to degrees:

```csharp
var degrees = (double)hinge.Angle * 180.0 / Math.PI;
```

The resulting immutable `HingeState` becomes `CurrentState` and is published through `StateChanged`. Equal consecutive readings are ignored. If UIKit supplies a null hinge, the service clears its state and notifies consumers instead of keeping a stale measurement.

The singleton caches observers in a `ConditionalWeakTable` keyed by MAUI window, so the cache doesn't keep closed windows alive. Each observer handles both an existing native handler and one created later. It listens for handler changes, removes the old interaction before a replacement and attaches to the new hierarchy. Window destruction clears the reading, disposes the interaction and unsubscribes lifecycle events. The native callback uses a weak reference to avoid a retain cycle.

This requires iOS 27.1+. On older iOS versions, `IsSupported` is false and the observer's `CurrentState` stays null; it never constructs the newer UIKit type. See the [hinge service](https://github.com/PieEatingNinjas/DuoExtensions.Maui/blob/main/DuoExtensions.Maui/HingeService.cs), [observer lifecycle](https://github.com/PieEatingNinjas/DuoExtensions.Maui/blob/main/DuoExtensions.Maui/Platforms/iOS/HingeObserver.cs), [toolbar renderer](https://github.com/PieEatingNinjas/DuoExtensions.Maui/blob/main/DuoExtensions.Maui/Platforms/iOS/ToolbarLayoutShellRenderer.cs), and [demo app](https://github.com/PieEatingNinjas/DuoExtensions.Maui/tree/main/DuoExtensions-Demo) for the full implementation.

## Wrap-up

DuoExtensions.Maui is an experiment in making a few new UIKit capabilities reachable from the MAUI APIs we already use: Shell toolbar items, attached properties, and dependency injection. The system still owns the final toolbar layout, while the hinge service keeps its reading and lifecycle tied to the window UIKit reports it from.

Try the [demo](https://github.com/PieEatingNinjas/DuoExtensions.Maui/tree/main/DuoExtensions-Demo), or install the [NuGet preview](https://www.nuget.org/packages/DuoExtensions.Maui/0.1.0-preview.1). Found an unexpected layout, a lifecycle issue, or a simpler integration? Please [open an issue](https://github.com/PieEatingNinjas/DuoExtensions.Maui/issues) with the .NET MAUI, iOS and Xcode versions, the device or simulator configuration, and steps to reproduce it. Contributions and suggestions are welcome!
