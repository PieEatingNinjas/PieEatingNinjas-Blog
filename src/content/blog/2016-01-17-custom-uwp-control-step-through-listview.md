---
title: "Custom UWP Control: Step-Through ListView"
description: "Designers tend to come up 'crazy' (not standard!) ideas about the looks and the behavior of UI elements. Especially when you are building a UWP app and those designers have no expe"
pubDate: "2016-01-17"
legacy: {"id":451,"path":"/2016/01/17/custom-uwp-control-step-through-listview/","taxonomySlugs":{"categories":["c","uwp","xaml"],"tags":[]}}
categories: ["C#","uwp","xaml"]
tags: []
---

Designers tend to come up 'crazy' (not standard!) ideas about the looks and the behavior of UI elements. Especially when you are building a UWP app and those designers have no experience in this platform (no offence).

A short time ago we received a design that somewhat looked like this:

![Step-Through ListView](/wp-content/uploads/2016/01/Design.png "Step-Through ListView") The Custom Control

After some discussions with the design team, we came to the conclusion that this was a 'standard' ListView with the following limitations/features:

-   not scrollable with touch or mouse
-   Up/Down buttons to 'step through' the list (disabled when respectively at begin or at end of list)
-   the size of a step should be the height of the list (when possible)
-   The selected item should always be aligned in the center of the control (when possible)

So, we started to build this 'Step-Through ListView' control.

# The XAML part

As a reference, this is how we would like to use our control once it is finished:

```xml
<local:StepThroughListView Height="300" Width="400"
    HorizontalAlignment="Center" VerticalAlignment="Stretch"
    ItemsSource="{Binding Items, Mode=OneWay, ElementName=root}" 
    SelectedItem="{Binding SelectedString, Mode=TwoWay, ElementName=root}"
    UpButtonText="{Binding UpText, ElementName=root}"
    DownButtonText="{Binding DownText, ElementName=root}" />
```

We built this control as a UserControl. We could have also built it as a TemplatedControl, but as the Template of the control remains the same throughout our entire app, we simply put it in a UserControl. Moreover, whenever I create a new control, I always prototype it as a UserControl. When I'm happy with the result and the control should be easily Templateble, than I refactor my UserControl and make it a TemplatedControl.

Back to our Step-Through ListView... The XAML of this UserControl is quite simple. We only need 2 Buttons (in this case, we used HyperLink buttons as they are the closest to our final design) and 1 ListView. We place these controls in a Grid. The rows for the buttons get an auto height (the row will be just as heigh as the height of the content inside it) as where the ListView gets a \* height so it can fill up all the remaining space.

```xml
<Grid Height="{Binding Height, ElementName=root}" 
      Width="{Binding Width, ElementName=root}">
    <Grid.RowDefinitions>
        <RowDefinition Height="Auto" />
        <RowDefinition Height="*" />
        <RowDefinition Height="Auto" />
    </Grid.RowDefinitions>
    <VisualStateManager.VisualStateGroups>
            <!-- -->
    </VisualStateManager.VisualStateGroups>
    <HyperlinkButton x:Name="UpButton" Tapped="Up_Tapped"
                     Content="{x:Bind UpButtonText, Mode=OneWay}" />

    <ListView x:Name="ListView" Grid.Row="1" HorizontalAlignment="Stretch"
        ItemsSource="{Binding ItemsSource, ElementName=root}" 
        SelectedItem="{x:Bind SelectedItem, Mode=TwoWay}"
        ScrollViewer.VerticalScrollBarVisibility="Hidden"
        ScrollViewer.VerticalScrollMode="Disabled"
        Loaded="ListView_Loaded" 
        Unloaded="ListView_Unloaded"
        SelectionChanged="ListView_SelectionChanged"/>
    
    <HyperlinkButton x:Name="DownButton" Tapped="Down_Tapped" Grid.Row="2" 
                     Content="{x:Bind DownButtonText, Mode=OneWay}" />
</Grid>
```

