---
title: "Font Awesome Duotone icons in .NET MAUI and Xamarin.Forms"
description: "In almost all of my mobile apps, I use Font Awesome to display icons. It's a huge library and it's super easy to use in .NET MAUI and Xamarin.Forms. You can even use the 'Duotone' "
pubDate: "2022-12-13"
legacy: {"id":1870,"path":"/2022/12/13/fontawesome-duotone-icons-in-maui-and-xamarin-forms/","taxonomySlugs":{"categories":["c","maui","xamarin","xaml"],"tags":[]}}
categories: ["C#","maui","xamarin","xaml"]
tags: []
heroImage: "/wp-content/uploads/2022/12/xmas.png"
---

In almost all of my mobile apps, I use [Font Awesome](https://fontawesome.com/) to display icons. It's a huge library and it's super easy to use in .NET MAUI and Xamarin.Forms.

You can even use the 'Duotone' icons which have 2 colors and which look extra nice and can give some depth to your icons (when using nicer colors then I use in this example ;-) ). Let me show you how!

# Using Font Awesome icons in Xamarin.Forms

To use Font Awesome in your Xamarin Forms project, download the Font Awesome font file (otf) and add it to your project:

![](/wp-content/uploads/2022/12/AddFont.png)

Set the file's Build Action to 'Embedded Resource':

![](/wp-content/uploads/2022/12/EmbeddedResource.png)

Next, we need to open the AssemblyInfo.cs file and add the following line of code:

```csharp
[assembly: ExportFont("Font Awesome 6 Pro-Regular-400.otf", Alias = "FontAwesome")]
```

The first parameter of this ExportFont attribute is the _fontFileName_ and refers to the font file we want to use (make sure the spelling is exact!). With the Alias property, we can define a short-hand notation that we can use in code to refer to this font.

As soon as all of this is in place, we can start using this font. The only thing we have to do is setting the FontFamily of a label to whatever Alias we've defined in the ExportFont attribute and set the Text value of the label to the name of the icon you want to show on the screen:

```xml
<Label FontFamily="FontAwesome" Text="rocket-launch" FontSize="25"/>
```

And just like that, you have an awesome icon in your app:

![](/wp-content/uploads/2022/12/Icon.png)

# Using Font Awesome icons in .NET MAUI

Using Font Awesome in .NET MAUI is almost identical to using it in Xamarin.Forms. As with forms, you need to add the otf file to you project and set the Build Action to 'Embedded Resource'.

The next step is a little different. Instead of fiddling in some obscure AssemblyInfo.cs file and using some magic attributes, we can just open our MauiProgram.cs file and add our font via the ConfigureFonts methond of the MauiAppBuilder class:

```csharp
public static MauiApp CreateMauiApp()
{
    var builder = MauiApp.CreateBuilder();
    builder
        .UseMauiApp<App>()
        .ConfigureFonts(fonts =>
        {
            fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
            fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            fonts.AddFont("Font Awesome 6 Pro-Regular-400.otf", "FontAwesome");
        });

    return builder.Build();
}
```

Once that is in place, we can use this font just like we did in Xamarin.Forms:

```xml
<Label FontFamily="FontAwesome" Text="rocket-launch" FontSize="25"/>
```

# Using Font Awesome Duotone icons in .NET MAUI and Xamarin.Forms

