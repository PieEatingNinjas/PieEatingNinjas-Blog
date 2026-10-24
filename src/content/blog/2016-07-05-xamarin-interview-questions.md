---
title: "Xamarin interview questions"
description: "Intro The company I work for, Ordina Belgium, got many requests for ‘consultants with Xamarin experience’ from our customers lately. As leader of the Mobile Competence Center at Or"
pubDate: "2016-07-05"
legacy: {"id":577,"path":"/2016/07/05/xamarin-interview-questions/","taxonomySlugs":{"categories":["xamarin"],"tags":[]}}
categories: ["xamarin"]
tags: []
---

# Intro

The company I work for, Ordina Belgium, got many requests for ‘consultants with Xamarin experience’ from our customers lately. As leader of the Mobile Competence Center at Ordina, I’m bundling the interview questions our consultants get dished up when they go on an intake for a Xamarin project. I thought it would be nice to share some of these questions here on my blog. I’m just sharing questions, I’m not going to share entire answers as some questions are about opinions or have multiple solutions. I do might ‘hint’ to a possible answer.

If you have any additional questions that should be in the list according to you, additional remarks, or if you don’t understand a particular question, you can always drop a comment below!

I hope this list helps you out doing your homework for a Xamarin interview or just for testing your Xamarin knowledge.

I’ll try to regularly update this list with additional questions.

Good luck!

Note: Xamarin stands form Xamarin.iOS and Xamarin.Android. When talking about Forms, I explicitly use ‘Xamarin Forms’.

# Questions

###### Last update: 17 April 2017

### What is Xamarin?

**Hint:** Cross-platform, C#/F#, Mono, Native, Open Source, acquired by MS

### How does this work on Android?

**Hint:** Embeded Mono runtime, IL, JIT, …

### How does this work on iOS?

**Hint:** Ahead of Time compilation to ARM

### Following previous question, is the entire .NET/Mono BCL included?

**Hint:** No, only used classes and functions (Linking)

### What about Xamarin’s performance (vs. native Java on Android or Swift/Obj C on iOS, vs. native C++)?

**Hint:** Performance is good! Should not be a reason not to use Xamarin.

-   iOS: C++ > Swift > Xamarin iOS > Obj C
-   Android: C++ > Xamarin Droid > Java

### Is Xamarin native?

**Hint:** Yes

### What is Xamarin Forms?

**Hint:** Cross platform toolkit to also share user interface layouts

### Is Xamarin Forms native?

**Hint:** Yes

### What do you prefer? PCL (Portable Class Libraries) or Shared Projects? Why?

### How many code / what kind of code can be shared across iOS and Android when using Xamarin?

**Hint:** Business logic can be shared, UI cannot be shared (you CAN share it in Xamarin Forms), UI is native, platform specific ‘low level’ stuff cannot be shared except for Xamarin components

### How to build a UI for multiple screen factors on iOS?

**Hint:** Auto layout, Constraints, Unified storyboards, Separate Storyboards, manually in code behind

### How to build a UI for multiple screen factors on Android?

**Hint:** Resources, manually in code behind

### How do you test your app on multiple different devices?

**Hint:** Emulators, Xamarin Test Cloud

### How can we monitor how our app behaves (stability, crashes, usage) in production or testing environments?

**Hint:** Xamarin Insights, HockeyApp

### How to support/target different OS versions on Android?

**Hint:** Target Framework, Min Android Version, Target Android Version, Android.OS.Build.Version.SdkInt in code

### What are Activities in Android?

**Hint:** one ‘screen’

### What are Fragments in Android?

**Hint:** like ‘user controls’

### Does this (Fragments) work on all Android versions?

**Hint:** no

### How can I support this (Fragments) on older Android versions?

**Hint:** Android Support Library (AppCompat)

### How does cell-reuse in lists work on iOS?

**Hint:** reuse of cells outside the view, GetCell method,  tableView.DequeueReusableCell

### How does cell-reuse in lists work on Android?

**Hint:** reuse of cells outside the view , GetView method, convertView parameter, inflate

### How to navigate in Android?

**Hint:** Intent (inside application and outside)