In our XAML we also have some Visual States. These states will be used to control the appearance of our Up and Down button (enabled/disabled).

```xml
<VisualStateManager.VisualStateGroups>
    <VisualStateGroup x:Name="UpButtonState">
        <VisualState x:Name="UpButtonDisabled">
            <VisualState.Setters>
                <Setter Target="UpButton.IsEnabled" Value="false" />
            </VisualState.Setters>
        </VisualState>
        <VisualState x:Name="UpButtonEnabled">
            <VisualState.Setters>
                <Setter Target="UpButton.IsEnabled" Value="true" />
            </VisualState.Setters>
        </VisualState>
    </VisualStateGroup>
    <VisualStateGroup x:Name="DownButtonState">
        <VisualState x:Name="DownButtonDisabled">
            <VisualState.Setters>
                <Setter Target="DownButton.IsEnabled" Value="false" />
            </VisualState.Setters>
        </VisualState>
        <VisualState x:Name="DownButtonEnabled">
            <VisualState.Setters>
                <Setter Target="DownButton.IsEnabled" Value="true" />
            </VisualState.Setters>
        </VisualState>
    </VisualStateGroup>
</VisualStateManager.VisualStateGroups>
```

The Content of our Up and Down Button is bound to respectively UpButtonContent and DownButtonContent, both Dependency Properties on our UserControl. As they are Dependency Properties, they can be set through Binding on our UserControl. If these properties were 'classic' CLR Properties, we could only set their value directly in XAML, not through Binding. Both buttons also have a Tapped event we'll be listening to in order to step through our list. More on this later. That's everything about our Buttons in XAML, let's take a closer look at the ListView:

```xml
<ListView x:Name="ListView" Grid.Row="1" HorizontalAlignment="Stretch"
    ItemsSource="{Binding ItemsSource, ElementName=root}" 
    SelectedItem="{x:Bind SelectedItem, Mode=TwoWay}"
    ScrollViewer.VerticalScrollBarVisibility="Hidden"
    ScrollViewer.VerticalScrollMode="Disabled"
    Loaded="ListView_Loaded" 
    Unloaded="ListView_Unloaded"
    SelectionChanged="ListView_SelectionChanged"/>
```

 The ItemsSource of our ListView is bound to an ItemsSource property (IEnumerable) on our UserControl. This is also a Dependency Property for the exact same reason as above: it is bindable. The SelectedItem property is also bound to a property on the control: SelectedItem of type object. Again, a Dependency property. Mind that we bind this 'TwoWay'. This means that not only when the value of the SelectedItem property on the UserControl changes, it is reflected to the SelectedItem of the ListView. But also when the SelectedItem changes on the ListView (through user interaction), the value of the SelectedItem property on our UserControl changes as well. This means that both SelectedItem properties are always in sync. And that is exactly what we want.

Next we see two ScrollViewer Attached Properties. With these properties we can control the behavior of the ScrollViewer inside the ListView. We set the VerticalScrollBarVisibility to Hidden, so that the VerticalScrollBar won't be rendered. Don't set it to Disabled as this will entirely disable vertical scrolling of the ListView, even from code. The other ScrollViewer Attached Property, VerticalScrollMode, is set to Disabled so that the user can't manually scroll the ListView by using mouse or touch. We are also interested in the Loaded, Unloaded and SelectionChanged event of the ListView, so we bind EventHandlers to these events.

# The C#part

In our code behind, we have our Dependency Properties that I mentioned earlier. No rocket sience about these...

