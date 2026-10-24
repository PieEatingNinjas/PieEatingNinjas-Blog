---
title: "A fixed and always expanded CommandBar in UWP"
description: "Is it possible to show a CommandBar in UWP that... ...is always expanded and fixed so the label of your AppBarButtons are always visible ...has no ellipsis button to open or collap"
pubDate: "2019-12-03"
legacy: {"id":1577,"path":"/2019/12/03/a-fixed-and-always-expanded-commandbar-in-uwp/","taxonomySlugs":{"categories":["c","uwp","xaml"],"tags":[]}}
categories: ["C#","uwp","xaml"]
tags: []
---

Is it possible to show a CommandBar in UWP that...

-   ...is always expanded and fixed so the label of your AppBarButtons are always visible
-   ...has no ellipsis button to open or collapse it

Yes, it is! I had to achieve this in one of my projects because the users didn't think the icons on their own were intuitive enough, so they wanted the CommandBar to be always open or expanded. Of course, when the CommandBar is always open, there is no need to show the ellipsis / show more / overflow button.

# IsOpen and IsSticky

These two properties already do some of the work. With the IsOpen property we can programmatically set the CommandBar to open.

With the IsSticky propety set to true, the CommandBar will stay open if the user clicks somewhere else on the screen. The default behavior (IsSticky set to false) is that when the CommandBar is expanded and the user clicks somewhere else on the screen, it collapses again. We don't want this, in our scenario the CommandBar should remain open.

```xml
<Grid>
    <CommandBar VerticalAlignment="Bottom" IsSticky="True" IsOpen="True">
        <AppBarButton Icon="AddFriend" Label="Add Friend" Tapped="AppBarButton_Tapped" />
    </CommandBar>
</Grid>
```

![](/wp-content/uploads/2019/12/appbar1.jpg) IsSticky and IsOpen to true

# OverflowButtonVisibility

As you can see above, now the CommandBar is open by default and it doesn't minimize when the user clicks somewhere on the screen. But, we still have this ellipsis / show more / overflow button on the far right. There's no point having this button when we always want to show the CommandBar in all its glory.

Luckily we can simply hide this button by setting the OverflowButtonVisibility property to 'Collapsed'.

```xml
<Grid>
    <CommandBar VerticalAlignment="Bottom" IsSticky="True" IsOpen="True" OverflowButtonVisibility="Collapsed">
        <AppBarButton Icon="AddFriend" Label="Add Friend" Tapped="AppBarButton_Tapped" />
    </CommandBar>
</Grid>
```

![](/wp-content/uploads/2019/12/appbar2.jpg) OverflowButton hidden

# CommandBar Closing event

You might think you achieved your goal. Not so fast! When you click a button in the CommandBar, it will automatically close. You might not expect this as the IsSticky property is set to true... Bug or feature, that's up for you to decide, I'll give you a fix for this. There's this Closing event on the CommandBar. If we set the IsOpen property to true again in this event, the CommandBar will not close.

```csharp
void CommandBar_Closing(object sender, object e)
    => ((CommandBar)sender).IsOpen = true;
```

# Conclusion

All these little pieces together result in a CommandBar, just like we know it, but it's always shown open in all its glory and it stays put.
