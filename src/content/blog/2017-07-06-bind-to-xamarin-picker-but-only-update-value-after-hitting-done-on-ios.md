---
title: "Bind to Xamarin Picker but only update value after hitting Done on iOS"
description: "Sometimes you stumble upon these gems that you didn't know they existed. Like I did today... The 'problem' with the Picker You might have noticed that when you are binding to the S"
pubDate: "2017-07-06"
legacy: {"id":924,"path":"/2017/07/06/bind-to-xamarin-picker-but-only-update-value-after-hitting-done-on-ios/","taxonomySlugs":{"categories":["c","xamarin","xaml"],"tags":[]}}
categories: ["C#","xamarin","xaml"]
tags: []
---

###### Sometimes you stumble upon these gems that you didn't know they existed. Like I did today...

# The 'problem' with the Picker

You might have noticed that when you are binding to the `SelectedItem` of a `Picker` in Xamarin Forms, that on iOS the value of the bound property already changes when the user is scrolling through the list of options, even without explicitly having tapped the 'Done' button.

Now in a particular app I'm developing, I -the product owner actually- didn't want this behavior. Instead, the bound property should change its value ONLY when the user taps the Done button in the `Picker`. And so I started to try some stuff out...

# Platform specifics to the rescue

Eventually, after trying some stuff and after I lost already too much time on this to be honest, I came across to the '`Picker.UpdateMode`' platform-specific. And with this, I can define when the change on my property should be triggered: `Immediately`  (the default) or `WhenFinished`  (when the user tapped the 'Done' button). In XAML this looks something like this:

**Picker.UpdateMode in XAML**

```xml
<Picker ItemsSource="{Binding Options}"
    SelectedItem="{Binding Result}"
    ItemDisplayBinding="{Binding Label}"
    iOSSpecific:Picker.UpdateMode="WhenFinished" />
```

For this I added this namespace in my XAML:

**iOSSpecific namespace in XAML**

```xml
xmlns:iOSSpecific="clr-namespace:Xamarin.Forms.PlatformConfiguration.iOSSpecific;assembly=Xamarin.Forms.Core"
```

If we would want to do the same thing in code, we can do it as follows:

**SetUpdateMode in code**

```csharp
myPicker.On<Xamarin.Forms.PlatformConfiguration.iOS>().SetUpdateMode(UpdateMode.WhenFinished);
```

Cool! Yet another Xamarin Forms gem I didn't know about! :-)