```csharp
public IEnumerable ItemsSource
{
    get { return (IEnumerable)GetValue(ItemsSourceProperty); }
    set { SetValue(ItemsSourceProperty, value); RaisePropertyChanged(); }
}

public static readonly DependencyProperty ItemsSourceProperty =
    DependencyProperty.Register(nameof(ItemsSource), typeof(IEnumerable), 
        typeof(StepThroughListView), new PropertyMetadata(DependencyProperty.UnsetValue));

public object SelectedItem
{
    get { return GetValue(SelectedItemProperty); }
    set
    {
        if (SelectedItem != value)
        {
            SetValue(SelectedItemProperty, value);
            RaisePropertyChanged();
        }
    }
}

public static readonly DependencyProperty SelectedItemProperty =
    DependencyProperty.Register(nameof(SelectedItem), typeof(object), 
        typeof(StepThroughListView), new PropertyMetadata(DependencyProperty.UnsetValue));

public string UpButtonText
{
    get { return (string)GetValue(UpButtonTextProperty); }
    set { SetValue(UpButtonTextProperty, value); RaisePropertyChanged(); }
}

public static readonly DependencyProperty UpButtonTextProperty =
    DependencyProperty.Register(nameof(UpButtonText), typeof(string), 
        typeof(StepThroughListView), new PropertyMetadata("Up"));

public string DownButtonText
{
    get { return (string)GetValue(DownButtonTextProperty); }
    set { SetValue(DownButtonTextProperty, value); RaisePropertyChanged(); }
}

public static readonly DependencyProperty DownButtonTextProperty =
    DependencyProperty.Register(nameof(DownButtonText), typeof(string), 
        typeof(StepThroughListView), new PropertyMetadata("Down"));
```

Remember at the end of the previous part that Loaded event of our ListView we defined an EventHandler for? Let's take a look at that. Much logic of this UserControl relies on the scrolling offset of the ScrollViewer inside our ListView. So we need to get a hold on that ScrollViewer. I've got this static method 'GetVisualChild' that I use in many UWP projects.

```csharp
static T GetVisualChild<T>(DependencyObject parent) where T : DependencyObject
{
    T child = default(T);
    int numVisuals = VisualTreeHelper.GetChildrenCount(parent);
    for (int i = 0; i < numVisuals; i++)
    {
        DependencyObject v = VisualTreeHelper.GetChild(parent, i);
        child = v as T;
        if (child == null)
            child = GetVisualChild<T>(v);
        if (child != null)
            break;
    }
    return child;
}
```

This method recursively walks down the children of a given control and looks for the first child whose type matches the given Type argument.

So in this case we want to use this method to look for the ScrollViewer inside our ListView. Once we have this element, we want to keep a reference to it.

```csharp
private void ListView_Loaded(object sender, RoutedEventArgs e)
{
    _InternalListScrollViewer = GetVisualChild<ScrollViewer>((DependencyObject)sender);

    //
}
```

Now that we've got the Scrollviewer, we can listen for whenever the VerticallOffset or the ScrollableHeight of this control changes because on these events we want to calculate the visibility of our Up and Down button. To do so, we can use the RegisterPropertyChangedCallback method to which we pass in the Dependency Property we are interested in and the callback that needs to be invoked. This method returns a token that we need whenever we want to Unregister this callback.

```csharp
private void ListView_Loaded(object sender, RoutedEventArgs e)
{
    _InternalListScrollViewer = GetVisualChild<ScrollViewer>((DependencyObject)sender);

    VerticalOffsetPropertyCallbackToken = 
        _InternalListScrollViewer.RegisterPropertyChangedCallback(
            ScrollViewer.VerticalOffsetProperty, OnVerticalOffsetChanged);
    ScrollableHeightPropertyCallbackToken = 
        _InternalListScrollViewer.RegisterPropertyChangedCallback(
            ScrollViewer.ScrollableHeightProperty, OnVerticalOffsetChanged);
}

private void ListView_Unloaded(object sender, RoutedEventArgs e)
{
    if(_InternalListScrollViewer != null)
    {
        _InternalListScrollViewer.UnregisterPropertyChangedCallback(
            ScrollViewer.VerticalOffsetProperty, VerticalOffsetPropertyCallbackToken);
        _InternalListScrollViewer.UnregisterPropertyChangedCallback(
            ScrollViewer.ScrollableHeightProperty, ScrollableHeightPropertyCallbackToken);
    }
}
```

