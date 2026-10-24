---
title: "Trigger PropertyChanged of indexed property in Xamarin Forms"
description: "Xamarin Forms supports binding to indexed properties. But do you know how to trigger a PropertyChanged event on such a property so that the binding engine gets the updated value? B"
pubDate: "2017-04-20"
legacy: {"id":879,"path":"/2017/04/20/trigger-propertychanged-of-indexed-property-in-xamarin-forms/","taxonomySlugs":{"categories":["c","mvvm","xamarin","xaml"],"tags":[]}}
categories: ["C#","mvvm","xamarin","xaml"]
tags: []
---

Xamarin Forms supports binding to indexed properties. But do you know how to trigger a PropertyChanged event on such a property so that the binding engine gets the updated value?

# Binding to indexed properties

Binding to an indexed property in Xamarin Forms is simple. Imagine my ViewModel has an indexed property:

```csharp
Dictionary<string, string> Data { get; } = new Dictionary<string, string>()
{
    { "123", "Pie" },
    { "456", "Eating" },
    { "789", "Ninjas" }
};
public string this[string id]
{
    get
    {
        return Data[id];
    }
}
```

I can simply bind to it using the following syntax: `<Label Text="{Binding [123]}" />`  where 123 is the index I pass to the property.

# Notifying the UI

If I now update the underlying data collection (for example: `Data["123"] = "Ninjas";` ), my UI won't be notified about this change. However, I can notify my UI by triggering the PropertyChanged event, passing '**Item**' as property name:

```csharp
PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Item"));
```

You can also use the following syntax if you only want to notify the UI about **one particular** element that has changed:

```csharp
PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Item[123]"));
```

Easy, right? You just have to know it... ;-)

If you want to try it our yourself, here is the complete code:

**MainPage.xaml**

```vb
<ContentPage xmlns="http://xamarin.com/schemas/2014/forms"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:local="clr-namespace:App7"
             x:Class="App7.MainPage">
    <StackLayout>
        <Label Text="{Binding [123]}" />
        <Label Text="{Binding [456]}" />
        <Label Text="{Binding [789]}" />
        <Button Text="Update" Command="{Binding UpdateCommand}" />
        <Button Text="Trigger" Command="{Binding TriggerUpdateCommand}" />
    </StackLayout>
</ContentPage>
```

**MainPage.xaml.cs**

```csharp
public partial class MainPage : ContentPage
{
    public MainPage()
    {
        this.BindingContext = new MainPageViewModel();
        InitializeComponent();
    }
}
```

**MainPageViewModel.cs**

```csharp
public class MainPageViewModel : INotifyPropertyChanged
{
    Dictionary<string, string> Data { get; } = new Dictionary<string, string>()
    {
        { "123", "Pie" },
        { "456", "Eating" },
        { "789", "Ninjas" }
    };
    public string this[string id]
    {
        get
        {
            return Data[id];
        }
    }

    public ICommand UpdateCommand { get; private set; }
    public ICommand TriggerUpdateCommand { get; private set; }

    public MainPageViewModel()
    {
        UpdateCommand = new Command(OnUpdate);
        TriggerUpdateCommand = new Command(OnTrigger);
    }

    private void OnUpdate(object obj)
    {
        Data["123"] = "Ninjas";
        Data["789"] = "Pie";
    }

    private void OnTrigger(object obj)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("Item"));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```
