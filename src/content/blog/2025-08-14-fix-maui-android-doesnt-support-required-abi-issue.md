---
title: "Fix Maui Android \"Doesn't support required ABI\" issue"
description: "I bumped into an issue and I had to look around a bit to find the solution. Hopefully, with this post I can help others (who, just like me, don't read Release Note thoroughly enoug"
pubDate: "2025-08-14"
legacy: {"id":1999,"path":"/2025/08/14/fix-maui-android-doesnt-support-required-abi-issue/","taxonomySlugs":{"categories":["android","maui"],"tags":[]}}
categories: ["android","maui"]
tags: []
---

I bumped into an issue and I had to look around a bit to find the solution. Hopefully, with this post I can help others (who, just like me, don't read Release Note thoroughly enough) out as well 🙂

# The problem

All of a sudden reports started to come in reporting that users weren't able to install the latest Android version of a .NET MAUI app.

In the Google Play Store, they got a message similar to this:

_**Your device isn’t compatible with this version.**_

After digging in the Google Play Store Console, I saw this:

[![](/wp-content/uploads/2025/08/Screenshot-2025-08-14-at-10.45.47.png)](/wp-content/uploads/2025/08/Screenshot-2025-08-14-at-10.45.47.png)

The app can't be installed on the device is because it doesn't support the required arm64-v8a and x86\_64 ABIs 🤔

When looking at the history of this Android app's releases, I notice that up to a point the App Bundle contained this information:

[![](/wp-content/uploads/2025/08/Screenshot-2025-08-14-at-11.22.49.png)](/wp-content/uploads/2025/08/Screenshot-2025-08-14-at-11.22.49.png)

It clearly shows arm64-v8a, armeabi-v7a, x86, x86\_64.

And then, after migrating to .NET 9, this is showing in the Google Play Console:

[![](/wp-content/uploads/2025/08/Screenshot-2025-08-14-at-11.24.17.png)](/wp-content/uploads/2025/08/Screenshot-2025-08-14-at-11.24.17.png)

As you can see, it only mentions arm64-v8a, x86\_64.

# The cause

Turns out, I overlooked this in the .NET 9 release notes: [https://learn.microsoft.com/en-us/dotnet/maui/whats-new/dotnet-9?view=net-maui-9.0#64-bit-architectures-by-default](https://learn.microsoft.com/en-us/dotnet/maui/whats-new/dotnet-9?view=net-maui-9.0#64-bit-architectures-by-default)   😬

# The solution

Luckily, the fix is simple, just add this to your csproj file:

```xml
<PropertyGroup Condition="'$(TargetFramework)'=='net9.0-android'">
    <RuntimeIdentifiers>android-arm;android-arm64;android-x86;android-x64</RuntimeIdentifiers>
</PropertyGroup>
```

When submitting the app to the Play Store, it now shows arm64-v8a, armeabi-v7a, x86, x86\_64 again, as before migrating to .NET 9.