In the SetUpAndDownButton method that gets called through these callback, we will calculate the visibility of the Up and Down button. This is quite simple:

are we at the top of the Scrollviewer? Then the UpButton is invisible. To check to visibility of the DownButton, we need to see if the VerticalOffset plus the height of the list itself is less than the height of the scrollable content of the list.

```csharp
void SetUpAndDownButtons()
{
    if (_InternalListScrollViewer.VerticalOffset == 0) //vertical offset 0 => at the top of the scrollviewer
        VisualStateManager.GoToState(this, nameof(UpButtonDisabled), false);
    else
        VisualStateManager.GoToState(this, nameof(UpButtonEnabled), false);
       

    if (_InternalListScrollViewer.VerticalOffset + 
        _InternalListScrollViewer.ActualHeight < _InternalListScrollViewer.ExtentHeight)
        VisualStateManager.GoToState(this, nameof(DownButtonEnabled), false);
    else
        VisualStateManager.GoToState(this, nameof(DownButtonDisabled), false);
}

```

The state of the Up and Down buttons is controlled through the VisualStateManager. In the above code we just say to load a particular state. It is declared in XAML how the buttons should 'look' in a given state.

The last thing we need to do for our buttons is handle their Tapped event, so that whenever they get tapped, the list scrolls up or down its entire height:

```csharp
private void Down_Tapped(object sender, TappedRoutedEventArgs e)
{
    ScrollListVertical(shouldScrollDow: true);
}

private void Up_Tapped(object sender, TappedRoutedEventArgs e)
{
    ScrollListVertical(shouldScrollDow: false);
}

private void ScrollListVertical(bool shouldScrollDow)
{
    var height = ListView.ActualHeight;

    if (!shouldScrollDow)
        height *= -1;

    _InternalListScrollViewer.ScrollToVerticalOffset(
        _InternalListScrollViewer.VerticalOffset + height);
}
```

And that's that! We are almost there! The only thing we still need to do is to make sure the selected item is aligned in the center of the ListView. My AlignSelectedItem method takes care of this:

```csharp
private void AlignSelectedItem()
{
    var index = ListView.SelectedIndex;
    double? itemHeight = 
        ((FrameworkElement)ListView.ContainerFromIndex(index))?.ActualHeight;

    if (itemHeight.HasValue)
    {
        var itemsInView = _InternalListScrollViewer.ActualHeight / itemHeight.Value;
        var topOffset = (itemsInView - 1) * itemHeight.Value / 2;

        _InternalListScrollViewer.ScrollToVerticalOffset(
            (index * itemHeight.Value) - topOffset);
    }
    else if(index != -1)
    {
        //There is an item selected in the ListView, but it isn't rendered yet.
        //Hook up to ChoosingItemContainer event to try again...
        ListView.ChoosingItemContainer += ListView_ChoosingItemContainer;
    }
}
```

This method calculates to the vertical offset to scroll to so that the selected item in right in the center. In this method I look up the height of the element that is selected. I need this height to do my calculation. Now, it is perfectly possible that the SelectedItem is set, but the items in the ListView aren't rendered yet. In that case, I hook up to the ChoosingItemContainer event and try again. This AlignSelectedItem method gets called whenever the user selects an item in the ListView, so on the SelectionChanged event, and whenever the size of my control changes. And with this, we have our entire Step-Through ListView control!

# Thoughts

The end-result is in fact a simple and basic control, but I think it can fit in a lot of scenarios especially if you do some minor adjustments. For example, in this scenario, we disable our Up and Down button when needed, but you can perfectly change the Visual States and set them to Visibility Collapsed if you want. Ideally this controls should be a TemplatedControl so that you can change the ControlTemplate easily to fit your scenario. That's maybe something for a next blogpost ...

# Links

The Code can be downloaded [here](https://onedrive.live.com/redir?resid=85775D95712237D5!133052&authkey=!APo5Qg_Z9MiDWYE&ithint=folder%2czip "Step-Through ListView Sample")
