---
title: "Creating a HyperlinkLabel in Xamarin Forms"
description: "I needed a simple control that could show a hyperlink inline with other text and I'd like the link to be defined in markdown. In short, something like this: HyperlinkLabel In Xamar"
pubDate: "2017-11-05"
legacy: {"id":990,"path":"/2017/11/05/creating-a-hyperlinklabel-in-xamarin-forms/","taxonomySlugs":{"categories":["c","uwp","xamarin"],"tags":[]}}
categories: ["C#","uwp","xamarin"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/HyperlinkLabel"]
---

I needed a simple control that could show a hyperlink inline with other text and I'd like the link to be defined in markdown. In short, something like this:

![HyperlinkLabel](/wp-content/uploads/2017/11/HyperlinkLabel.jpg)

# HyperlinkLabel

In Xamarin.Forms, I created a `HyperlinkLabel` class which isn't anything more than a class inheriting from the standard `Label` with an additional bindable property `RawText`. It also has a method `GetText`  that parses the `RawText`  property using a RegexExpression. The method returns the text that eventually will get displayed (without the markdown). Through the out parameter, this method returns all info we need about all the links in the text: the text of the link, the url and the index where this link is positioned in the Text.

**HyperlinkLabel**

```csharp
public class HyperlinkLabel : Label
{
    public string RawText
    {
        get => (string)GetValue(RawTextProperty);
        set => SetValue(RawTextProperty, value);
    }

    public static readonly BindableProperty RawTextProperty =
        BindableProperty.Create(nameof(RawText), typeof(string), typeof(HyperlinkLabel), null);

    public string GetText(out List<HyperlinkLabelLink> links)
    {
        links = new List<HyperlinkLabelLink>();
        if (RawText == null)
            return null;

        string pattern = @"\[([^]]*)\]\(([^\s^\)]*)\)";

        var linksInText = Regex.Matches(RawText, pattern, RegexOptions.IgnoreCase);

        string Text = RawText;

        for (int i = 0; i < linksInText.Count; i++)
        {
            string fullMatch = linksInText[i].Groups[0].Value;
            string text = linksInText[i].Groups[1].Value;
            string link = linksInText[i].Groups[2].Value;

            int start = Text.IndexOf(fullMatch);

            if (start > -1)
            {
                Text =
                    $"{Text.Substring(0, start)}{text}{Text.Substring(start + fullMatch.Length)}";
                links.Add(new HyperlinkLabelLink(text, link, start));
            }
        }
        return Text;
    }
}
```

**HyperlinkLabelLink**

```csharp
public class HyperlinkLabelLink
{
    internal HyperlinkLabelLink(string text, string link, int start)
    {
        Text = text;
        Link = link;
        Start = start;
    }

    public string Text { get; }
    public string Link { get; }
    public int Start { get; }
}
```

# iOS

In order to get this in iOS, we both need a custom control and a Renderer.

## HyperlinkUIView

A `UITextView` in iOS is able to render inline links, through the usage of a `NSAttributedString`. A `NSAttributedString` is a string with attributes... (Who would have thought that :-)). These attributes can define, for a particular range, all sorts of stuff like the font, color, ... and whether a piece of text is a link. But a UITextView also has some standard behavior that I don't want like the text being selectable. That's why I created a custom control HyperlinkUIView that inherits from UITextView and overrides these behaviors. It also automatically sets its size to the size of the text.

**HyperlinkUIView**

```csharp
public class HyperlinkUIView : UITextView
{
    public HyperlinkUIView()
    {
        Selectable = true;
        Editable = false;
        BackgroundColor = UIColor.Clear;
    }

    public override bool CanBecomeFirstResponder => false;

    public override bool GestureRecognizerShouldBegin(UIGestureRecognizer gestureRecognizer)
    {
        //Preventing standard actions on UITextView that are triggered after long press
        if (gestureRecognizer is UILongPressGestureRecognizer longpress 
            && longpress.MinimumPressDuration == .5)
            return false;

        return true;
    }

    public override bool CanPerform(Selector action, NSObject withSender) => false;

    public override void LayoutSubviews()
    {
        //Make the TextView as large as its content
        base.LayoutSubviews();
        var x = new CGSize(this.Frame.Size.Width, double.MaxValue);

        var fits = SizeThatFits(x);

        var frame = Frame;

        frame.Size = fits;
    }
}
```

## HyperlinkLabelRenderer

This renderer on iOS will 'translate' the `HyperlinkLabel` to the `HyperlinkUIView`. There isn't anything special going on in this class. In the `SetText`  method, we ask the Text that should be printed from the `HyperlinkLabel`. We loop over the links that we also get back from the HyperlinkLabel's `GetText` method and we simple add the necessary attributes to the `NSMutableAttributedString`.

**HyperlinkLabelRenderer (iOS)**

