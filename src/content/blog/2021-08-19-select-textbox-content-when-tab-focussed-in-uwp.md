---
title: "Select TextBox content when tab focussed in UWP"
description: "For a LOB application I'm building, one very important request is the fact that users should be able to input/edit data as fast as possible. Allowing users to use the tab key to na"
pubDate: "2021-08-19"
legacy: {"id":1752,"path":"/2021/08/19/select-textbox-content-when-tab-focussed-in-uwp/","taxonomySlugs":{"categories":["c","uwp","xbind"],"tags":[]}}
categories: ["C#","uwp","xbind"]
tags: []
---

For a LOB application I'm building, one very important request is the fact that users should be able to input/edit data as fast as possible.

Allowing users to use the tab key to navigate from one input control to another is essential for this. During one of the first user test runs, one of the main remarks was that, although they can easily navigate in the application by using the tab key, they found it bothering that the cursor was placed in the TextBox where the cursor was the last time.

![](/wp-content/uploads/2021/08/Tab-regular.webp)

What the users really wanted -for fast editing- was that if there would already be text in the TextBox, that the text would be selected when the user navigated to the control while 'tabbing'. That way they could easily and immediately override the content of the TextBox. Like this:

![](/wp-content/uploads/2021/08/Tab-select_1.webp)

Makes sense! This will definitely help users editing their data a lot faster! No deletes/backspace needed when they want to override an existing value.

## How can we do this?

This is really easy to implement. What we want to do is listen to the GotFocus event. I don't think this event needs any explaining, the name says it all... ;-) As we -in this particular scenario- only want to select the content of the TextBox when the user 'tabbed' to it, we need to find a way to determine how the TextBox got focus. Luckily, a TextBox has FocusState property which tells us how the control came in to focus. Once we determined that the TextBox' FocusState has a value of Keyboard, the only thing left to do is select the content of the TextBox, which isn't rocket science either... ;-)

```csharp
private void TextBox_GotFocus(object sender, RoutedEventArgs e)
{
    if (e.OriginalSource is TextBox tb)
    {
        if (tb.FocusState == FocusState.Keyboard)
        {
            tb.SelectAll();
        }
    }
}
```

## So, that's it?

Yes, this is how you can make this work! Of course, adding this event to every TextBox and handling it in code-behind might not be that convenient.

The thing I did, for now, is the following:

-   I created a static helper class FocusHelper with a static method 'SelectOnFocus' which contains the exact same code as I showed earlier
-   I used x:Bind to bind the GotFocus event of TextBoxes to this static method

```csharp
public static class FocusHelper
{
    public static void SelectOnGotFocus(object sender, RoutedEventArgs e)
    {
        if (e.OriginalSource is TextBox tb)
        {
            if (tb.FocusState == FocusState.Keyboard)
            {
                tb.SelectAll();
            }
        }
    }
}
```

```xml
<Page
    x:Class="SelectOnTab_Demo.MainPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:local="using:SelectOnTab_Demo"
    xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:helpers="using:SelectOnTab_Demo.Helpers"
    mc:Ignorable="d"
    Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
    <Grid>
        <StackPanel VerticalAlignment="Center" MaxWidth="300" Spacing="5">
            <TextBox Text="Pie" GotFocus="{x:Bind helpers:FocusHelper.SelectOnGotFocus}"/>
            <TextBox Text="Eating" GotFocus="{x:Bind helpers:FocusHelper.SelectOnGotFocus}"/>
            <TextBox Text="Ninjas" GotFocus="{x:Bind helpers:FocusHelper.SelectOnGotFocus}"/>
        </StackPanel>
    </Grid>
</Page>
```

Yes, this probably can be handled in a better, more elegant way, like a custom action in a behavior for example. But, for now, this does the trick as well and keeps it all very simple.

## Additional thoughts

I can truly imagine this behavior of a TextBox is a huge time saver in LOB apps where the speed of input is a top priority. Wouldn't it be nice if this if this was a standard behavior that you could toggle with a property on a TextBox? Or would you rather see this as a behavior/action or something in the Windows Community Toolkit?
