---
title: "Deferred Loading, mind the Visual State Manager"
description: "Deferred Loading is a great way to optimize your XAML views. It allows us to lazy load controls that aren't visible by default, or that are only visible under certain conditions. I"
pubDate: "2015-11-07"
legacy: {"id":16,"path":"/2015/11/07/deferred-loading-mind-the-visual-state-manager/","taxonomySlugs":{"categories":["performance","uwp","xaml"],"tags":["c","deferredloadstrategy","uwp","xaml"]}}
categories: ["performance","uwp","xaml"]
tags: ["C#","deferredloadstrategy","uwp","xaml"]
---

Deferred Loading is a great way to optimize your XAML views. It allows us to lazy load controls that aren't visible by default, or that are only visible under certain conditions. It is a great technique to optimize the performance and memory usage of your app!

The last few months, I've seen some improper usage of this lazy loading, which causes to totally nullify the purpose of deferred loading.

## Recap: Deferred Loading

Deferred Loading is a technique in XAML that you can use to reduce the number of elements in your Visual Tree. Typically you might have some elements on your view that are _'Collapsed'_ by default and that only become _'Visible'_ in a particular case. Note that although an item is _'Collapsed'_, it is still present in the Visual Tree of your view and so it needs some processing time when initializing the page and takes up some memory.

With Deferred Loading, we can prevent UIElements from being created and included in our Visual Tree. Therefore, we can save some precious processing power when our page is being initialized.

[![Although the control's Visibility is set to Collapsed, the control is being created and is part of the Visual Tree. It is not visible, but it's there!](/wp-content/uploads/2015/11/collapsed1.jpg)](/wp-content/uploads/2015/11/collapsed1.jpg) Although the progressRing's Visibility is set to Collapsed, it is being created and is part of the Visual Tree. It is not visible, but it's there!

[![Because of the DeferLoadStrategy, the control isn't being ceated.](/wp-content/uploads/2015/11/lazy1.jpg)](/wp-content/uploads/2015/11/lazy1.jpg) Because of the DeferLoadStrategy, the progressRing isn't being ceated by default.

There are a few possibilities to initialize and load these UIElements at runtime. For exmple the _'FindName'_ method, which is a method of the FrameworkElement class (I really don't like the name of that method, tbh, but nothing to do about that). When you call this method, you can pass in the name of the control you want to load.

```csharp
private void Button_Tapped(object sender, TappedRoutedEventArgs e)
{
    if(progressRing == null)
        FindName(nameof(progressRing));
    progressRing.Visibility = Visibility.Visible;
}
```

Mind you that I said earlier that with this DeferLoadStrategy, the control isn't being created by default, it is lazy loaded. In other words, after initialization, the control is _null_. It will only be created when we want it to. So, when I Tap the button after the page is initialized, my progressRing will be _null_ and we can create it using the _FindName_ method, passing in _"progressRing"_ (or using the fancy _nameof_ operator). This will create the ProgressRing control and add it to the Visual Tree.

An other way to initialize controls at runtime, is by using Storyboards or VisualState Setters. When you access a property of a control in a Storyboard or through Visual State Setters, the control itself will be initialized if it hasn't been created yet. This technique is used very often in scenarios where you want to show a different set of controls depending on, for example, the screensize of your Universal Windows App. And this is where I've seen things go wrong...

##  What can possibly go wrong?

Imagine we have a Universal Windows App and we want to have a completely different view on a handheld device than on a tablet or desktop.

This is a typical scenario where Deferred Loading is the way to go! We can build our page in XAML for both form factors. With the help of Deferred Loading, we can perfectly decide which UI Elements should be created when or in what scenario. The other elements won't be loaded into our Visual Tree, preventing them from filling up memory and using unnecessary processing power. So, at a high level, we have something like this:

<a id="legacy-code-high-level-small"></a>

```xml
<Grid Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
    <Grid x:Name="narrowView" x:DeferLoadStrategy="Lazy" Visibility="Collapsed" />
    <Grid x:Name="wideView" x:DeferLoadStrategy="Lazy" Visibility="Collapsed" />
</Grid>
```

In the Grid named _narrowView_, we can build up our UI that we will show on a Phone. The _wideView_ Grid will hold the UIElements that we want to display when the user is using the app on a Tablet or Desktop.

In the VisualStateManager of our page, we can now define two Visual State Triggers (one for each formfactor we want to support). These triggers will, depending on the screen size in this case, set the correct Grid visible and therefore initializing it. Therefore, the following code can be written:

<a id="legacy-code-vsm-bad"></a>

```xml
<VisualStateManager.VisualStateGroups>
    <VisualStateGroup >
        <VisualState x:Name="narrow">
            <VisualState.StateTriggers>
                <AdaptiveTrigger MinWindowWidth="0" />
            </VisualState.StateTriggers>
            <VisualState.Setters>
                <Setter Target="narrowView.Visibility" Value="Visible" />
                <Setter Target="wideView.Visibility" Value="Collapsed" />
            </VisualState.Setters>
        </VisualState>
        <VisualState x:Name="wide">
            <VisualState.StateTriggers>
                <AdaptiveTrigger MinWindowWidth="480" />
            </VisualState.StateTriggers>
            <VisualState.Setters>
                <Setter Target="wideView.Visibility" Value="Visible" />
                <Setter Target="narrowView.Visibility" Value="Collapsed" />
            </VisualState.Setters>
        </VisualState>
    </VisualStateGroup>
</VisualStateManager.VisualStateGroups>
```

The code above, contains something I've seen too often.

Although both grids are defined to load lazy, none of these make truly use of it. When accessing a property of a control in the Visual State Manager, the control will be initialized if it isn't created yet. In the above code sample, look at the _'wide'_ Visual State and notice that we explicitly set the Visibility of the narrowView to _'Collapsed'_. Because we explicitly set the control's Visibility property, the control is being initialized. Setting the Visibility property of this control to _'Collapsed'_ in the Visual State Manager, totally invalidates the Defer Load Strategy. Visual Studio's 'Live Visual Tree' delivers us the evidence: we are actually rendering 13 UI Elements that we don't see or need. Although, looking quickly at the code, we might think we are preventing this by using deferred loading. In this very simple scenario we are rendering more than 35% of excess controls.

[![result](/wp-content/uploads/2015/11/result1.jpg)](/wp-content/uploads/2015/11/result1.jpg)

Setting the Visibility of the control explicitly to _'Collapsed'_ can be left out, as it already is defined as _'Collapsed'_ in XAML. Take a look at the updated Visual State Manager and its result:

[![result good](/wp-content/uploads/2015/11/result-good.png)](/wp-content/uploads/2015/11/result-good.png)

This is what the result should look like in this scenario: on a wide screen, the controls for a narrow screen shouldn't be created.

## Conclusion

If you have a particular control, that must be loaded lazy, make sure you don't accidentally set unnecessary properties of that control in your Visual State Manager. In a Storyboard or Visual State Setters, settting the value of a property of a control will automatically cause the control to be created.

It is a good reflex for controls that need to be loaded lazy, to set their Visibility to _'Collapsed'_ by default. This ensures that you wouldn't need to set its Visibility to _'Collapsed'_ in your Visual State Manager which would consequently create a control that is not visible to the user. For controls that should be lazy loaded, the only Visibility you should set in your Visual State Manager, is _'Visible'_.

Ofcourse, this also applies to other properties, not only Visibility. So, to conclude, in your Visual State Manager try to limit accessing properties of lazy loading controls that you don't _need_ in that particular Visual State.
