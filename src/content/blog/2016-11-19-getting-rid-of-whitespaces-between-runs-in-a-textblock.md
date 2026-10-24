---
title: "Getting rid of whitespaces between Runs in a TextBlock"
description: "The problem When we use Runs in a TextBlock in XAML, we can get these annoying whitespaces between the Runs in our application. For example, this XAML... ... produces this in our A"
pubDate: "2016-11-19"
legacy: {"id":721,"path":"/2016/11/19/getting-rid-of-whitespaces-between-runs-in-a-textblock/","taxonomySlugs":{"categories":["c","uwp","xaml"],"tags":[]}}
categories: ["C#","uwp","xaml"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/RemoveEmptyRuns"]
---

# The problem

When we use Runs in a TextBlock in XAML, we can get these annoying whitespaces between the Runs in our application. For example, this XAML...

**XAML**

```xml
<TextBlock>
    <Run Text="123" />
    <Run Text="456" />
    <Run Text="789" />
</TextBlock>
```

... produces this in our App...

[![Output - Whitespaces](/wp-content/uploads/2016/11/output.jpg)](/wp-content/uploads/2016/11/output.jpg)

You see these whitespaces in between? I know you do! If you look at the Visual Tree, you'll see that there are more Runs in the TextBlock than those that I put in XAML:

[![TextBlock Inlines](/wp-content/uploads/2016/11/liveproperties.jpg)](/wp-content/uploads/2016/11/liveproperties.jpg)

# What kind of sorcery is this?

Did you know that the following XAML will also perfectly work?

```xml
<TextBlock>
    <Run Text="123" />
    foo
    <Run Text="456" />
    bar
    <Run Text="789" />
</TextBlock>
```

This would output something like this: "123 foo 456 bar 789".

Once you know that and you know how XAML processes whitespaces (there is [an article on MSDN](https://msdn.microsoft.com/en-us/library/ms788746.aspx)  about this). It should become clear why the previous result had these extra Runs with only a whitespace between my Runs.

If I'd write the following (without whitespaces between my Runs), I wouldn't see these extra Runs in my App:

**Runs right after each other**

```xml
<TextBlock>
    <Run Text="123" /><Run Text="456" /><Run Text="789" />
</TextBlock>
```

This would put "123456789" on my screen, without any whitespace between them, because there is no whitespace in XAML either.

But for readability and stuff I'd really like to put Runs under each other....

# An Attached Property to the rescue

I've written an Attached Property that provides a fix for this kind of behavior.

## Usage

**Using RemoveEmptyRuns Attached Property**

```xml
<TextBlock local:TextBlockExtension.RemoveEmptyRuns="True">
    <Run Text="123" />
    <Run Text="456" />
    <Run Text="789" />
    <Run Text=" " local:TextBlockExtension.PreserveSpace="True" />
    <Run Text="foo" />
    <Run Text="bar" />
</TextBlock>
```

This would result in something like this: "123456789 foobar" (notice the space between the numbers and 'foobar', which I explicitly defined in XAML).

## How it works

I've created two Attached Properties to make this work. The first one it the RemoveEmptyRuns attached property which can be defined on a TextBlock. When this is set to 'true', at runtime, when the TextBlock is loaded, I'm going to remove all Runs that are empty of have a whitespace from the TextBlock's Inlines collection:

**TextBlock loaded event**

```csharp
private static void Tb_Loaded(object sender, RoutedEventArgs e)
{
    var tb = sender as TextBlock;
    tb.Loaded -= Tb_Loaded;

   var spaces = tb.Inlines.Where(a => a is Run 
        && ((Run)a).Text == " "
        && !GetPreserveSpace(a)).ToList();
    spaces.ForEach(s => tb.Inlines.Remove(s));
}
```

In the above code you'll see this 'GetPreserveSpace' thing which I call. Well, that's the second Attached Property I've built. This PreserveSpace attached property can be used on a Run to identify that the programmer has intentionally added this Run (with only a whitespace) to the TextBlock. That way I prevent throwing away spaces that were added on purpose to the TextBlock.

**UPDATE** I updated my code. I used to check the following:

```csharp
 && string.IsNullOrWhiteSpace(((Run)a).Text)
```

But this check is not OK! If the TextProperty of a particular Run is bound to a property of my ViewModel for example, then it's value can be "" (empty string)  if the data was not yet bound. Causing the Run to be removed from the Inlines of my TextBlock. That's why I now only explicitly check on a whitespace instead of String.IsNullOrWhiteSpace:

```csharp
&& ((Run)a).Text == " "
```

## More code

This is the entire code of the two Attached Properties:

**Entire code of the Attached Properties**

```csharp
public class TextBlockExtension
{
    public static bool GetRemoveEmptyRuns(DependencyObject obj)
    {
        return (bool)obj.GetValue(RemoveEmptyRunsProperty);
    }

    public static void SetRemoveEmptyRuns(DependencyObject obj, bool value)
    {
        obj.SetValue(RemoveEmptyRunsProperty, value);

        if (value)
        {
            var tb = obj as TextBlock;
            if (tb != null)
            {
                tb.Loaded += Tb_Loaded;
            }
            else
            {
                throw new NotSupportedException();
            }
        }
    }

    public static readonly DependencyProperty RemoveEmptyRunsProperty =
        DependencyProperty.RegisterAttached("RemoveEmptyRuns", typeof(bool), 
            typeof(TextBlock), new PropertyMetadata(false));



    public static bool GetPreserveSpace(DependencyObject obj)
    {
        return (bool)obj.GetValue(PreserveSpaceProperty);
    }

    public static void SetPreserveSpace(DependencyObject obj, bool value)
    {
        obj.SetValue(PreserveSpaceProperty, value);
    }

    public static readonly DependencyProperty PreserveSpaceProperty =
        DependencyProperty.RegisterAttached("PreserveSpace", typeof(bool), 
            typeof(Run), new PropertyMetadata(false));


    private static void Tb_Loaded(object sender, RoutedEventArgs e)
    {
        var tb = sender as TextBlock;
        tb.Loaded -= Tb_Loaded;

       var spaces = tb.Inlines.Where(a => a is Run 
            && ((Run)a).Text == " "
            && !GetPreserveSpace(a)).ToList();
        spaces.ForEach(s => tb.Inlines.Remove(s));
    }
}
```

You can find everything, as usual, on [GitHub](https://github.com/PieEatingNinjas/RemoveEmptyRuns)!