[Duotone Icons](https://fontawesome.com/docs/web/style/duotone) are special icons that can have two different colors. Each icon consists of 2 layers. The [documentation of Font Awesome](https://fontawesome.com/docs/desktop/add-icons/ligatures#duotones-and-ligatures) states that we can access each layer of such a Duotone icon by adding a '#' to the icon's name to get the first layer and '##' to get the second.

Let's try this out! First we need to add the special Duotone otf font file to our project, set its Build Action to 'Embedded Resource' and register it to be used in our app (with the ExportFont attribute in XF or ConfigureFonts in MAUI).

```csharp
//XF
[assembly: ExportFont("Font Awesome 6 Duotone-Solid-900.otf", Alias = "FontAwesomeDuo")]

//MAUI
fonts.AddFont("Font Awesome 6 Duotone-Solid-900.otf", "FontAwesomeDuo");
```

Next, we can render a label on screen that uses this Duotone font:

```xml
<StackLayout HorizontalOptions="Center" VerticalOptions="Center">
    <Label FontFamily="FontAwesomeDuo" Text="rocket-launch" FontSize="25" TextColor="HotPink" />
    <Label FontFamily="FontAwesomeDuo" Text="rocket-launch#" FontSize="25" TextColor="Blue" />
    <Label FontFamily="FontAwesomeDuo" Text="rocket-launch##" FontSize="25" TextColor="Orange" />
</StackLayout>
```

The result:

![](/wp-content/uploads/2022/12/IconLayers.png)

See how the first label ("rocket-launch") renders the entire icon, the second one ("rocket-launch#") renders the first layer and the third one ("rocket-launch##") the second layer.

If we would place the last two labels on top of each other, it would appear as 1 single icon in 2 colors:

```xml
<Grid HorizontalOptions="Center" VerticalOptions="Center">
    <Label FontFamily="FontAwesomeDuo" Text="rocket-launch#" FontSize="25" TextColor="Blue" />
    <Label FontFamily="FontAwesomeDuo" Text="rocket-launch##" FontSize="25" TextColor="Orange" />
</Grid>
```

![](/wp-content/uploads/2022/12/DuotoneIcon.png)

Looking awesome, right?

# Let's put it in a control!

We can now also easily create a DuotoneIcon control that we can use in our MAUI/XF apps to show such a Duotone icon in two colors. It basically is a grid with two labels on top of each other. Each label has its own color and each label shows an other layer of the requested icon:

```csharp
public class DuoToneIcon : Grid
{
    static readonly Color defaultLayer1Color = Colors.White;
    static readonly Color defaultLayer2Color = Colors.Black;
    static readonly double defaultIconSize = 8d;

    private Label layer1;
    private Label layer2;

    public Color Layer1Color
    {
        get => (Color)GetValue(Layer1ColorProperty);
        set => SetValue(Layer1ColorProperty, value);
    }
    public static readonly BindableProperty Layer1ColorProperty =
        BindableProperty.Create(nameof(Layer1Color), typeof(Color),
            typeof(DuoToneIcon), defaultLayer1Color,
            propertyChanged: OnLayer1ColorPropertyChanged);

    private static void OnLayer1ColorPropertyChanged(BindableObject bindable, object oldValue, object newValue)
        => ((DuoToneIcon)bindable).UpdateLayer1Color((Color)newValue);

    public Color Layer2Color
    {
        get => (Color)GetValue(Layer2ColorProperty);
        set => SetValue(Layer2ColorProperty, value);
    }

    public static readonly BindableProperty Layer2ColorProperty =
        BindableProperty.Create(nameof(Layer2Color), typeof(Color),
            typeof(DuoToneIcon), defaultLayer2Color,
            propertyChanged: OnLayer2ColorPropertyChanged);

    private static void OnLayer2ColorPropertyChanged(BindableObject bindable, object oldValue, object newValue)
        => ((DuoToneIcon)bindable).UpdateLayer2Color((Color)newValue);

    public double IconSize
    {
        get => (double)GetValue(IconSizeProperty);
        set => SetValue(IconSizeProperty, value);
    }

    public static readonly BindableProperty IconSizeProperty =
        BindableProperty.Create(nameof(IconSize), typeof(double),
            typeof(DuoToneIcon), defaultIconSize,
            propertyChanged: OnIconSizePropertyChanged);

    private static void OnIconSizePropertyChanged(BindableObject bindable, object oldValue, object newValue)
        => ((DuoToneIcon)bindable).UpdateIconSize((double)newValue);

    public string Icon
    {
        get => (string)GetValue(IconProperty);
        set => SetValue(IconProperty, value);
    }

    public static readonly BindableProperty IconProperty =
        BindableProperty.Create(nameof(Icon), typeof(string),
            typeof(DuoToneIcon), string.Empty,
            propertyChanged: OnIconPropertyChanged);

    private static void OnIconPropertyChanged(BindableObject bindable, object oldValue, object newValue)
        => ((DuoToneIcon)bindable).UpdateIcon(newValue?.ToString() ?? "");

    private void UpdateIconSize(double iconSize)
    {
        layer1.FontSize = iconSize;
        layer2.FontSize = iconSize;
    }

    private void UpdateIcon(string icon)
    {
        layer1.Text = $"{icon}#";
        layer2.Text = $"{icon}##";
    }

    private void UpdateLayer1Color(Color c)
        => layer1.TextColor = c;

    private void UpdateLayer2Color(Color c)
        => layer2.TextColor = c;

    public string FontFamily
    {
        get => layer1.FontFamily;
        set
        {
            layer1.FontFamily = value;
            layer2.FontFamily = value;
        }
    }

    public DuoToneIcon()
    {
        layer1 = GetLabel();
        layer2 = GetLabel();

        UpdateLayer1Color(defaultLayer1Color);
        UpdateLayer2Color(defaultLayer2Color);

        Children.Add(layer1);
        Children.Add(layer2);
    }

    private Label GetLabel()
    => new()
    {
        HorizontalOptions = LayoutOptions.Fill,
        VerticalOptions = LayoutOptions.Fill,
        HorizontalTextAlignment = TextAlignment.Center,
        VerticalTextAlignment = TextAlignment.Center,
        FontSize = defaultIconSize,
        BackgroundColor = Colors.Transparent
    };
}
```

We can use this control to easily show Duotone icons in our app:

```xml
<local:DuoToneIcon FontFamily="FontAwesomeDuo" BackgroundColor="Transparent"
               Icon="lights-holiday" IconSize="150" 
               WidthRequest="200" 
               Layer1Color="Green" 
               Layer2Color="Red" />
<local:DuoToneIcon FontFamily="FontAwesomeDuo" BackgroundColor="Transparent"
               Icon="tree-decorated" IconSize="150" 
               WidthRequest="200" 
               Layer1Color="Red" 
               Layer2Color="Green" />
<local:DuoToneIcon FontFamily="FontAwesomeDuo" BackgroundColor="Transparent"
               Icon="mistletoe" IconSize="150" 
               WidthRequest="200"
               Layer1Color="Red" 
               Layer2Color="Green" />
<local:DuoToneIcon FontFamily="FontAwesomeDuo" BackgroundColor="Transparent"
               Icon="ornament" IconSize="150" 
               WidthRequest="200"
               Layer1Color="Green" 
               Layer2Color="Red" />
```

What a nice result! 8-)

![](/wp-content/uploads/2022/12/xmas.png)
