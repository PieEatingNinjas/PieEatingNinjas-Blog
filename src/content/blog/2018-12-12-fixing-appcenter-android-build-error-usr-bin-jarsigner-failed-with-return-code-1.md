---
title: "Fixing AppCenter Android Build Error: /usr/bin/jarsigner failed with return code: 1"
description: "Error: /usr/bin/jarsigner failed with return code: 1 This issue bugged me for an entire day. The real sad thing about it is, is that I faced this same issue some months ago... So a"
pubDate: "2018-12-12"
legacy: {"id":1319,"path":"/2018/12/12/fixing-appcenter-android-build-error-usr-bin-jarsigner-failed-with-return-code-1/","taxonomySlugs":{"categories":["android","appcenter","c","xamarin"],"tags":[]}}
categories: ["C#","android","appcenter","xamarin"]
tags: []
heroImage: "/wp-content/uploads/2018/12/androidbuild.png"
---

## Error: /usr/bin/jarsigner failed with return code: 1

This issue bugged me for an entire day. The real sad thing about it is, is that I faced this same issue some months ago...

So after I set up my AppCenter Android Build, I gave it a spin. Sadly the signing failed with:

```text
##[error]Error: /usr/bin/jarsigner failed with return code: 1
##[error]Return code: 1
```

My first thoughts were that maybe I mistyped the password or the alias of my Android Keystore file. So I double checked, triple checked, re-uploaded my Keystore file, … Too bad!

## The Solution

When I Googled/Binged  for the error, I didn't find anything useful. Most of the time people pointed out that it might be due to the fact that I'm trying to sign an APK that has already been signed before... But that couldn't possibly be it, right? ?

So after trying out different stuff, I finally took a look at my code repository:  

![](/wp-content/uploads/2018/12/ReleaseAPK.jpg)

Well, well, well! It seems like, at some point in time, I checked-in a signed version of the app in the bin/Release folder by mistake (both my Debug and Release folder should be in the .gitignore file, but for some reason the contents of my bin folders were commited). So that explains the above error message which many people online tell is due to signing an already signed app.  
  
I **removed these files from the repository**, triggered the Build again and... eureka! :-) The build and signing succeeded!!
