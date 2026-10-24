---
title: "UWP app on Xbox One: controller input gotcha (KeyDown event)"
description: "I was trying out some stuff on my Xbox One (well technically not mine, but that doesn't matter). More particularly I was testing out UWP for Xbox One. One of the first things I wan"
pubDate: "2016-09-03"
legacy: {"id":606,"path":"/2016/09/03/uwp-app-on-xbox-one-controller-input-gotcha-keydown-event/","taxonomySlugs":{"categories":["c","uwp","xbox-one"],"tags":[]}}
categories: ["C#","uwp","xbox-one"]
tags: []
---

I was trying out some stuff on my Xbox One (well technically not mine, but that doesn't matter). More particularly I was testing out UWP for Xbox One.

One of the first things I wanted to try out was how to get input from the Xbox One controller. And so I hooked up the _KeyDown_ event of the _Windows' CoreWindow._

**Hooking up KeyDown event**

```csharp
Window.Current.CoreWindow.KeyDown += CoreWindow_KeyDown;
```

**Handling KeyDown event**

```csharp
private void CoreWindow_KeyDown(Windows.UI.Core.CoreWindow sender, Windows.UI.Core.KeyEventArgs args)
{
    Debug.WriteLine(args.VirtualKey.ToString());
}
```

As the _VirtualKey_ enumeration, which I get back in the _KeyEventArgs_ and represents the key being pressed, has values like '_GamePadA_' or '_GamePadLeftShoulder_', I thought that I already found a way to get input from the game controller.

# But...

Well, this blogpost is about a 'gotcha', so you would have probably guessed that there is a small caveat.

It turned out that when I ran my UWP app on my Xbox One, that pressing any button -except for the B button- nothing would happen. I didn't see anything appearing in my Output window. Only when pressing the B button, '_GamepadB_' was printed out. Strange...

After looking up some things, I found out that by default UWP apps on Xbox One run in 'mouse mode'. So my controller is more or less treated like a mouse. Hence the 'pointer' on my screen:

![Xbox Mouse Pointer](/wp-content/uploads/2016/09/xbox-pointer.jpg)

In order to disable this 'mouse - or pointer mode' I had to set the _RequiresPointerMode_ property of my App class to '_WhenRequested_'. Like this (App.xaml.cs):

**Disabling mouse mode**

```csharp
this.RequiresPointerMode = ApplicationRequiresPointerMode.WhenRequested;
```

**This is, by the way, recommended for a UWP app that needs to run on a Xbox One. Because, you could also control your Xbox with a remote-like controller where you don't have a thumbstick.**

When I start up my application now, I no longer see this mouse pointer. But, when I now press a button on my controller I see that my Output Window is printing out the expected values.

![Output](/wp-content/uploads/2016/09/output.jpg)

So, now the _KeyDown_ event is triggered every time we press a button on the controller and through the _VirtualKey_ property of the passed in _KeyEventArgs_ we can easily determine which button the user has pressed on his controller.

Having no mouse pointer in your screen, however, means that we should think through our UI when building UWP apps for Xbox One as we now navigate through our app using the controller's D-pad or left thumb stick, but not as if we are using some sort of mouse pointer. But more on this in a later blogpost.

# Summary

When building a UWP app that needs to run on Xbox One, you should set your App's _RequiresPointerMode_ to _ApplicationRequiresPointerMode.WhenRequested._ That way the _KeyDown_ event of the _CoreWindow_ is triggered and works as expected. This is the recommended mode in which your app should run on Xbox One.

# Extra

Setting the _RequiresPointerMode_ to '_WhenRequested_' means that we no longer see a pointer on the screen. However, in some scenarios you might want the user to interact with a particular control using the pointer. For example, on a Custom Control on which you would like the user to interact using 'mouse controls', you can set the _RequiresPointer_ and _IsFocusAngagementEnabled_ properties, like this:

**Allow Mouse like interactions**

```csharp
public MyUserControl()
{
    this.InitializeComponent();
    this.RequiresPointer = RequiresPointer.WhenEngaged;
    this.IsFocusEngagementEnabled = true;
}
```

Now every child in my custom control will be in 'mouse mode' as well so the user will see a pointer on the screen when het interacts with my custom control.

I hope this blogpost could be of any help to anyone who's also been struggling with controller input! In a later posts I will be discussing things like  _IsFocusAngagementEnabled,_ how to efficiently allow the user to navigate through your app (when not in mouse mode), ...
