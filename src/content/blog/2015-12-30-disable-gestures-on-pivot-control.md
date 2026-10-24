---
title: "Disable gestures on Pivot control"
description: "One last blogpost to end 2015 with... Intro For this small project I'm working on in my spare time, I wanted to use a Pivot control but without the gestures; i.e. swipe/pan/flick t"
pubDate: "2015-12-30"
legacy: {"id":275,"path":"/2015/12/30/disable-gestures-on-pivot-control/","taxonomySlugs":{"categories":["c","uwp","xaml"],"tags":[]}}
categories: ["C#","uwp","xaml"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/PivotWithoutSwipe"]
---

_One last blogpost to end 2015 with..._

# Intro

For this small project I'm working on in my spare time, I wanted to use a Pivot control but without the gestures; i.e. swipe/pan/flick to go to the next or previous item in the Pivot.

# Easier said than done

I searched the interwebs, but I didn't find anything useful. You find things like setting the _IsHitTestVisible_ property of your Pivot control to _false_ or setting the _IsLocked_ property to _true_. And yes, both these suggestions work, but both come with their own side effects.

When setting the _IsHitTestVisible_ property of the Pivot control to _false_, all child elements' _IsHitTestVisible_ property will also be set to _false_. Which ofcourse results in none of the children to be interactive.

Setting _IsLocked_ to _true_ will cause only the header of the 'active' Pivot item to be rendered.

None of these would work for me, so I tried doing stuff like listening to the Manipulation events, setting Attached properties of the Scrollviewer on the Pivot control (e.g. ScrollViewer.HorizontalScrollMode\="Disabled")... No luck...

# Pivot internals

Finally I decided to take a look at how the Pivot control is build up via the Live Visual Tree inspector. I noticed that there was this ScrollViewer that would possibly be responsible for the horizontal scrolling behavior that I would like to disable/override. I started smiling and thought: "Ok, found it, now let's fix this in 5 seconds!". So I took the Generic style of the Pivot control, pasted it in the Resources my XAML page and tweaked the ScrollViewer inside that Pivot Style a bit. As I wanted to disable the horizontal scrolling, I changed the _HorizontalScrollBarVisibility_ property from _Hidden_ to _Disabled_ and the _HorizontalScrollMode_ to _Disabled_. "Done!". F5... And we got an empty Pivot... Mmm... So apparently horizontal scrolling should be enabled in order to let the Pivot control work.

# My solution

Thus, I should only disable horizontal scrolling when the user interacts. We can determine this with the Pointer\[X\] events on the ScrollViewer inside the Pivot Style. We have PointerEntered, PointerExited, PointerReleased, PointerCaptureLost, PointerMoved and some more. On the PointerEntered and PointerMoved events we know the user is 'on' our Pivot control (with his mouse or touch or pen) and in that situation, we want to disable the horizontal scrolling.

[![XAML (Pivot Style)](/wp-content/uploads/2015/12/xaml-inside.jpg)](/wp-content/uploads/2015/12/xaml-inside.jpg) XAML (Pivot Style)

<a id="legacy-code-code-inside1"></a>

```csharp
private void ScrollViewer_PointerInside(object sender, PointerRoutedEventArgs e)
{
    ((ScrollViewer)sender).HorizontalScrollMode = ScrollMode.Disabled;
}
```

Code behind

Because it seems that the Pivot control needs horizontal scrolling internally on initialization, I want to play it safe and re-enable horizontal scrolling again when the user isn't interacting with the control (although I haven't seen any side effects when I don't enable horizontal scrolling again).

[![XAML (Pivot Style)](/wp-content/uploads/2015/12/xaml-out.jpg)](/wp-content/uploads/2015/12/xaml-out.jpg) XAML (Pivot Style)

<a id="legacy-code-code-out"></a>

```csharp
private void ScrollViewer_PointerOut(object sender, PointerRoutedEventArgs e)
{
    ((ScrollViewer)sender).HorizontalScrollMode = ScrollMode.Enabled;
}
```

Code behind

And this perfectly works! The Pivot control is rendered and works as expected, the only thing special is that the user can't use gestures to go from one Pivot item to another. He can, however, still go to another item by tapping the header; the behavior I wanted!

# Extra

As this is my last post of the year, I got a little extra... When testing the result, I was quite pleased, but I realized I actually did want the gestures to work on the Pivot header. So I made the following change in code:

<a id="legacy-code-code-header"></a>

```csharp
private void ScrollViewer_PointerInside(object sender, PointerRoutedEventArgs e)
{
    if (e.GetCurrentPoint((ScrollViewer)sender).Position.Y > 48)
    {
        ((ScrollViewer)sender).HorizontalScrollMode = ScrollMode.Disabled;
    }
    else
    {
        ((ScrollViewer)sender).HorizontalScrollMode = ScrollMode.Enabled;
    }
}
```

The above code disables horizontal scrolling only when the pointer is inside the Pivot's content and not on the header (the default height of  the Pivot header is 48px).

Works like a charm!

# Thoughts

This is just one approach to reach this behavior. Maybe you have an other, more cleaner, one. Feel free to share it! Does this behavior provide good UX? I personally don't know... I think in my app it might work, but I'm sure I'll get feedback once it makes it into the store.

Code can be found on [GitHub](https://github.com/PieEatingNinjas/PivotWithoutSwipe)

Hope to see you all again in 2016!!
