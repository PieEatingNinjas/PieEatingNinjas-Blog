---
title: "Multi targeting based on file name in MAUI"
description: "The MAUI way: a single Project With Xamarin.Forms, we typically had this kind of project structure: A shared project, containing all of our shared code and different 'head' project"
pubDate: "2021-09-09"
legacy: {"id":1773,"path":"/2021/09/09/multi-targeting-based-on-file-name-in-maui/","taxonomySlugs":{"categories":["c","maui"],"tags":[]}}
categories: ["C#","maui"]
tags: []
---

# The MAUI way: a single Project

With Xamarin.Forms, we typically had this kind of project structure:

![](/wp-content/uploads/2021/09/ProjectStructure.jpg)

A shared project, containing all of our shared code and different 'head' projects for each platform you want to target.

This isn't the case any more with MAUI which simplifies the project structure into a single project. MAUI leverages multi targeting to include platform specific code and to compile platform specific apps.

The default project template of a MAUI application contains a Platforms folder containing folders for each platform we want to target:

![](/wp-content/uploads/2021/09/platforms.jpg)

The compiler will only include the files inside these folders when compiling for the specific target. For example: only when we compile for Android, the files in the Android folder will be included. So this is the place where we put platform specific code.

# Multi targeting based on file name

Personally, I don't think you can always put every platform specific thing in one of the Platforms' subfolders. Another multi targeting pattern I've seen (and used) over the years, is including the platform in the file name. For example: a platform specific custom handler to be used on Android could be named _MyButtonHandler.Android.cs_, where as _MyButtonHandler.Apple.cs_ is the file containing the class that should be used on Apple platforms.

# ![](/wp-content/uploads/2021/09/naming.jpg)

This is what the \*.Android.cs file could look like:

```csharp
public partial class MyButtonHandler : ButtonHandler
{
    public MyButtonHandler()
    {
        ButtonMapper.Add(nameof(Microsoft.Maui.Controls.Button.Background), (handler, button) =>
        {
            AndroidX.AppCompat.Widget.AppCompatButton nativeButton = handler.NativeView;
            nativeButton.SetBackgroundColor(Colors.Red.ToNative());
        });
    }
}
```

Take a look at the type of the NativeView property of the handler. The type is 'AndroidX.AppCompat.Widget.AppCompatButton' which is a type which only exists on the Android platform. On iOS this type doesn't exist of course. But how does this compile then? Well, this doesn't work out-of-the-box.

### Adjusting .csproj

We need to inform the compiler that we want to include (or remove) certain files under certain conditions. Take a look at the following snippet:

```xml
<ItemGroup Condition="$(TargetFramework.StartsWith('MonoAndroid')) != true AND $(TargetFramework.StartsWith('net6.0-android')) != true ">
  <Compile Remove="**\**\*.Android.cs" />
  <None Include="**\**\*.Android.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
  <Compile Remove="**\Android\**\*.cs" />
  <None Include="**\Android\**\*.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
</ItemGroup>
```

This snippet will make sure that if we DON'T compile for android (`Condition="$(TargetFramework.StartsWith('MonoAndroid')) != true AND $(TargetFramework.StartsWith('net6.0-android')) != true "`), that we DON'T want to compile classes in files that include .Android.cs in their filename ( `<Compile Remove="**\**\*.Android.cs" />`) or that live in an Android folder  ( `<Compile Remove="**\Android\**\*.cs" />`) .

##### Important: If you added this to your csproj, you should close all of your open tabs in Visual Studio (or better yet, restart Visual Studio) or the IDE will get confused and will give you red squiggles everywhere.

For iOS and other platforms, you can add similar stuff:

```xml
<ItemGroup Condition="$(TargetFramework.StartsWith('Xamarin.iOS')) != true AND $(TargetFramework.StartsWith('net6.0-ios')) != true AND $(TargetFramework.StartsWith('net6.0-maccatalyst')) != true ">
   <Compile Remove="**\**\*.iOS.cs" />
   <None Include="**\**\*.iOS.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\iOS\**\*.cs" />
   <None Include="**\iOS\**\*.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
 </ItemGroup>
 <ItemGroup Condition="$(TargetFramework.StartsWith('Xamarin.Mac')) != true ">
   <Compile Remove="**\*.Mac.cs" />
   <None Include="**\*.Mac.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\Mac\**\*.cs" />
   <None Include="**\Mac\**\*.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
 </ItemGroup>
 <ItemGroup Condition="$(TargetFramework.StartsWith('Xamarin.Mac')) != true AND $(TargetFramework.StartsWith('Xamarin.iOS')) != true AND $(TargetFramework.StartsWith('net6.0-ios')) != true AND $(TargetFramework.StartsWith('net6.0-maccatalyst')) != true">
   <Compile Remove="**\*.MaciOS.cs" />
   <None Include="**\*.MaciOS.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\MaciOS\**\*.cs" />
   <None Include="**\MaciOS\**\*.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
 </ItemGroup>
 <ItemGroup Condition="$(TargetFramework.StartsWith('MonoAndroid')) != true AND $(TargetFramework.StartsWith('net6.0-android')) != true ">
   <Compile Remove="**\**\*.Android.cs" />
   <None Include="**\**\*.Android.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\Android\**\*.cs" />
   <None Include="**\Android\**\*.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
 </ItemGroup>
 <ItemGroup Condition="$(TargetFramework.StartsWith('netstandard')) != true AND '$(TargetFramework)' != 'net6.0'">
   <Compile Remove="**\*.Standard.cs" />
   <None Include="**\*.Standard.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\Standard\**\*.cs" />
   <None Include="**\Standard\**\*.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
 </ItemGroup>
 <ItemGroup Condition="$(TargetFramework.Contains('-windows')) != true ">
   <Compile Remove="**\*.Windows.cs" />
   <None Include="**\*.Windows.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\Windows\**\*.cs" />
   <None Include="**\Windows\**\*.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\*.uwp.cs" />
   <None Include="**\*.uwp.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <MauiXaml Remove="**\*.Windows.xaml" />
   <None Include="**\*.Windows.xaml" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\*.Windows.xaml.cs" />
   <None Include="**\*.Windows.xaml.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <MauiXaml Remove="**\Windows\**\*.xaml" />
   <None Include="**\Windows\**\*.xaml" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
   <Compile Remove="**\Windows\**\*.xaml.cs" />
   <None Include="**\Windows\**\*.xaml.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
 </ItemGroup>
 <ItemGroup Condition=" $(TargetFramework.StartsWith('uap10.0')) ">
   <Compile Remove="**\*.uwp.cs" />
   <None Include="**\*.uwp.cs" Exclude="$(DefaultItemExcludes);$(DefaultExcludesInProjectFolder)" />
 </ItemGroup>
```

Once you have this in place, you can start adding your platform specific code in platform named folders or by including the platform name in the filename.

For completeness sake, I do want to make clear that if you only want to put your platform specific code in a dedicated platform folder under the Platforms folder, that you don't need to do any of this. Code in those sub folders is only compiled when compiling for that platform automatically, nothing special needs to be done for that, it works out-of-the-box.

# Thanks

Thanks to Gerald Versluis ([Twitter](https://twitter.com/jfversluis), [YouTube](https://www.youtube.com/GeraldVersluis)) for pointing me in the [right direction to show how this (should) work](https://twitter.com/jfversluis/status/1432307481628315649?s=20)!
