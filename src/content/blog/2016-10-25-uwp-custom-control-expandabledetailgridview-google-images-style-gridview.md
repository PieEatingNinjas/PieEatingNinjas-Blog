---
title: "UWP Custom Control: ExpandableDetailGridView (Google Images Style GridView)"
description: "'Google Images Style' GridView For one of the upcoming updates of the app I'm currently working on, the designers used a grid that looks a lot like the GridView that Google uses on"
pubDate: "2016-10-25"
legacy: {"id":670,"path":"/2016/10/25/uwp-custom-control-expandabledetailgridview-google-images-style-gridview/","taxonomySlugs":{"categories":["c","uwp","xaml"],"tags":[]}}
categories: ["C#","uwp","xaml"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/ExpandableDetailGridView"]
---

# 'Google Images Style' GridView

For one of the upcoming updates of the app I'm currently working on, the designers used a grid that looks a lot like the GridView that Google uses on it's Images search result page. It's basically some sort of WrapGrid, but when selecting an item, the Grid expands and the selected item is shown on the next row spanning the entire width of the grid. One gif says more than a thousand words (and it is the final result of my custom control):

![ExpandableDetailGridView](/wp-content/uploads/2016/10/ExpandableDetailGridView.webp)

I was suprised about how easy it was to build this control in UWP. First I was thinking about using things like UI Composition and stuff, but then I realised it also COULD be possible by using the standard GridView control (together with the VariableSizedWrapGrid).

The setup of this control is quite simple and straightforward. There is, however, still lots of room for improvements. But more on this later in this blogpost.

Warning: although this control isn't that complex, explaining how everything works together in a blogpost isn't that easy (but I'm going to give it a try). So if you would really want to understand how this control works, I'd recommend to download the source code and walk through it yourself. :-)

# ExpandableDetailGridView

**ExpandableDetailGridView Xaml**

```xml
<GridView x:Name="GridView"
          IsItemClickEnabled="True" 
          HorizontalAlignment="Center"
          HorizontalContentAlignment="Center"
          ItemClick="GridView_ItemClick" 
          SizeChanged="GridView_SizeChanged"
          ItemTemplate="{Binding GridItemTemplate, ElementName=root}">
    <GridView.ItemsPanel>
        <ItemsPanelTemplate>
            <VariableSizedWrapGrid ItemHeight="{Binding ItemHeight, ElementName=root}"
                                   ItemWidth="{Binding ItemWidth, ElementName=root}"
                                   Orientation="Horizontal" />
        </ItemsPanelTemplate>
    </GridView.ItemsPanel>
</GridView>
```

Basically, the control is just a GridView with a VariableSizedWrapGrid as ItemsPanel. I define that the Items in this GridView are clickable and I register an EventHandler for both the ItemClicked and SizeChangedEvent. In the ItemClick eventhandler is where most of the control's logic is situated, I'll dive into this in just a minute. In the SizeChanged eventhandler, I'm going to close the detail view if it were open, so I don't have to recalculate the possition and size of the detail view. The Bindings you see here are Bindings to DependencyProperty Properties that I've put on my ExpandableDetailGridView control.

## Let's take a look at the code-behind

**ExpandableDetailGridView DependencyProperty Properties**

```csharp
public int ItemHeight
{
    get { return (int)GetValue(ItemHeightProperty); }
    set { SetValue(ItemHeightProperty, value); }
}

public static readonly DependencyProperty ItemHeightProperty =
    DependencyProperty.Register("ItemHeight", typeof(int), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(0));


public int ItemWidth
{
    get { return (int)GetValue(ItemWidthProperty); }
    set { SetValue(ItemWidthProperty, value); }
}

public static readonly DependencyProperty ItemWidthProperty =
    DependencyProperty.Register("ItemWidth", typeof(int), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(0));


public int DetailRowSpan
{
    get { return (int)GetValue(DetailRowSpanProperty); }
    set { SetValue(DetailRowSpanProperty, value); }
}

public static readonly DependencyProperty DetailRowSpanProperty =
    DependencyProperty.Register("DetailRowSpan", typeof(int), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(1));

public Brush DetailBackground
{
    get { return (Brush)GetValue(DetailBackgroundProperty); }
    set { SetValue(DetailBackgroundProperty, value); }
}

public static readonly DependencyProperty DetailBackgroundProperty =
    DependencyProperty.Register("DetailBackground", typeof(Brush), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(null));


public IEnumerable Items
{
    get { return (IEnumerable)GetValue(ItemsProperty); }
    set { SetValue(ItemsProperty, value); }
}

public static readonly DependencyProperty ItemsProperty =
    DependencyProperty.Register("Items", typeof(IEnumerable), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(null, OnItemsChanged));

private static void OnItemsChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
{
    ((ExpandableDetailGridView)d).HandleItemsChanged();
}

public bool IsOverviewDataSameAsDetailData
{
    get { return (bool)GetValue(IsOverviewDataSameAsDetailDataProperty); }
    set { SetValue(IsOverviewDataSameAsDetailDataProperty, value); }
}

public static readonly DependencyProperty IsOverviewDataSameAsDetailDataProperty =
    DependencyProperty.Register("IsOverviewDataSameAsDetailData", typeof(bool), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(true));


public object SelectedItem
{
    get { return (object)GetValue(SelectedItemProperty); }
    set { SetValue(SelectedItemProperty, value); }
}

public static readonly DependencyProperty SelectedItemProperty =
    DependencyProperty.Register("SelectedItem", typeof(object), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(null));


public int SelectedIndex
{
    get { return (int)GetValue(SelectedIndexProperty); }
    set { SetValue(SelectedIndexProperty, value); }
}

public static readonly DependencyProperty SelectedIndexProperty =
    DependencyProperty.Register("SelectedIndex", typeof(int), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(-1));


public object DetailItem
{
    get { return (object)GetValue(DetailItemProperty); }
    set { SetValue(DetailItemProperty, value); }
}

public static readonly DependencyProperty DetailItemProperty =
    DependencyProperty.Register("DetailItem", typeof(object), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(null, OnDetailItemChanged));

private static void OnDetailItemChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
{
    ((ExpandableDetailGridView)d).HandleDetailItemChanged();
}

public DataTemplate DetailItemTemplate
{
    get
    {
        return (DataTemplate)GetValue(DetailItemTemplateProperty);
    }
    set { SetValue(DetailItemTemplateProperty, value); }
}

public static readonly DependencyProperty DetailItemTemplateProperty =
    DependencyProperty.Register("DetailItemTemplate", typeof(DataTemplate), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(null));


public DataTemplate GridItemTemplate
{
    get { return (DataTemplate)GetValue(GridItemTemplateProperty); }
    set { SetValue(GridItemTemplateProperty, value); }
}

public static readonly DependencyProperty GridItemTemplateProperty =
    DependencyProperty.Register("GridItemTemplate", typeof(DataTemplate), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(null));


public bool Animate
{
    get { return (bool)GetValue(AnimateProperty); }
    set { SetValue(AnimateProperty, value); }
}

public static readonly DependencyProperty AnimateProperty =
    DependencyProperty.Register("Animate", typeof(bool), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(false));


public DetailGridItem DetailGridItem
{
    get { return (DetailGridItem)GetValue(DetailGridItemProperty); }
    set { SetValue(DetailGridItemProperty, value); }
}

public static readonly DependencyProperty DetailGridItemProperty =
    DependencyProperty.Register("DetailGridItem", typeof(DetailGridItem), 
        typeof(ExpandableDetailGridView), new PropertyMetadata(null));


```

There are some Dependency Properties that I've defined. The purpose of most of these properties should be quite clear. However, I would like to point out some of them. _SelectedItem_ is, as it name suggests, the item that is selected in the grid. _DetailItem_ is the data that is shown in the DetailView. This doesn't have to be of the same type as the objects in the Items list or as the SelectedItem. _IsOverviewDataSameAsDetailData_ when this property is set to 'true', the control will automatically set the DetailItem to the same value as the SelectedItem. However, in some cases you might want to show other data (more details) on the DetailView. In these cases you can set the _IsOverviewDataSameAsDetailData_ flag to 'false' and set the DetailItem yourself when, for example, the SelectedItem changes (you can find an example of both in the Demo project that is included in the sources). Most of the code of the control can be found inside the ItemClick eventhandler:

**ExpandableDetailGridView ItemClick**

```csharp
private async void GridView_ItemClick(object sender, ItemClickEventArgs e)
{
    if (e.ClickedItem != null && e.ClickedItem != SelectedItem)
    {
        var wg = GridView.ItemsPanelRoot as VariableSizedWrapGrid;

        var itemsPerRow = Math.Floor(wg.ActualWidth / wg.ItemWidth);

        var currentIndexOfDetailItem = GridView.Items.IndexOf(DetailGridItem);

        var itemIndex = GridView.Items.IndexOf(e.ClickedItem);

        if (currentIndexOfDetailItem > -1 && currentIndexOfDetailItem < itemIndex)
        {
            itemIndex--;
        }

        var row = Math.Min(((int)(itemIndex / itemsPerRow) + 1) * itemsPerRow, 
            GridView.Items.Count);

        if (DetailGridItem == null)
        {
            DetailGridItem = new DetailGridItem();
            DetailGridItem.DetailItemTemplate = DetailItemTemplate;
            DetailGridItem.Grid = this;

            Binding bgBinding = new Binding();
            bgBinding.Path = new PropertyPath(nameof(DetailBackground));
            bgBinding.Source = this;
            DetailGridItem.SetBinding(DetailGridItem.BackgroundProperty, bgBinding);
        }
        else
        {
            if (currentIndexOfDetailItem != row)
            {
                GridView.Items.Remove(DetailGridItem);

                if (Animate)
                    await Task.Delay(55);
            }
            DetailGridItem.DataContext = null;
        }

        if (IsOverviewDataSameAsDetailData)
        {
            DetailItem = e.ClickedItem;

            //Else = user should do it manualy by listening to the SelectedIndexChanged 
            //or something like that and set the DetailItem manually
        }

        if (!GridView.Items.Contains(DetailGridItem))
        {
            if (row < GridView.Items.Count(i => !(i is DetailGridItem)))
            {
                GridView.Items.Insert((int)row, DetailGridItem);
            }
            else
            {
                GridView.Items.Add(DetailGridItem);
            }
        }

        var itemContainer = GridView.ContainerFromItem(DetailGridItem) as GridViewItem;
        if (itemContainer != null)
        {
            itemContainer.SetValue(VariableSizedWrapGrid.ColumnSpanProperty, itemsPerRow);
            itemContainer.SetValue(VariableSizedWrapGrid.RowSpanProperty, DetailRowSpan);
        }

        SelectedIndex = itemIndex;
        SelectedItem = e.ClickedItem;
        SelectedIndexChanged?.Invoke(this, null);
        SelectedItemChanged?.Invoke(this, null);
    }
}
```

In this method we do some basic calculations on where to put the DetailView inside the GridView, that is on the row below the clicked item. You'll see that there is this odd thing 'if (Animate) await Task.Delay(55);'... Well, I noticed that if I remove the existing DetailItem from the Grid, give the UI some processing time, that there is this nice animation of the DetailView being removed and then re-added to the GridView. We also create a DetailGridItem, which is a wrapper around our DetailItem. This DetailGridItem object looks like this:

**DetailGridItem**

```csharp
public class DetailGridItem : GridViewItem
{
    public DataTemplate DetailItemTemplate
    {
        get { return (DataTemplate)GetValue(DetailItemTemplateProperty); }
        set { SetValue(DetailItemTemplateProperty, value); }
    }

    public static readonly DependencyProperty DetailItemTemplateProperty =
        DependencyProperty.Register("DetailItemTemplate", 
            typeof(DataTemplate), typeof(DetailGridItem), new PropertyMetadata(null));

    public ExpandableDetailGridView Grid { get; set; }

    protected override void OnApplyTemplate()
    {
        base.OnApplyTemplate();
        var button = GetTemplateChild("ButtonHide") as ButtonBase;
        if (button != null)
        {
            button.Tapped += DetailGridItem_Tapped;
        }
    }

    private void DetailGridItem_Tapped(object sender, TappedRoutedEventArgs e)
    {
        Grid.HideDetail();
    }
}
```

The DataContext of this DetailGridItem will be set to the same value as the DetailItem Dependecy Property. We do this as follows when the DetailItem changes on the ExpandableDetailGridView:

```csharp
private void HandleDetailItemChanged()
{
    if (DetailGridItem != null)
        DetailGridItem.DataContext = DetailItem;
}
```

In this object we also hold the Template that should be used on the selected DetailItem and a reference to our ExpandableDetailGridView. On the Template of the DetailGridItem, we can define a button that will hide the DetailView when we click on it.

**DetailGridItem Style**

```xml
<Style TargetType="local:DetailGridItem">
    <Setter Property="Template">
        <Setter.Value>
            <ControlTemplate TargetType="local:DetailGridItem">
                <Grid HorizontalAlignment="Stretch" 
                      VerticalAlignment="Stretch" 
                      Background="{TemplateBinding Background}">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto" />
                    </Grid.ColumnDefinitions>
                    <Grid.RowDefinitions>
                        <RowDefinition Height="Auto" />
                        <RowDefinition Height="*" />
                    </Grid.RowDefinitions>
                    <ContentControl Content="{TemplateBinding DataContext}" 
                                    HorizontalAlignment="Center" 
                                    VerticalAlignment="Center"
                                    HorizontalContentAlignment="Stretch" 
                                    VerticalContentAlignment="Stretch" 
                                    ContentTemplate="{TemplateBinding DetailItemTemplate}" 
                                    Grid.ColumnSpan="2" 
                                    Grid.RowSpan="2"/>
                    <Button Content="X" Grid.Column="1" x:Name="ButtonHide" />
                </Grid>
            </ControlTemplate>
        </Setter.Value>
    </Setter>
</Style>
```

Oh, and one more thing... You see that 'arrow' below the SelectedItem in the Grid? I've done this by giving the GridViewItems in the Grid a custom style, like this:

**Custom GridViewItem Style**

```xml
<Style TargetType="GridViewItem">
    <Setter Property="FontFamily" Value="{ThemeResource ContentControlThemeFontFamily}" />
    <Setter Property="FontSize" Value="{ThemeResource ControlContentThemeFontSize}" />
    <Setter Property="Background" Value="Transparent"/>
    <Setter Property="Foreground" Value="{ThemeResource SystemControlForegroundBaseHighBrush}" />
    <Setter Property="TabNavigation" Value="Local"/>
    <Setter Property="IsHoldingEnabled" Value="True"/>
    <Setter Property="HorizontalContentAlignment" Value="Center"/>
    <Setter Property="VerticalContentAlignment" Value="Center"/>
    <Setter Property="Margin" Value="0,0,4,0"/>
    <Setter Property="Padding" Value="20" />
    <Setter Property="MinWidth" Value="{ThemeResource GridViewItemMinWidth}"/>
    <Setter Property="MinHeight" Value="{ThemeResource GridViewItemMinHeight}"/>
    <Setter Property="Template">
        <Setter.Value>
            <ControlTemplate TargetType="GridViewItem">
                <Grid 
                    x:Name="ContentBorder"
                    Background="{TemplateBinding Background}"
                    BorderBrush="{TemplateBinding BorderBrush}"
                    BorderThickness="{TemplateBinding BorderThickness}">
                    <Grid.RowDefinitions>
                        <RowDefinition Height="*" />
                        <RowDefinition Height="10" />
                    </Grid.RowDefinitions>
                    <VisualStateManager.VisualStateGroups>
                        <VisualStateGroup x:Name="CommonStates">
                            <VisualState x:Name="Normal">
                                <Storyboard>
                                    <PointerUpThemeAnimation Storyboard.TargetName="ContentPresenter" />
                                </Storyboard>
                            </VisualState>
                            <VisualState x:Name="PointerOver">
                                <Storyboard>
                                    <PointerUpThemeAnimation Storyboard.TargetName="ContentPresenter" />
                                </Storyboard>
                            </VisualState>
                            <VisualState x:Name="Pressed">
                                <Storyboard>
                                    <ObjectAnimationUsingKeyFrames BeginTime="00:00:00.25"
                                                                       Storyboard.TargetName="CheckedArrow" 
                                                                       Storyboard.TargetProperty="Visibility">
                                        <DiscreteObjectKeyFrame KeyTime="0" Value="Visible" />
                                    </ObjectAnimationUsingKeyFrames>
                                    <PointerDownThemeAnimation TargetName="ContentPresenter" />
                                </Storyboard>
                            </VisualState>
                            <VisualState x:Name="Selected">
                                <Storyboard>
                                    <ObjectAnimationUsingKeyFrames BeginTime="00:00:00.25"
                                                                       Storyboard.TargetName="CheckedArrow" 
                                                                       Storyboard.TargetProperty="Visibility">
                                        <DiscreteObjectKeyFrame KeyTime="0" Value="Visible" />
                                    </ObjectAnimationUsingKeyFrames>
                                    <PointerUpThemeAnimation Storyboard.TargetName="ContentPresenter" />
                                </Storyboard>
                            </VisualState>
                            <VisualState x:Name="PointerOverSelected">
                                <Storyboard>
                                    <ObjectAnimationUsingKeyFrames BeginTime="00:00:00.25"
                                                                       Storyboard.TargetName="CheckedArrow" 
                                                                       Storyboard.TargetProperty="Visibility">
                                        <DiscreteObjectKeyFrame KeyTime="0" Value="Visible" />
                                    </ObjectAnimationUsingKeyFrames>
                                    <PointerUpThemeAnimation Storyboard.TargetName="ContentPresenter" />
                                </Storyboard>
                            </VisualState>
                        </VisualStateGroup>

                    </VisualStateManager.VisualStateGroups>
                    <ContentPresenter x:Name="ContentPresenter"
                                  ContentTransitions="{TemplateBinding ContentTransitions}"
                                  HorizontalAlignment="{TemplateBinding HorizontalContentAlignment}"
                                  VerticalAlignment="{TemplateBinding VerticalContentAlignment}" />
                    <Grid Grid.Row="1" x:Name="CheckedArrow" Visibility="Collapsed">
                        <Canvas Width="20" Height="10">
                            <Polygon Points="10,0 20,10, 0,10" Stroke="{Binding DetailBackground, ElementName=root}" 
                                     Fill="{Binding DetailBackground, ElementName=root}" />
                        </Canvas>
                    </Grid>
                </Grid>
            </ControlTemplate>
        </Setter.Value>
    </Setter>
</Style>
```

And that's all there is to it! We can now easily use this control as follows:

**MainPage**

```xml
<Page.Resources>
    <DataTemplate x:Key="GridItemTemplate">
        <Grid Width="250" Height="250" Background="{Binding BackgroundBrush}">
            <TextBlock Text="{Binding Title}"/>
        </Grid>
    </DataTemplate>
    <DataTemplate x:Key="DetailTemplate">
        <Grid Width="450" Height="450" Background="{Binding BackgroundBrush}" 
              VerticalAlignment="Center" HorizontalAlignment="Center">
            <TextBlock Text="{Binding Title}" VerticalAlignment="Stretch" HorizontalAlignment="Stretch"/>
        </Grid>
    </DataTemplate>
</Page.Resources>
<Grid Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
    <local:ExpandableDetailGridView 
        Items="{x:Bind TestItems, Mode=OneWay}"
        DetailRowSpan="2"
        ItemHeight="250"
        ItemWidth="250" 
        DetailItem="{x:Bind DetailItem, Mode=OneWay}"
        DetailItemTemplate="{StaticResource DetailTemplate}"
        GridItemTemplate="{StaticResource GridItemTemplate}" 
        IsOverviewDataSameAsDetailData="True"
        DetailBackground="Orange"
        Animate="True"
        SelectedItemChanged="ExpandableDetailGridView_SelectedIndexChanged"/>
</Grid>
```

 

# Final thoughts

Yes, I know, this Control is far from finished. It works but there are some things that need to be improved like for example: ~\* setting an ObservableCollection as Items property on the ExpandableDetailGridView will not work yet as expected as I currently don't listen to the CollectionChanged events~ ~\* setting the SelectedIndex/SelectedItem on the ExpandableDetailGridView will also not work~ \* the events on the ExpandableDetailGridView should be improved \* ... Never the less, I think for basic scenarios this control works. Below you'll find a link to the GitHub repo with all the source code and I'll try to improve the control over time. If you would have any remarks, questions or suggestions, please don't  hesitate to drop a commend below!

# Links

[GitHub - ExpandableDetailGridView](https://github.com/PieEatingNinjas/ExpandableDetailGridView)