```csharp
public class HyperlinkLabelRenderer : ViewRenderer<HyperlinkLabel, HyperlinkUIView>
{
    protected override void OnElementChanged(ElementChangedEventArgs<HyperlinkLabel> e)
    {
        base.OnElementChanged(e);

        if (e.NewElement != e.OldElement)
        {
            if (e.OldElement != null)
                e.OldElement.PropertyChanged -= Element_PropertyChanged;

            if (e.NewElement != null)
                e.NewElement.PropertyChanged += Element_PropertyChanged;
        }

        var textView = new HyperlinkUIView();

        SetNativeControl(textView);

        SetText();
    }

    private void Element_PropertyChanged(object sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == HyperlinkLabel.RawTextProperty.PropertyName)
            SetText();
    }

    private void SetText()
    {
        CTStringAttributes attrs = new CTStringAttributes();
        string text = Element.GetText(out List<HyperlinkLabelLink> links);
        if (text != null)
        {
            var str = new NSMutableAttributedString(text);
            str.AddAttribute(UIStringAttributeKey.Font, Element.Font.ToUIFont(), new NSRange(0, str.Length));
            var textColor = (Color)Element.GetValue(Label.TextColorProperty);
            str.AddAttribute(UIStringAttributeKey.ForegroundColor, textColor.ToUIColor(Color.Black),
                new NSRange(0, str.Length));

            foreach (var item in links)
            {
                str.AddAttribute(UIStringAttributeKey.Link, new NSUrl(item.Link), new NSRange(item.Start, item.Text.Length));
            }
            Control.AttributedText = str;
        }
    }
}
```

**Please mind that I use _Element.Font.ToUIFont()_ to get the `UIFont` from the Element. However, the Font property is deprecated, but for now it still works. As far as I know, there is no other way to easily translate the font attributes defined on a Xamarin Forms control to a `UIFont`. There is, however, an extension method in Xamarin Forms that does this: `internal static UIFont ToUIFont(this Label label)`. But, as you can see, this method is internal, so we can't use it in our own code and I didn't feel like copy en pasting this code. Xamarin should just make this method public, right? ;-)**

# UWP

There is no need for a custom control in UWP as a `TextBlock` already supports inline links. So the only thing we need is a custom renderer.

## HyperlinkLabelRenderer

This class does more or less the same thing as its counterpart in iOS. But instead of working with attributed strings, we can put `Run`s and `Hyperlink`s inside a `TextBlock`. So we are basically going to chop our Text into pieces ('pure' text or links) and add them as a `Run` or `Hyperlink` respectively to the `Inline`s collection of our `TextBlock`.

**HyperlinkLabelRenderer (UWP)**

```csharp
public class HyperlinkLabelRenderer : ViewRenderer<HyperlinkLabel, TextBlock>
{
    protected override void OnElementChanged(ElementChangedEventArgs<HyperlinkLabel> e)
    {
        base.OnElementChanged(e);

        if (e.NewElement != e.OldElement)
        {
            if (e.OldElement != null)
                e.OldElement.PropertyChanged -= Element_PropertyChanged;

            if (e.NewElement != null)
                e.NewElement.PropertyChanged += Element_PropertyChanged;
        }

        var tb = new TextBlock();
        tb.TextWrapping = Windows.UI.Xaml.TextWrapping.WrapWholeWords;
        SetNativeControl(tb);

        SetText();
    }

    private void SetText()
    {
        Control.Inlines.Clear();

        string text = Element.GetText(out List<HyperlinkLabelLink> links);
        if (text != null)
        {
            int index = 0;

            foreach (var item in links)
            {
                Control.Inlines.Add(new Run() { Text = text.Substring(index, item.Start - index) });

                var hl = new Hyperlink();
                hl.NavigateUri = new Uri(item.Link);
                hl.Inlines.Add(new Run() { Text = text.Substring(item.Start, item.Text.Length) });

                Control.Inlines.Add(hl);

                index = item.Start + item.Text.Length;

                if(index < text.Length && item == links.LastOrDefault())
                    Control.Inlines.Add(new Run() { Text = text.Substring(index, text.Length - index) });
            }
        }
    }

    private void Element_PropertyChanged(object sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == HyperlinkLabel.RawTextProperty.PropertyName)
            SetText();
    }
}
```

# Android

**Update 7 December 2018**: A year later, I finally made an Android renderer for this control. More info can be found in this [post](/2018/12/07/using-android-linkify-to-add-inline-links-to-a-xamarin-forms-label/ "Using Android Linkify to add inline links to a Xamarin Forms Label").

# Remarks

This is just a very basic implementation for iOS and UWP, I don't have an Android version yet. Also, I don't take every property that has been set on the Label into account (fontsize, color, ... on UWP and other things as well). But please, if you need this stuff and feel like implementing it, my code is on GitHub and just do a PR! :-)

### Find the [code on GitHub](https://github.com/PieEatingNinjas/HyperlinkLabel "code on GitHub").

Remarks, questions? Just drop a comment and I'll get back to you.
