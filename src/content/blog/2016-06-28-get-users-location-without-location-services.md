---
title: "Getting the user's physical location without location services"
description: "It has been a while since my last blogpost (due to various reasons: preparing wedding and talk at Techorama, meetings with the architect for the construction of our house,...)! But"
pubDate: "2016-06-28"
legacy: {"id":557,"path":"/2016/06/28/get-users-location-without-location-services/","taxonomySlugs":{"categories":["c","uwp","xamarin"],"tags":[]}}
categories: ["C#","uwp","xamarin"]
tags: []
---

It has been a while since my last blogpost (due to various reasons: preparing wedding and talk at Techorama, meetings with the architect for the construction of our house,...)! But I finally found a bit time to write another blogpost. This time it is a very simple and short one about 'magically' getting the user's location without using location services on the mobile device.

# Intro

A customer where I'm currently working at, wanted to know if it would be possible to 'block' the usage of their app, once the user tries to use it outside the country. Immediately we started thinking about using location services and checking the user's location. But, our customer didn't like that idea and wanted to know if there weren't any alternatives.

# Getting the location 'magically'

It sounded almost like we should do some magic in order to accomplish this. Eventually, there were all kinds of proposals like for example checking the user's IP address in the backend. But, again, the custom didn't like that thought as it would require a change in the backend and due to all kinds of reasons, this wouldn't be an option.

But the IP thing sounded like a good starting point... And as _our_ backend could not be used for this, let's use an other one! :-)

There is this little website named 'Google', a search engine. When you browse to it via google.com, you will be redirected to your country specific page. So for example, as I live in Belgium, when I browse to google.com, I get redirected to google.be. This is exactly what we need! If we would just do a GET to google.com and look in the response what the URI is where we landed on, then we could determine in which country the user is at the particular moment. Let's code this!

# Show me the code

This is how we can do this in UWP:

**Determine if user is in Belgium (UWP)**

```csharp
private async Task<bool> IsUserInBelgium()
{
    try
    {
        string country = string.Empty;
        HttpClient client = new HttpClient();
        var response = await client.GetAsync("http://www.google.com");
        var resultUri = response.RequestMessage.RequestUri.Host;
        var parts = resultUri.Split('.');
        if (parts[1] == "google")   //[0]="www", [1]="google"
        {
            country = parts[2];
        }
        return country.Equals("be", StringComparison.OrdinalIgnoreCase);
    }
    catch (Exception)
    {

        //Oh, no! Is google down?
        //Let's assume user is not in Belgium
        return false;
    }
}
```

We can, of course, also do this in Xamarin if we want.

**The same thing, in Xamarin**

```csharp
private async Task<bool> IsUserInBelgium()
{
    string country = string.Empty;
    string resultUri = string.Empty;
    var httpRequest = (HttpWebRequest)HttpWebRequest.Create("http://www.google.com");
    try
    {
        using (HttpWebResponse httpResponse = (await httpRequest.GetResponseAsync() as HttpWebResponse))
        {
            resultUri = httpResponse.ResponseUri.Host;
        }
        var parts = resultUri.Split('.');
        if (parts[1] == "google") //[0]="www", [1]="google"
        {
            country = parts[2];
        }
        return country.Equals("be", StringComparison.OrdinalIgnoreCase);
    }
    catch (Exception)
    {
        //Oh, no! Is google down?
        //Let's assume user is not in Belgium
        return false;
    }
}
```

And that's it! That's all we have to do in order to check if the user of the app is in a particular country.

# Side note

In the end, our customer decided not to release this 'feature', and therefore this feature has not been tested throughout. So I have no clue whether this works as we expect, if it is 100% waterproof or how this behaves 'in the wild'. So, use it at your own risk! ;-)

Thoughts or remarks are welcome in the comments area below!

Thanks to my colleague Jonathan for the idea!