### When using Storyboards for iOS, do we have to put everything in one Storyboard?

**Hint:** No, possible to navigate from one storyboard to another

### How to launch other app to get a result back on Android?

**Hint:** Intent, LaunchForResult, override OnActivityResult method

### How can you pass data from one intent to another when navigating?

**Hint:** PutExtra method on Intent

### How do you receive data on an intent when data was passed to it?

**Hint:** Bundle

### What does this object (Bundle) look like and what kind of data can we store in there?

**Hint:** Dictionary, base data types

### Explain, high level, how Push Notifications work on iOS and Android

**Hint:** ask token on push notification server, store token on own server, send notification through push notification server using token

### How to let the development team be able to have both a Dev, Alpha, Beta and Production version of the app on their device?

**Hint:** give each ‘version’ of the app another name (best practice: do this in CI pipeline)

### Following the previous question, what if we want to give each version another icon?

**Hint:** other than just changing name, also change icon (best practice: do this in CI pipeline)

### How can we easily distribute test-versions of our apps to our stakeholders?

**Hint:** HockeyApp, TestFlight

### What is the easiest way to test the UI of your app?

**Hint:** Xamarin Calabash

### Explain, high level, how to display data in a List on iOS

**Hint:** TableView, UITabelViewSource

### Explain, high level, how to display data in a List on Android

**Hint:** ListView, Adapter

### On Android, our app needs to support both Landscape and Portrait mode. Which things should we consider?

**Hint:** Manifest, Activity lifecycle, alternatively do manually in code, prevent Activity restart if desired

### On Android, when I rotate my phone, some data disappears and some doesn’t. Explain this.

**Hint:** On Rotate activity restarts, OnSaveInstanceState , UI elements with id

### In case you want to do something platform specific (eg use camera), how can we do this?

**Hint:** Xamarin Component Store or through an interface having specific implementation on iOS and Android using IoC container

### We’ve got a REST api on http, do you see any issues using this in Xamarin?

**Hint:** On Android, no issue. New apps on iOS should use https exclusively, no ‘plain’ http calls are allowed.

### Imagine we have a ListView on our iOS app. What do we have to do if we want to make the NavBar/TabBar disappear when the user scrolls down the list?

**Hint:** Custom TabelViewSource, override Scrolled method, check scroll direction, call methods to show/hide bar

### How do you implement ‘Pull to refresh’ on iOS?

**Hint:** UIRefreshControl

### In Xamarin Forms, what are Renderers?

**Hint:** for each control there is a renderer per platform. This renderer 'translates' or is the bridge between the Xamarin Forms abstraction and the native platform specific control. Can write your own custom renderers for custom controls.

### In Xamarin Forms, what are Effects?

**Hint:** [Introduction to Effects](https://developer.xamarin.com/guides/xamarin-forms/application-fundamentals/effects/introduction/ "Introduction to Effects")

### What if I want to write an Effect in Xamarin Forms that is only applicable on iOS?

**Hint:** Only implement it for iOS. No specific implementation of the effect for other platforms.

### What kind of built-in ListView cells are there in Xamarin Forms?

**Hint:** TextCell, ImageCell, SwitchCell, EntryCell

### What about custom ListView cells and performance?

**Hint:** [ListView Performance](https://developer.xamarin.com/guides/xamarin-forms/user-interface/listview/performance/ "ListView Performance")

# Helpful Links

[Xamarin - Getting Started with Android](https://developer.xamarin.com/guides/android/getting_started/ "Xamarin - Getting Started with Android")

[Xamarin - Getting Started with iOS](https://developer.xamarin.com/guides/ios/getting_started/ "Xamarin - Getting Started with iOS")

[Pluralsight - Building Your First Xamarin.Android App from Start to Store](https://www.pluralsight.com/courses/android-xamarin-from-start-to-store "Pluralsight - Building Your First Xamarin.Android App from Start to Store")

[Pluralsight - Building Your First Xamarin.iOS App from Start to Store](https://www.pluralsight.com/courses/ios-xamarin-from-start-to-store "Pluralsight - Building Your First Xamarin.iOS App from Start to Store")
