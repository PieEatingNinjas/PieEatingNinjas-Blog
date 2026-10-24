---
title: "x:Bind and inheritance"
description: "(published on 11/30/2015, although Wordpress states '11/15/2015') Intro The first time I heard about Compiled Bindings (x:Bind) was at Build 2015. Finally we got compile-time valid"
pubDate: "2015-11-15"
legacy: {"id":200,"path":"/2015/11/15/xbind-and-inheritance/","taxonomySlugs":{"categories":["uwp","xaml","xbind"],"tags":["uwp","xaml","xbind"]}}
categories: ["uwp","xaml","xbind"]
tags: ["uwp","xaml","xbind"]
---

###### (published on 11/30/2015, although Wordpress states '11/15/2015')

# Intro

The first time I heard about Compiled Bindings (x:Bind) was at Build 2015. Finally we got compile-time validation on bindings and it promised to be a lot faster as it doesn't need to do reflection at runtime! After playing around with it for a bit, I introduced it to my development team and we were going to use it wherever possible in our UWP project.

Once we were using it in real-life scenarios we stumbled upon some issues with compiled bindings. Luckily all these issues were apparently due to the fact we were  developing against very early bits of UWP because since the launch of 10.0 Build 10240 these issues were gone... All except for one...

And it's kind of an annoying one.

# The problem

Let me illustrate. I've got two interfaces: _IViewModel_ (exposing a _Title_ property) and _IMainPageViewModel_ which inherits from _IViewModel_. I've got a _Page_ that has a property _ViewModel_ of type _IMainPageViewModel_.

[![schema](/wp-content/uploads/2015/11/schema.jpg)](/wp-content/uploads/2015/11/schema.jpg)

On my _MainPage_, I try to bind the _Title_ property of my _IMainViewModel_ (which is inherited from _IViewModel_) to a _TextBlock_.

<a id="legacy-code-binding"></a>

```xml
<StackPanel Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
    <TextBlock Text="{x:Bind ViewModel.Title, Mode=OneWay}" />
    <Button Content="Click me" Tapped="{x:Bind ViewModel.OnMainButtonClick}" />
</StackPanel>
```

But, at compile time, Visual Studio throws the following compilation error at me:

_Invalid binding path 'ViewModel.Title' : Property 'Title' can't be found on type 'IMainPageViewModel'_

It turns out, only properties of the interface you are binding on directly can be found. Properties of an interface that are inherited from an other interface can't be found.

# A solution

We could get this to work by explicitly exposing the _Title_ property on the _IMainViewModel_.

![VS Warning](/wp-content/uploads/2015/11/vs-warning.jpg)

But, as you can see in the above image, Visual Studio gives us a warning. If we want to do this in a 'clean' way, we could use the 'new' keyword as Visual Studio suggests.

<a id="legacy-code-new"></a>

```csharp
public interface IMainPageViewModel : IViewModel
{
    //uncommenting this will let the compile binding work
    new string Title { get; }
    void OnMainButtonClick();
}
```

# Thoughts

IMHO, this is dirty... Hiding inherited members can be useful in some situations, but not in this scenario for compiled bindings. The binding engine should in fact recognize the members of all underlying interfaces. Imagine you need to expose a handful of properties from your base _IViewModel_, the interfaces of our _ViewModels_ won't look pretty.

Sadly, at this moment, I don't see any other options. However, despite it being dirty, it does work. For now, we will need to keep 'hinting' the binding engine for these properties we inherit from underlying interfaces. Hopefully Microsoft fixes this over time...
