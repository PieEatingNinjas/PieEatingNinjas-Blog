---
title: "Get Geo Location in background with Xamarin.Essentials on iOS"
description: "Getting the Geo Location by using Xamarin.Essentials doesn't work when the app is in the background. Let's see how we can 'fix' this (on iOS)! Xamarin.Essentials Xamarin.Essentials"
pubDate: "2019-03-12"
legacy: {"id":1395,"path":"/2019/03/12/get-geo-location-in-background-with-xamarin-essentials-on-ios/","taxonomySlugs":{"categories":["c","ios","xamarin"],"tags":[]}}
categories: ["C#","ios","xamarin"]
tags: []
heroImage: "/wp-content/uploads/2019/03/essentialsfb.webp"
---

Getting the Geo Location by using Xamarin.Essentials doesn't work when the app is in the background. Let's see how we can 'fix' this (on iOS)!

## Xamarin.Essentials

Xamarin.Essentials is a fantastic library containing many cross-platform APIs for mobile applications. Things like detecting Battery level, Vibrating, getting Device information, ... and a lot more. Check out the [Docs](https://docs.microsoft.com/en-us/xamarin/essentials/) if you want to know more about this great library!

## Get Geo Location in the background

For a PoC (proof of concept) that I'm developing at a customer, we wanted to build the following in iOS: when a device gets a silent push notification, we want the device to send its location to our backend. Something as simple as this:

```csharp
public override async void DidReceiveRemoteNotification(UIApplication application, NSDictionary userInfo, 
    Action<UIBackgroundFetchResult> completionHandler)
{
    var location = await Xamarin.Essentials.Geolocation.GetLocationAsync();
    var client = new HttpClient();
    await client.PostAsync("[URL]", new StringContent($"{{ Longitude: {location.Longitude}, Latitude: {location.Latitude} }}"));
}
```

## It's not working...  

Unfortunately, this was not working... The push notification did arrive, but I wasn't able to retrieve the location. Taking a peek in the Xamarin.Essentials [Docs](https://docs.microsoft.com/en-us/xamarin/essentials/) and in the code on [GitHub](https://github.com/xamarin/Essentials), I discovered that it only requested permission to access the location of the device only when the app is in the foreground. As this silent push notification arrived in the background, I didn't have the correct permission to access it! :-(

By going through some of the issues on the GitHub repo, I found out that the Geolocation api is not built to get the location in the background and that there are no plans of supporting it in the future (due to its complexity).

## But what if...

As I looked into the code, I realized that everything should 'just work' on iOS if I had the right permissions. So what if, in my _AppDelegate_ in the _FinishedLaunching_ method, I would ask for permission to access the location in the the backgorund?

```csharp
CLLocationManager locMgr = new CLLocationManager(); //<-- this is a member variable in my AppDelegate class
...
if (UIDevice.CurrentDevice.CheckSystemVersion(8, 0))
{
    locMgr.RequestAlwaysAuthorization();
}

if (UIDevice.CurrentDevice.CheckSystemVersion(9, 0))
{
    locMgr.AllowsBackgroundLocationUpdates = true;
}
```

Success! It turns out that this is working perfectly! Great! Now we don't need to add a separate library to get the location in the background, we can keep on using Xamarin.Essentials for this (which we are already using for other stuff in the app).  
  
Of course, for this to work, you should also have the right keys in your info.plist (see the links below if you are unfamiliar with that)!

## Links

  
[Xamarin.Essentials Docs](https://docs.microsoft.com/en-us/xamarin/essentials/)  
[Xamarin.Essentials GitHub](https://github.com/xamarin/Essentials)  
[Silent remote notifications iOS](https://docs.microsoft.com/en-us/xamarin/ios/app-fundamentals/backgrounding/ios-backgrounding-techniques/updating-an-application-in-the-background#silent-remote-notifications)  
[Background Location on Xamarin.iOS](https://docs.microsoft.com/en-us/xamarin/ios/app-fundamentals/backgrounding/ios-backgrounding-walkthroughs/location-walkthrough)
