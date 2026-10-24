---
title: "Simple data validation in Xamarin Forms"
description: "In this post I would like to share how I've implemented user input data validation in Xamarin Forms. Over the years I've tried a few approaches, some with success, others without. "
pubDate: "2019-07-27"
legacy: {"id":1491,"path":"/2019/07/27/simple-data-validation-in-xamarin-forms/","taxonomySlugs":{"categories":["android","c","cross-platform","ios","uwp","xamarin","xaml"],"tags":[]}}
categories: ["C#","android","cross-platform","ios","uwp","xamarin","xaml"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/SimpleDataValidator"]
---

In this post I would like to share how I've implemented user input data validation in Xamarin Forms.

Over the years I've tried a few approaches, some with success, others without. This one is an implementation I've used in my latest projects and that I'm liking a lot. I'm not saying this is THE best way of doing data validation, but I think it is an elegant way (both in code AND in XAML) of doing it. It works for me, so I would like to share it with you. One of the things I really like about this solution is that I'm having some default UI right out of the box, but I can easily customize the look and feel of the controls per project, as I will show you throughout this post.

**Note**: For the sake of this blogpost, I've left out some non-vital parts, but the full source code can be found on [GitHub](https://github.com/PieEatingNinjas/SimpleDataValidator "SimpleDataValidator on GitHub"). And if you have any questions, don't hesitate to contact me (comments, mail, twitter,...)

This blog post is part of the Xamarin UI July organised by [Steven Thewissen](https://twitter.com/devnl). Be sure to check out all other posts of [Xamarin UI July](https://www.thewissen.io/introducing-xamarin-ui-july/)!

![](/wp-content/uploads/2019/07/uijuly.png) Xamarin UI July

# What I think is important for Data Validation

To me, one of the hardest things with data validation is getting an error message on to the screen. Why? Well, because of a couple of reasons:

-   Because of UX reasons, I would like to display a message right at the control where the inputted data is not OK so that user undoubtebly knows where to correct it.
-   Error messages should be localized, don't they?
-   Also because of "I'm a lazy developer" reasons, I want to define where and how to display these error messages in an easy, concise and reusable manner in my XAML, whilst keeping my XAML clean.
-   Notwithstanding having the ability to be very flexible and not being tight to 'only one way of doing it'. Maybe, on a particular screen, I don't want the error message right next to input control, but instead I want to show a summary of error messages.

And of top of that, I don't want to make the data validation complex. You want to focus on the business or validation logic rather then needing to focus on tying everything up in your ViewModel, right? We don't want to clutter our ViewModel, we just want to have our validation logic there in a clean way.

# Let's take a look at my approach

## Implementing the validation

One of the core parts of my solution is the ErrorStateManager. Basically, this is a very simple class that has a Dictionary which holds the errors per property. It has methods for clearing all errors, adding an error and it also has an indexed property. With this indexed property, you can pass in the name of a property and it will return the errors on that property (if any).

```csharp
public class ErrorStateManager : INotifyPropertyChanged
{
    Dictionary<string, ErrorState> states = new Dictionary<string, ErrorState>();

    public event PropertyChangedEventHandler PropertyChanged;

    public void Add(string key, string description)
    {
        if (states.ContainsKey(key))
        {
            if (!states[key].Messages.Contains(description))
            {
                states[key].Append(description);
                NotifyMessagesChanged();
            }
        }
        else
        {
            states.Add(key, new ErrorState(description));
            NotifyErrorStateCollectionChanged();
            NotifyMessagesChanged();
        }
    }

    public void Clear()
    {
        states = new Dictionary<string, ErrorState>();
        NotifyErrorStateCollectionChanged();
        NotifyMessagesChanged();
    }

    public void Clear(string propertyName)
    {
        if (states.ContainsKey(propertyName))
        {
            states.Remove(propertyName);
            NotifyErrorStateCollectionChanged();
            NotifyMessagesChanged();
        }
    }


    public ErrorState this[string key]
    {
        get
        {
            if (states.ContainsKey(key))
            {
                return states[key];
            }
            return null;
        }
    }

    public IReadOnlyList<string> AllMessages
    {
        get
        {
            return states.SelectMany(s => s.Value.Messages).ToList().AsReadOnly();
        }
    }

    public bool HasError
    {
        get => states.Any();
    }

    internal void Remove(string propertyName, string message)
    {
        if (states.ContainsKey(propertyName) && states[propertyName].Messages.Contains(message))
        {
            states[propertyName].Remove(message);
            NotifyMessagesChanged();

            if (!states[propertyName].HasError)
                Clear(propertyName);
        }
    }

    private void NotifyMessagesChanged()
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(AllMessages)));

    private void NotifyErrorStateCollectionChanged()
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Item"));
}
```

Next to my ErrorStateManager object, I've also have an ErrorState object. It holds error/violation messages that belong to one property. This is how this looks like:

```csharp
public class ErrorState : INotifyPropertyChanged
{
    public IReadOnlyCollection<string> Messages { get; private set; }
    readonly List<string> messages;

    public ErrorState()
    {
        messages = new List<string>();
        Messages = messages.AsReadOnly();
    }

    public ErrorState(string message)
    {
        messages = new List<string>
        {
            message
        };
        Messages = messages.AsReadOnly();
        UpdateHasError();
    }

    public void Append(string message)
    {
        messages.Add(message);
        Messages = messages.AsReadOnly();
        RaisePropertyChanged(nameof(Messages));
        UpdateHasError();
    }

    private void UpdateHasError()
        => HasError = messages?.Any() ?? false;

    bool _hasError;
    public bool HasError
    {
        get => _hasError;
        set
        {
            if (_hasError != value)
            {
                _hasError = value;
                RaisePropertyChanged();
            }
        }
    }

    public void RaisePropertyChanged([CallerMemberName]string property = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));

    public event PropertyChangedEventHandler PropertyChanged;

    internal void Remove(string message)
    {
        if (messages.Contains(message))
        {
            messages.Remove(message);
            Messages = messages.AsReadOnly();
            RaisePropertyChanged(nameof(Messages));
            UpdateHasError();
        }
    }
}
```

Let's go one level up: to the ViewModel I created a base ViewModel which contains an ErrorStateManager and which holds a collection of Validators. This base ViewModel takes responsability for executing Validators and updating the ErrorStateManager.

```csharp
public abstract class ValidationViewModelBase : INotifyPropertyChanged
{
    public ErrorStateManager ErrorStateManager { get; }
    public IEnumerable<IValidator> Validators { get; protected set; } = new List<IValidator>();

    public ValidationViewModelBase()
    {
        ErrorStateManager = new ErrorStateManager();
    }

    public virtual void ValidateAll()
    {
        ErrorStateManager.Clear();

        Validate(Validators);
    }

    public virtual void Validate([CallerMemberName]string propertyName = null)
    {
        var existingErrorMessages = ErrorStateManager[propertyName]?.Messages;

        Validate(Validators
            .Where(v => v.PropertyName == propertyName));
    }

    private void Validate(IEnumerable<IValidator> validators)
    {
        foreach (var validator in validators)
            Validate(validator);
    }

    private void Validate(IValidator validator)
    {
        if (!validator.Validate())
            ErrorStateManager.Add(validator.PropertyName, validator.Message);
        else
            ErrorStateManager.Remove(validator.PropertyName, validator.Message);
    }

    public event PropertyChangedEventHandler PropertyChanged;

    public void RaisePropertyChanged([CallerMemberName]string property = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));
}
```

About these Validators. There are always validations and rules that come back in each project: checking for not null, regex checking, ... just to name a few. I wanted to be able to have a standard set of validation rules that I could easily re-use in multiple projects, as well as having the ability to create dedicated (business) rules for a particular project. Hence, I created the IValidator interface and the ValidatorBase classes to back these needs. This gives me all flexibility of having standard and reusable validators as well as being able to create custom validation rules in an elegant way.

```csharp
public MainPageViewModel()
{
    Validators = new List<IValidator>()
    {
        new StringNotNullOrEmptyValidator(nameof(Input), () => Input, "Value cannot be null or empty"),
        new ValidatorBase(nameof(Input), InputShouldBeInterger, "Value should be a valid number"),
        new ValidatorBase(nameof(Input2), InputsShouldBeDifferent, "Value should not be the same as the previous one"),
        new RegexValidator(nameof(Input3), () => Input3, @"^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$", "Not a valid email address")
    };
}
```

This all results, IMHO, in clean ViewModels that allow me to do simple validation. Take a look at how my MainPageViewModel looks, which does (multiple) validations on 3 inputs.

```csharp
public class MainPageViewModel : ValidationViewModelBase
{
    private string _input;

    public string Input
    {
        get { return _input; }
        set
        {
            _input = value;
            RaisePropertyChanged();
            Validate();
            Validate(nameof(Input2));
        }
    }

    private string _input2;

    public string Input2
    {
        get { return _input2; }
        set
        {
            _input2 = value;
            RaisePropertyChanged();
            Validate();
        }
    }

    private string _input3;

    public string Input3
    {
        get { return _input3; }
        set
        {
            _input3 = value;
            RaisePropertyChanged();
            Validate();
        }
    }

    private bool _showValidationSummary;

    public bool ShowValidationSummary
    {
        get { return _showValidationSummary; }
        set { _showValidationSummary = value; RaisePropertyChanged(); }
    }


    ICommand _submitCommand;
    public ICommand SubmitCommand
    {
        get => _submitCommand ?? (_submitCommand = new Command(ValidateAndSave));
    }

    public MainPageViewModel()
    {
        Validators = new List<IValidator>()
        {
            new StringNotNullOrEmptyValidator(nameof(Input), () => Input, "Value cannot be null or empty"),
            new ValidatorBase(nameof(Input), InputShouldBeInterger, "Value should be a valid number"),
            new ValidatorBase(nameof(Input2), InputsShouldBeDifferent, "Value should not be the same as the previous one"),
            new RegexValidator(nameof(Input3), () => Input3, @"^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$", "Not a valid email address")
        };
    }

    private void ValidateAndSave(object obj)
    {
        ValidateAll();
        if (ErrorStateManager.HasError)
        {
            ShowValidationSummary = true;
        }
        else
        {
            ShowValidationSummary = false;
        }
    }

    private bool InputsShouldBeDifferent()
        => Input != Input2;

    private bool InputShouldBeInterger()
        => int.TryParse(Input, out int _);
}
```

## How do I get this on my screen?

Simple! Recall the fact that my ViewModels now have an ErrorStateManager. This class has an indexed property to which I can pass a string (name of the property, or basically anything you want) to get the associated ErrorState back which holds a list of errors/violations. Like this:

```xml
<Entry Text="{Binding Input, Mode=TwoWay}" />
<validator:ErrorView ErrorState="{Binding ErrorStateManager[Input]}" />
<Entry Text="{Binding Input2, Mode=TwoWay}" />
<validator:ErrorView ErrorState="{Binding ErrorStateManager[Input2]}" />
```

As you can see in the snippet above, I created this custom ErrorView. It is used to show one particular ErrorState. Remember, that is errormessages/violations for a particular key (==property name). This control has a BindableProperty 'ErrorState' to which we can bind. How does the XAML of this control looks like?

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ContentView xmlns="http://xamarin.com/schemas/2014/forms" 
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:d="http://xamarin.com/schemas/2014/forms/design"
             xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
             mc:Ignorable="d"
             x:Class="SimpleInputDataValidator.ErrorView"
             IsVisible="{Binding ErrorState.HasError, Source={x:Reference root}, FallbackValue=false}">
</ContentView>
```

```csharp
public partial class ErrorView : ContentView
{
    public static readonly BindableProperty ErrorStateProperty =
        BindableProperty.Create(nameof(ErrorState), typeof(ErrorState),
            typeof(ErrorView), null, BindingMode.OneWay,
            null, null, null, null, null);


    public ErrorState ErrorState
    {
        get { return (ErrorState)GetValue(ErrorStateProperty); }
        set
        {
            SetValue(ErrorStateProperty, value);
        }
    }

    public ErrorView()
    {
        InitializeComponent();
    }
}
```

In the code behind, you can see I've created a BindableProperty so that I'm able to bind a particular ErrorState object to this Control.

But, nothing in XAML? Well, that is because I define the look of the control through a ControlTemplate. Why? Combination of laziness and flexibility is the answer! I have a default template defined in my SimpleDataValidator project, which I can use without any effort.

```xml
<ResourceDictionary xmlns="http://xamarin.com/schemas/2014/forms"
                    xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
                    xmlns:local="clr-namespace:SimpleInputDataValidator"
                    x:Class="SimpleInputDataValidator.DefaultTemplates">
    <ControlTemplate x:Key="DefaultErrorViewTemplate">
        <Grid IsVisible="{TemplateBinding ErrorState.HasError}">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="auto" />
                <ColumnDefinition Width="*" />
            </Grid.ColumnDefinitions>
            <Grid WidthRequest="2" HorizontalOptions="Fill" Margin="1, 2" BackgroundColor="Red" />
            <StackLayout Grid.Column="1" BindableLayout.ItemsSource="{TemplateBinding ErrorState.Messages}">
                <BindableLayout.ItemTemplate>
                    <DataTemplate>
                        <Label Text="{Binding}" FontSize="Micro" TextColor="Red" />
                    </DataTemplate>
                </BindableLayout.ItemTemplate>
            </StackLayout>
        </Grid>
    </ControlTemplate>
    <Style TargetType="local:ErrorView">
        <Setter Property="ControlTemplate" Value="{StaticResource DefaultErrorViewTemplate}" />
    </Style>
</ResourceDictionary>
```

In my projects in which I use my DataValidation, I'll have to make sure I merge the ResourceDictionary of the SimpleDataValidator project, containing my default templates, with the ResourceDictionary of my project.

```xml
<Application.Resources>
    <ResourceDictionary>
        <ResourceDictionary MergedWith="DataInputValidator:DefaultTemplates"/>
    </ResourceDictionary>
</Application.Resources>
```

Next to my ErrorView, I also have a ErrorSummaryView. The whole ErrorStateManager is bound to this control so we can easily access all errors and violations for that particular view. Just like with the ErrorView, I'm using ControlTemplates to visualize this control, having a default template in the SimpleDataValidator project.

```xml
<?xml version="1.0" encoding="utf-8" ?>
<ResourceDictionary xmlns="http://xamarin.com/schemas/2014/forms"
                    xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
                    xmlns:local="clr-namespace:SimpleInputDataValidator"
                    x:Class="SimpleInputDataValidator.DefaultTemplates">
    <ControlTemplate x:Key="DefaultErrorSummaryTemplate">
        <StackLayout BindableLayout.ItemsSource="{TemplateBinding ErrorStateManager.AllMessages}">
            <BindableLayout.ItemTemplate>
                <DataTemplate>
                    <Label Text="{Binding}" FontSize="Micro" TextColor="Red" />
                </DataTemplate>
            </BindableLayout.ItemTemplate>
        </StackLayout>
    </ControlTemplate>
    <Style TargetType="local:ErrorSummaryView">
        <Setter Property="ControlTemplate" Value="{StaticResource DefaultErrorSummaryTemplate}" />
    </Style>
</ResourceDictionary>
```

This is what the ErrorView looks like by default:

![](/wp-content/uploads/2019/07/validationDefault.webp)

# Customizing the ErrorView

However, for particular projects, my validation errors might need to be displayed in a different way. In that case I can define my own ControlTemplate, apply it via a Style and do whatever I want with it. I found this nice Lottie animation that I would like to embed in my ErrorView: [https://lottiefiles.com/3541-error](https://lottiefiles.com/3541-error "Lottiefiles - Error")

![Lottie-Error animation](/wp-content/uploads/2019/07/3541.webp)

I downloaded the json file and referenced the 'Com.Airbnb.Xamarin.Forms.Lottie' NuGet Package which allows me to show Lottie animations. Next, I added the Lottie json file to my head projects and created my ControlTemplate with the AnimationView inside of it:

```xml
<ControlTemplate x:Key="CustomErrorViewTemplate">
    <Grid>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="Auto" />
            <ColumnDefinition Width="*" />
        </Grid.ColumnDefinitions>
        <lottie:AnimationView 
            x:Name="AnimationView"
            Grid.Row="0" Scale="8" 
            Animation="3541-error.json"  
            VerticalOptions="Center" Speed="1"
            Loop="false"
            IsPlaying="{TemplateBinding ErrorState.HasError}"
            HeightRequest="30" WidthRequest="30" 
            IsVisible="{TemplateBinding ErrorState.HasError, Mode=OneWay}">
        </lottie:AnimationView>
        <StackLayout Grid.Column="1" VerticalOptions="Center" IsVisible="True"
                     BindableLayout.ItemsSource="{TemplateBinding ErrorState.Messages}">
            <BindableLayout.ItemTemplate>
                <DataTemplate>
                    <Label Text="{Binding}" FontSize="Small" TextColor="Red" />
                </DataTemplate>
            </BindableLayout.ItemTemplate>
        </StackLayout>
    </Grid>
</ControlTemplate>
```

As you can see, I'm binding the ErrorState.HasError to the IsPlaying property of the AnimationView. This will cause the ANimation to start as soon as the HasError property returns 'true'.

There was just one thing bugging me... I didn't like the first part of the Lottie animation, the 'loading' part. The AnimationView has a method PlayProgressSegment that can be used to specify from where to where the animation needs to be played (where 0 is the start of the animation and 1 the end). Calling `PlayProgressSegment(.5f, 1f);` would play the animation from the half of the animation till the end.

What would be the easiest way configure this in a dynamic way in the ControlTemplate?

## Attached Properties to the rescue

I created a bunch of Attached Properties which should help me achieving this. 1 property would take a float representing from where the animation should start, and other one, also a float, to where the animation should run. The third property, a bool, should start the animation.

```csharp
public class AnimationViewPlayAt
{
    public static readonly BindableProperty PlayAtProgressToProperty =
        BindableProperty.CreateAttached("PlayAtProgressTo", typeof(float), typeof(AnimationView), 1f, propertyChanged: OnPlayAtProgressToChanged);

    private static void OnPlayAtProgressToChanged(BindableObject bindable, object oldValue, object newValue)
    {
        SetPlayAtProgressTo(bindable, (float)newValue);
    }

    public static float GetPlayAtProgressTo(BindableObject view)
    {
        return (float)view.GetValue(PlayAtProgressToProperty);
    }

    public static void SetPlayAtProgressTo(BindableObject view, float value)
    {
        view.SetValue(PlayAtProgressToProperty, value);
    }


    public static readonly BindableProperty PlayAtProgressFromProperty =
        BindableProperty.CreateAttached("PlayAtProgressFrom", typeof(float), typeof(AnimationView), 0f, propertyChanged: OnPlayAtProgressFromChanged);

    private static void OnPlayAtProgressFromChanged(BindableObject bindable, object oldValue, object newValue)
    {
        SetPlayAtProgressFrom(bindable, (float)newValue);
    }

    public static float GetPlayAtProgressFrom(BindableObject view)
    {
        return (float)view.GetValue(PlayAtProgressFromProperty);
    }

    public static void SetPlayAtProgressFrom(BindableObject view, float value)
    {
        view.SetValue(PlayAtProgressFromProperty, value);
    }


    public static readonly BindableProperty StartPlayAtProgressSegmentProperty =
        BindableProperty.CreateAttached("StartPlayAtProgressSegment", typeof(bool), typeof(AnimationView), false, propertyChanged: OnStartPlayAtProgressSegmentChanged);

    private static void OnStartPlayAtProgressSegmentChanged(BindableObject bindable, object oldValue, object newValue)
    {
        SetStartPlayAtProgressSegment(bindable, (bool)newValue);
    }

    public static bool GetStartPlayAtProgressSegment(BindableObject view)
    {
        return (bool)view.GetValue(StartPlayAtProgressSegmentProperty);
    }

    public static void SetStartPlayAtProgressSegment(BindableObject view, bool value)
    {
        view.SetValue(StartPlayAtProgressSegmentProperty, value);

        if(value)
            (view as AnimationView).PlayProgressSegment(
                GetPlayAtProgressFrom(view),
                GetPlayAtProgressTo(view));
    }
}
```

As you can see, when the StartPlayAtProgress property is set to true, the PlayProgressSegment method is called, passing in the offsets that are defined.

Once this is in place, we can configure everything in XAML like this:

```csharp
<lottie:AnimationView 
    x:Name="AnimationView"
    Grid.Row="0" Scale="8" 
    Animation="3541-error.json"  
    VerticalOptions="Center" Speed="1"
    Loop="false"
    local:AnimationViewPlayAt.StartPlayAtProgressSegment="{TemplateBinding ErrorState.HasError, Mode=TwoWay}"
    local:AnimationViewPlayAt.PlayAtProgressFrom=".5"
    local:AnimationViewPlayAt.PlayAtProgressTo="1"
    HeightRequest="30" WidthRequest="30" 
    IsVisible="{TemplateBinding ErrorState.HasError, Mode=OneWay}">
</lottie:AnimationView>
```

The final result looks something like this:

![](/wp-content/uploads/2019/07/validation.webp)

That's it folks! With this blogpost I've shown you how I'm doing validation in my most recent projects. I think it is an elegant and simple way of doing this kind of stuff, but still being very flexible both on the code/viewmodel side as well as on the UI part of the story.

Moreover, I elaborated a bit on how to customize the ErrorView to suite special needs/specs. I showed how I've created Attached Properties to start Lottie animations going from and to a particular process segment.

You can find all the source code on [GitHub](https://github.com/PieEatingNinjas/SimpleDataValidator "SimpleDataValidator on GitHub")!

I'd love to hear about your suggestions or remarks on this!
