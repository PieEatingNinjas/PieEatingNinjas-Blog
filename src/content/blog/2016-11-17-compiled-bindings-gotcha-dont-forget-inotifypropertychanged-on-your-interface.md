---
title: "Compiled bindings gotcha - Don't forget INotifyPropertyChanged on your interface"
description: "Intro On one of our UWP projects we ran into an issue where OneWay binding using x:Bind (compiled bindings) didn't work. Only the initial value was shown. In the end, when I found "
pubDate: "2016-11-17"
legacy: {"id":701,"path":"/2016/11/17/compiled-bindings-gotcha-dont-forget-inotifypropertychanged-on-your-interface/","taxonomySlugs":{"categories":["c","uwp","xaml","xbind"],"tags":[]}}
categories: ["C#","uwp","xaml","xbind"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/CompiledBindingsInterfaceTest"]
---

# Intro

On one of our UWP projects we ran into an issue where _OneWay_ binding using _x:Bind_ (compiled bindings) didn't work. Only the initial value was shown.

In the end, when I found and fixed the problem, I realized that it was something I actually already knew, but didn't think about it immediately. I thought I'd share my findings here so it might be of any help if you would run into this issue yourself.

# The problem

A colleague was requesting help because he couldn't get his bindings to work on a case where he was using _x:Bind_ (compiled bindings). He said that the initial value was bound correctly but whenever he changed the value of the property on the _ViewModel_, the changes where not visible on the view... If he'd change his binding from compiled binding to 'classic' binding, everything worked as expected!

# The Solution?

So, the first thing I said to my colleague was: "make sure you set the binding mode explicitly to _OneWay_ as compiled bindings default to _OneTime_ (where the _BindingMode_ on 'classic binding' defaults to '_OneWay_')". But it turned out that that wasn't the issue...

# Let's look at it a bit closer

For this blogpost I've built a simple app that demonstrates the issue. Let's quickly look at it.

**View:**

**The View**

```xml
<Page
    x:Class="CompiledBindingTest.MainPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:local="using:CompiledBindingTest"
    xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    mc:Ignorable="d"
    x:Name="root">
    <Grid Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
        <StackPanel>
            <TextBlock>
                <Run Text="'Classic' binding:" />
                <Run Text="{Binding ViewModel.MyTextProperty, ElementName=root}" />
            </TextBlock>
            <TextBlock  Margin="0 50">
                <Run Text="Compiled binding:" />
                <Run Text="{x:Bind ViewModel.MyTextProperty, Mode=OneWay}" />
            </TextBlock>
            <Button Content="ChangeData" Click="Button_Click" />
        </StackPanel>
    </Grid>
</Page>
```

**View's Code-behind**

```csharp
public sealed partial class MainPage : Page
{
    public IMyViewModel ViewModel { get; set; } = new MyViewModel();
    public MainPage()
    {
        this.InitializeComponent();
    }

    private void Button_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.MyTextProperty = DateTime.Now.ToString();
    }
}
```

**IMyViewModel:**

**IMyViewModel**

```csharp
public interface IMyViewModel
{
    string MyTextProperty { get; set; }
}
```

**MyViewModel:**

**MyViewModel**

```csharp
public class MyViewModel : IMyViewModel, INotifyPropertyChanged
{
    string _MyTextProperty;
    public string MyTextProperty
    {
        get
        {
            return _MyTextProperty;
        }

        set
        {
            if(_MyTextProperty != value)
            {
                _MyTextProperty = value;
                OnPropertyChanged();
            }
        }
    }

    public MyViewModel()
    {
        MyTextProperty = DateTime.Now.ToString();
    }

    public void OnPropertyChanged([CallerMemberName]string property = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```

Nothing special about this.

I started debugging my colleague's app and at first sight nothing seemed to be off... Until I stumbled upon this:

![PropertyChanged eventhandler Null](/wp-content/uploads/2016/11/propertychangednull.jpg "PropertyChanged eventhandler Null")

The _PropertyChanged EventHandler_ was null and that's why the changes on the _ViewModel_ aren't being reflected on the _View_!

But why? I did define the binding to be _OneWay_, so I expect the Binding framework to listen to the _PropertyChanged_ event... Well... That's actualy true... But is seems something is telling the Binding framework not listen to the _PropertyChanged_ event.

# INotifyPropertyChanged

Take a closer look again at the code. The type of the _ViewModel_ property on the _View_ is _IMyViewModel_ (the interface). If we would change this type to the concrete type (_MyViewModel_), then we notice that everything works as we would expect.

**Change type of ViewModel to interface**

```csharp
public MyViewModel ViewModel { get; set; } = new MyViewModel();
```

Of course in this sample this wouldn't be a big issue, but in real life we might want to use interfaces and let the _ViewModel_ be injected at runtime.

Let's look again at the _IMyViewModel_. This interface doesn't implement the _INotifyPropertyChanged_ interface! So at compile time, as we are binding to the interface (instead of a concrete implementation), the binding engine doesn't know that the concrete implementation will implement the _INotifyPropertyChanged_ interface. The engine can't generate any code that handles the _PropertyChanged_\-event. And that is exactly the problem in this example!

If we would update our _IMyViewModel_ interface as follows, everything works  as we should expect:

**IMyViewModel implementing INotifyPropertyChanged**

```csharp
public interface IMyViewModel : INotifyPropertyChanged
{
    string MyTextProperty { get; set; }
}
```

# What about 'classic bindings'?

Well, when using 'classic bindings', nothing really happens until runtime. At runtime the binding engine will use some sort of reflection to do the bindings. With compiled bindings -at its name suggests- most of the 'magic' happens at compile time: code is being generated that will do all of the binding stuff 'strongly typed'. And that's why we don't have the above issue when using 'classic bindings', as the binding engine uses reflection at runtime to do the bindings.

# Conclusion

When using compiled bindings and binding to an interface, make sure that not only the concrete implementation implements the _INotifyPropertyChanged_ interface but also that the interface itself implements _INotifyPropertyChanged_.

You can find the source code I've used in the sample on [GitHub](https://github.com/PieEatingNinjas/CompiledBindingsInterfaceTest).
