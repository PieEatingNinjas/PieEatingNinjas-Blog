---
title: "Using Android Linkify to add inline links to a Xamarin Forms Label"
description: "A loooong time ago (at least, this is what it feels like...), I created this custom Xamarin Forms control HyperlinkLabel (Blog post, GitHub repo) that can show one or multiple hype"
pubDate: "2018-12-07"
legacy: {"id":1247,"path":"/2018/12/07/using-android-linkify-to-add-inline-links-to-a-xamarin-forms-label/","taxonomySlugs":{"categories":["android","c","xamarin"],"tags":[]}}
categories: ["C#","android","xamarin"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/HyperlinkLabel"]
---

A loooong time ago (at least, this is what it feels like...), I created this custom Xamarin Forms control HyperlinkLabel ([Blog post](/2017/11/05/creating-a-hyperlinklabel-in-xamarin-forms/ "Creating a HyperlinkLabel in Xamarin Forms"), [GitHub repo](https://github.com/PieEatingNinjas/HyperlinkLabel "HyperlinkLabel")) that can show one or multiple hyperlinks inline with other text. The links can be defined in markdown. One picture says more than a thousand words:

[![HyperlinkLabel](/wp-content/uploads/2017/11/HyperlinkLabel.jpg)](/wp-content/uploads/2017/11/HyperlinkLabel.jpg)

One shortcoming to this control: I only made it for iOS and UWP. But both in the comments of this blogpost, mails, PMs on Twitter, on GitHub, … I got the question to make it work for Android as well. But, back then, I didn't have the time to do this. Moreover, because at the time, I was mainly doing iOS and UWP stuff, I didn't have a clear view on how I should do it on Android.

Now, more than a year later, again somebody pinged me about making an Android renderer in Xamarin Forms for my HyperlinkLabel…  Luckily, I have been doing some Android stuff lately and now I realized that making this work for Android by using Android's Linkify, ITransformFilter and IMatchFilter shouldn't be that hard! Here goes!

# Android.Text.Util.Linkify

The `Linkify` class allows us to take a `TextView` and generate a clickable link for all text that matches a given regex expression. This is often used to make email adresses, URLs, phone numbers, … clickable in a `TextView` on Android. Let's take a look at some very basic code that I used in a previous project. To give you some context, I created an effect which would make phone numbers and email addresses clickable inside a `TextView`.

**Linkify example used in an effect**

```csharp
protected override void OnAttached()
{
    if (Control is TextView tv)
    {
        var telpattern = Java.Util.Regex.Pattern.Compile("\\b[0-9]{2,4}[0-9 ]{1,10}");
        var emailpattern = Java.Util.Regex.Pattern.Compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,4}");
        Android.Text.Util.Linkify.AddLinks(tv, telpattern, "tel:");
        Android.Text.Util.Linkify.AddLinks(tv, emailpattern, "mailto:");
        tv.MovementMethod = Android.Text.Method.LinkMovementMethod.Instance;
    }
}
```

In this example I created two simple regular expressions: one to find a telephone number (in a specific format) and one to find an email address.

Next, I call the `Android.Text.Util.Linkify.AddLinks` method, where I pass in the `TextView` on which I want to apply these rules as well as the regex patterns I defined above and also a scheme (_tel:_ or _mailto:_). I also set the TextView's `MovementMethod` to `Instance` which will allow the user to click the links and which will execute the action associated with the link.

This code will make all text matching my telpattern and emailpattern clickable. The value behind these links is configured with respectively the tel and mailto schemes. So if I have an email address (\[email address omitted\]), it will make this appear as a clickable link with action "mailto:\[email address omitted\]". The OS will handle the scheme protocol, in this case it will open up a mail client with the provided email address as recipient. And the same goes for telephone numbers with their tel protocol which will initiate a phone call on the device. Pretty simple, right?

# Introducing IMatchFilter and ITransformFilter

Let's step it up a notch now! As stated in my previous blogpost, my `HyperlinkLabel` control exposes a method `GetText` which returns some data about the links that are defined in the raw text: it returns the text that should be displayed (without the markdown) as well as a list of `HyperlinkLabelLink` objects that contain the text of the link, the link itself and the index where this text occurs in the text that is displayed.

So if I wanted to use `Linkify` to make my `HyperlinkLabel` work on Android, I figured out that the regex pattern that I should use should be the Text that I get from a `HyperlinkLabelLink` object. Because that is basically the text that needs to be transformed into a hyperlink. BUT... What if the text that should be replaced with a link would be something like '_here_' and I have the word '_here_' multiple times displayed in my `TextView`? Well, all text that matches the given pattern will become links... So that wouldn't work, right?

Luckily we can pass in some additional parameters to the `Linkify.AddLinks` method. One of them is an instance of an `IMatchFilter`. This interface exposes one method: `AcceptMatch`. This method is called for each match that is found in the TextView's text, passing in the `charactersequence`, the `start` and `end` index of this match. Great! That's exactly what I need! When I get my `HyperlinkLabelLink` objects back from my `HyperlinkLabel` control, I get the index where this string is located in the entire text (I initially needed this for my UWP implementation). So I can use this to make sure the right match is transformed to a link.

I created my own implementation of a `IMatchFilter` and it looks like this:

**CustomMatchFilter implementation**

```csharp
public class CustomMatchFilter : Object, Linkify.IMatchFilter
{
    readonly int start;
    public CustomMatchFilter(int start)
    {
        this.start = start;
    }

    public bool AcceptMatch(ICharSequence s, int start, int end)
        => start == this.start;
}
```

This matchfilter will return true of the index of the match matches the index I expect.

And now for the action behind the link itself. In the previous example I showed how the text of the link itself can be prefixed by a scheme. This wouldn't work for this particular scenario as my text would be something like '_link_' and the action '_http://www.microsoft.com_'.

Next to the `IMatchFilter`, we can also pass in a `ITransformFilter` to the `AddLinks` method of the `Linkify` class. The `ITransformFilter` interface exposes a method `TransformUrl` which allows us to do some customization of the action behind the link. In our case, not much customizations needs to be done: we know exactly what action needs to be behind a specific link.

So my implementation of the `ITransformFilter` looks like this:

**CustomTransformFilter implementation**

```csharp
public class CustomTransformFilter : Object, Linkify.ITransformFilter
{
    readonly string url;
    public CustomTransformFilter(string url)
    {
        this.url = url;
    }

    public string TransformUrl(Matcher match, string url)
        => this.url;
}
```

In this implementation we return the url that was provided in the constructor of this object.

# Tying it all together

The `SetText` method is called in the Android specific renderer whenever the `RawText` property of the `HyperlinkLabel` changes (exactly how it's done in iOS and UWP as well).

**SetText method**

```csharp
private void SetText()
{
    if(Element is HyperlinkLabel hyperlinkLabelElement && hyperlinkLabelElement != null)
    {
        string text = hyperlinkLabelElement.GetText(out List<HyperlinkLabelLink> links);
        Control.Text = text;
        if (text != null)
        {
            foreach (var item in links)
            {
                var pattern = Pattern.Compile(item.Text);
                Linkify.AddLinks(Control, pattern, "", 
                    new CustomMatchFilter(item.Start), 
                    new CustomTransformFilter(item.Link));
                Control.MovementMethod = Android.Text.Method.LinkMovementMethod.Instance;
            }
        }
    }
}
```

In this method I'm calling the `GetText` method of my `HyperlinkLabel` control. It returns the text that needs to be displayed (without the markdown) and via the out parameter I get all info we need about the links in the text: the `Text` of the link, the `Url` and the index (`Start`) where this link is positioned in the text. For each link I'm creating a regex pattern with just the text of the link, I create a `MatchFilter` passing in the `Start` value so that we only replace the correct occurrence and finally I'm passing in a `TransformFilter` containing the url that should be invoked when the user clicks on the link.

The entire Android renderer looks something like this:

**HyperlinkLabelRenderer Android**

```csharp
[assembly: ExportRenderer(typeof(HyperlinkLabel), typeof(HyperlinkLabelRenderer))]
namespace HyperlinkLabelControl.Droid.Renderers
{
    public class HyperlinkLabelRenderer : LabelRenderer
    {
        protected override void OnElementChanged(ElementChangedEventArgs<Label> e)
        {
            base.OnElementChanged(e);
            if (e.NewElement != e.OldElement)
            {
                if (e.OldElement != null)
                    e.OldElement.PropertyChanged -= Element_PropertyChanged;

                if (e.NewElement != null)
                    e.NewElement.PropertyChanged += Element_PropertyChanged;
            }
            SetText();
        }

        private void SetText()
        {
            if(Element is HyperlinkLabel hyperlinkLabelElement && hyperlinkLabelElement != null)
            {
                string text = hyperlinkLabelElement.GetText(out List<HyperlinkLabelLink> links);
                Control.Text = text;
                if (text != null)
                {
                    foreach (var item in links)
                    {
                        var pattern = Pattern.Compile(item.Text);
                        Linkify.AddLinks(Control, pattern, "", 
                            new CustomMatchFilter(item.Start), 
                            new CustomTransformFilter(item.Link));
                        Control.MovementMethod = Android.Text.Method.LinkMovementMethod.Instance;
                    }
                }
            }
        }

        private void Element_PropertyChanged(object sender, System.ComponentModel.PropertyChangedEventArgs e)
        {
            if (e.PropertyName == HyperlinkLabel.RawTextProperty.PropertyName)
                SetText();
        }
    }

    public class CustomTransformFilter : Object, Linkify.ITransformFilter
    {
        readonly string url;
        public CustomTransformFilter(string url)
        {
            this.url = url;
        }

        public string TransformUrl(Matcher match, string url)
            => this.url;
    }

    public class CustomMatchFilter : Object, Linkify.IMatchFilter
    {
        readonly int start;
        public CustomMatchFilter(int start)
        {
            this.start = start;
        }

        public bool AcceptMatch(ICharSequence s, int start, int end)
            => start == this.start;
    }
}
```

Currently this code still 'lives' in a separate branch in my GitHub repo, which you can find [here](https://github.com/PieEatingNinjas/HyperlinkLabel/tree/AndroidRenderer "Github repo"). I'll merge it to master once I've done some additional testing.

Please feel free to post your remarks or questions in the Comments section below. Enjoy!
