---
title: "Using the Fluent Design System in a minesweeper game"
description: "In this blog post I would like to show you how to use Acrylic, Reveal highlight and Connected Animations using the Fluent Design System that comes with the Fall Creators Update of "
pubDate: "2017-12-21"
legacy: {"id":1025,"path":"/2017/12/21/using-the-fluent-design-system-in-a-minesweeper-game/","taxonomySlugs":{"categories":["c","fall-creators-update","fluent-design","uwp","xaml"],"tags":[]}}
categories: ["C#","fall-creators-update","fluent-design","uwp","xaml"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/MineSweepingNinja"]
---

In this blog post I would like to show you how to use Acrylic, Reveal highlight and Connected Animations using the Fluent Design System that comes with the Fall Creators Update of Windows 10.

The Fluent Design System is a set of UWP features and guidelines for creating beautiful, elegant, fluent, sexy, ... UWP apps. More about the Fluent Design System can be found [here](https://docs.microsoft.com/en-us/windows/uwp/design/fluent-design-system/ "The Fluent Design System").

In my spare time, I created a simple minesweeper game - Mine Sweeping Ninja - that uses some of these features. The complete source can be found on [GitHub](https://github.com/PieEatingNinjas/MineSweepingNinja "Mine Sweeping Ninja") and the app itself is [available in the Store](https://www.microsoft.com/store/apps/9P241KPXMWH4 "Mine Sweeping Ninja in the Store") as well. Please note that the code in this post might not be 100% the same as you can find in the GitHub repo, as I stripped some things out here to more clearly show the basics.

# Background

Some time ago, the [MADN usergroup](http://www.madn.be/ "MADN usergroup") invited James Clark to Belgium to talk about this new thing called Fluent Design. At the Ordina offices in Mechelen, he talked about Acrylic material, animations, Parallax, Reveal,... and showed all these cool things in some really nice demos.

# Using the Reveal highlight (lighting effect)

It was until a bit more than a week ago that I found some time to try out the things a saw back then. The first thing I tested was just a simple screen -with an acrylic background- and a simple button -with a ButtonRevealstyle-.

**Basic page with Acrylic background and button with RevealStyle**

```xml
<Page
    ...
    Background="{ThemeResource SystemControlAltMediumLowAcrylicWindowMediumBrush}">
    <Grid>
        <Button Text="Hello Fluent Design" Style="{ThemeResource ButtonRevealStyle}" /> 
    </Grid>
</Page>
```

I thought the ButtonRevealStyle effect was very cool, so I wondered how it would look like if I'd put multiple buttons right next to each other. I was amazed to see how good the lighting effect on all the buttons worked out:

<video controls preload="metadata" src="/wp-content/uploads/2017/12/DQ8BMqgWkAERely.mp4"><a href="/wp-content/uploads/2017/12/DQ8BMqgWkAERely.mp4">Download video</a></video>

And so the idea arose to create a minesweeper game using some cool stuff from Fluent Design!

# Creating Connected animations

I had some minesweeper code, in Windows Forms, lying around from back when I was in high school, I guess. I re-factored that a bit and with that lighting effect on my buttons it already looked like some futuristic minesweeper game. But I wanted to add some more Fluent Design goodness... And one of the other things I really like in Fluent Design are the Connected Animations. With this, we can animate the transition of an element between two different views. Very cool effect, that is! So I added 2 additional screens: a start screen (StartPage) and a screen to show when you won/lost the game (FinishedPage). On both screens I show a large image that I would use in my animations:

-   StartPage to MainPage (the minefield) => large logo should animate to the small logo on the MainPage
-   MainPage to FinishedPage when clicked on a mine => the clicked mine should animate to the large logo on the FinishedPage
-   MainPage to FinishedPage when dismantled all mines => the small logo on the MainPage should animate to the large logo on the FinishedPage
-   FinishedPage to MainPage when starting new game => large logo should animate to the small logo on the MainPage
-   FinishedPage to MainPage when viewing board after dismantling all mines => large logo should animate to the small logo on the MainPage
-   FinishedPage to MainPage when viewing board after clicked on a mine => large logo should animate to the mine that was clicked

These animations seem a complex thing to do. If you have ever tried these kinds of things in the past, you know they are a real pita, but with the apis we get in the Fall Creators Update this is super easy to do.

First, you need to prepare for your animation. This is done on the page you navigate from. Basically, you take the control you want to animate and give it a particular key. Once you have done that, you can navigate to the new page.

**PrepareToAnimate in StartPage**

```csharp
private void Button_Tapped(object sender, TappedRoutedEventArgs e)
{
    //the string "cat" is the key used for this animation
    //object Cat is the name of the UIElement that I want to use in my animation
    ConnectedAnimationService.GetForCurrentView().PrepareToAnimate("cat", Cat);

    this.Frame.Navigate(typeof(MainPage));
}
```

In the NavigatedTo method of the new page, you can then 'pick up' the animation that you prepared on the previous page, using the same key you used there. Next, you can call the TryStart method of that animation and point to the control you want to animate to:

**Start animation in OnNavigatedTo on the MainPage**

```csharp
protected override void OnNavigatedTo(NavigationEventArgs e)
{
    base.OnNavigatedTo(e);
    //"cat" is the same key that was used in the PrepareAnimation method on the previous screen
    TryStartAnimation("cat", (UIElement)Game.ExplodedTile ?? Cat);
    
    var animation = ConnectedAnimationService.GetForCurrentView().GetAnimation("cat");

    if (animation != null)
        animation.TryStart(Cat); //Cat is the UIElement on this page where I want to animate to
}
```

And that's how easy it is to do these fancy animations!

An other example is when a user clicks on a button under which lies a mine, an event is triggered. I then use the clicked button (which is the sender that is passed in as a parameter) as the source of my animation in the PrepareForAnimation method, navigate to the FinishedPage, pick up the animation and set the large logo as its destination.

**PrepareAnimate OnExplode event in MainPage**

```csharp
private void Game_OnExploded(object sender, EventArgs e)
{
    //cat is the key used for this animation (not the best name, I know)
    //The animation needs to start from the button that 'exploded' so we pass this in as parameter
    ConnectedAnimationService.GetForCurrentView().PrepareToAnimate("cat", sender as Button);
    this.Frame.Navigate(typeof(FinishedPage));
}
```

In the OnNavigatedTo method on the FinishedPage, we can now pick up this animation and call the TryStart method on it, just like we did previously:

**TryStart animation in the OnNavigatedTo of the FinishedPage**

```csharp
protected override void OnNavigatedTo(NavigationEventArgs e)
{
    base.OnNavigatedTo(e);

    //Get the animation named "cat"
    ConnectedAnimation animation = ConnectedAnimationService.GetForCurrentView().GetAnimation("cat");

    if (animation != null)
        animation.TryStart(txtImage); //Animate to the txtImage control on my page
}
```

See some of the animations in action:

<video controls preload="metadata" src="/wp-content/uploads/2017/12/DRAowkoXUAAceUg.mp4"><a href="/wp-content/uploads/2017/12/DRAowkoXUAAceUg.mp4">Download video</a></video>

# Wrapping up

In this blog post I showed you how to start with the Fluent Design System. Despite it being so super easy to use and implement, it adds so much 'coolness' and makes your app look feel so much more attractive and professional. Even a simple minesweeper game instantly looks sexy and super advanced! :D
