---
title: "Dynamically binding RESX Resources in Xamarin Forms"
description: "Localizing your app isn't the most fun thing to do. In the last couple of years I've seen and tried various ways of implementing multi language support. In this blogpost I would li"
pubDate: "2017-05-20"
legacy: {"id":901,"path":"/2017/05/20/dynamically-binding-resx-resources-in-xamarin-forms/","taxonomySlugs":{"categories":["c","localization","mvvm","uwp","xamarin","xaml"],"tags":[]}}
categories: ["C#","localization","mvvm","uwp","xamarin","xaml"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/XamarinFormsLocalization"]
---

Localizing your app isn't the most fun thing to do. In the last couple of years I've seen and tried various ways of implementing multi language support.

In this blogpost I would like to share how I recently set up localization in a Xamarin Froms app. With this approach, I am able to bind to items in a RESX Resource file dynamically. What do I mean with dynamically? Well, as soon as the user changes his preferred language in the app, the value of all bound resource items are instantly updated to the value of the chosen langue.

If you don't know what RESX resource files are, I recommend you quickly go through this: [Localizing Xamarin.Forms Apps with RESX Resource Files](https://developer.xamarin.com/guides/xamarin-forms/advanced/localization/).

# Let's take a look at dynamically binding RESX Resources

It is very simple! Not only the implementation itself, but also the usage of it. I've created a class `LocalizedResources`  that looks like this:

**LocalizedResources**

```csharp
public class LocalizedResources : INotifyPropertyChanged
{
    const string DEFAULT_LANGUAGE = "en";

    readonly ResourceManager ResourceManager;
    CultureInfo CurrentCultureInfo;

    public string this[string key]
    {
        get
        {
            return ResourceManager.GetString(key, CurrentCultureInfo);
        }
    }

    public LocalizedResources(Type resource, string language = null) 
        : this(resource, new CultureInfo(language ?? DEFAULT_LANGUAGE))
    {  }

    public LocalizedResources(Type resource, CultureInfo cultureInfo)
    {
        CurrentCultureInfo = cultureInfo;
        ResourceManager = new ResourceManager(resource);

        MessagingCenter.Subscribe<object, CultureChangedMessage>(this, 
            string.Empty, OnCultureChanged);
    }

    private void OnCultureChanged(object s, CultureChangedMessage ccm)
    {
        CurrentCultureInfo = ccm.NewCultureInfo;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Item"));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```

The first thing to point out, is the `ResourceManager` field. This class can be used to look up culture-specific resources. In other words, if I have all my culture specific resources in place, I can use this class to retrieve a string for a particular culture. Let's say I have some resource files and I want to get the French value of a particular key, I could do the following:

**ResourceManager example**

```csharp
ResourceManager = new ResourceManager(resource);
ResourceManager.GetString("welcomelabel", new CultureInfo("FR"));
```

The resource that I pass into to constructor of the `ResourceManager` is a `Type`. It is the type from which the resource manager derives all information for finding the correct resource. More information can be found on [Micrososft Docs](https://docs.microsoft.com/en-us/dotnet/api/system.resources.resourcemanager?view=netframework-4.7).

Back to my `LocalizedResources` class. Now that we know what the `ResourceManager` can do, it should be clear in the above code that we use the `CurrentCultureInfo` field to retrieve culture-specific resources from my RESX Resource files. We do this in the class' indexed property:

**Indexed property**

```csharp
public string this[string key]
{
    get
    {
        return ResourceManager.GetString(key, CurrentCultureInfo);
    }
}
```

This is the glue between my Resources and my UI! In Xamarin forms we can bind to indexed properties. Whatever value we put between the square brackets in our Binding statement in XAML is passed as key in our indexed property.

One more thing: in my `LocalizedResources` class, I subscribe to a Message `CultureChangedMessage`.  When this message is sent, I will set the `CurrentCultureInfo` field and trigger a `PropertyChanged` event, passing "item" as `PropertyName` (see my [previous blogpost](/2017/04/20/trigger-propertychanged-of-indexed-property-in-xamarin-forms/ "Trigger PropertyChanged of indexed property in Xamarin Forms")). All bindings on the index property are re-executed, resulting in getting the resource values of the newly set CultureInfo.

The only thing left to do is adding an instance of the `LocalizedResources` class to a ViewModel.

**ViewModelBase**

```csharp
public class ViewModelBase : INotifyPropertyChanged
{
    public LocalizedResources Resources
    {
        get;
        private set;
    }

    public ViewModelBase()
    {
       Resources = new LocalizedResources(typeof(LocalizationDemoResources));
    }

    public void OnPropertyChanged([CallerMemberName]string property =  null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```

So at a high level, it all comes down to this:

![Binding Resources overview](/wp-content/uploads/2017/05/Binding-Resources.png "Binding Resources overview")

# Example

This sample app has two views: Main and Settings. On the Settings view, users are able to change their language. The labels in the app will be updated instantly.

**ViewModelBase**

```csharp
public class ViewModelBase : INotifyPropertyChanged
{
    public LocalizedResources Resources
    {
        get;
        private set;
    }

    public ViewModelBase()
    {
       Resources = new LocalizedResources(typeof(LocalizationDemoResources), App.CurrentLanguage);
    }

    public void OnPropertyChanged([CallerMemberName]string property =  null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```

**MainPage**

```xml
<ContentPage xmlns="http://xamarin.com/schemas/2014/forms"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:local="clr-namespace:LocalizationDemo"
             x:Class="LocalizationDemo.MainPage">
    <StackLayout>
        <Label Text="{Binding Resources[Welcome]}" 
           VerticalOptions="Center" 
           HorizontalOptions="Center" />
        <Button Text="{Binding Resources[Settings]}" 
                HorizontalOptions="Center"
                Clicked="Button_Clicked" />
    </StackLayout>
</ContentPage>
```

**MainPage code-behind**

```csharp
public partial class MainPage : ContentPage
{
    public MainPage()
    {
        this.BindingContext = new MainPageViewModel();
        InitializeComponent();
    }

    private void Button_Clicked(object sender, EventArgs e)
    {
        Navigation.PushAsync(new SettingsPage());
    }
}
```

(MainPageViewModel only inherits ViewModelPage, there is nothing special to show there)

**SettingsPage**

```xml
<ContentPage xmlns="http://xamarin.com/schemas/2014/forms"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             x:Class="LocalizationDemo.SettingsPage"
             Title="{Binding Resources[Settings]}">
    <StackLayout>
        <Label Text="{Binding Resources[PickLng]}" />
        <Picker ItemsSource="{Binding Languages}" SelectedItem="{Binding SelectedLanguage, Mode=TwoWay}" />
    </StackLayout>
</ContentPage>
```

**SettingsPage code-behind**

```csharp
public partial class SettingsPage : ContentPage
{
    public SettingsPage()
    {
        BindingContext = new SettingsViewModel();
        InitializeComponent();
    }
}
```

**SettingsPageViewModel**

```csharp
public class SettingsViewModel : ViewModelBase
{
    public List<string> Languages { get; set; } = new List<string>()
    {
        "EN",
        "NL",
        "FR"
    };

    private string _SelectedLanguage;

    public string SelectedLanguage
    {
        get { return _SelectedLanguage; }
        set
        {
            _SelectedLanguage = value;
            SetLanguage();
        }
    }

    public SettingsViewModel()
    {
        _SelectedLanguage = App.CurrentLanguage;
    }

    private void SetLanguage()
    {
        App.CurrentLanguage = SelectedLanguage;
        MessagingCenter.Send<object, CultureChangedMessage>(this,
                string.Empty, new CultureChangedMessage(SelectedLanguage);
    }
}
```

Full source-code can be found on my [GitHub](https://github.com/PieEatingNinjas/XamarinFormsLocalization).

**Remarks**: of course this is a bit of a naïve implementation as I just keep a `CurrentLanguage` field on the `App` class. This demo is just to show you how easy it is to implement localization of your app this way. If you want to do a 'full' implementation of localization, I would like to refer back to this [guide on the Xamarin website](https://developer.xamarin.com/guides/xamarin-forms/advanced/localization/) and take a look at the `ILocalize`  interface and the implementations of it. Using that abstraction works great together with my solution of localization.

If you have any remarks or questions, please feel free to drop a comment below!
