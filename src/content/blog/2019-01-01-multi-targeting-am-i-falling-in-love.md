---
title: "Multi targeting, am I falling in love?"
description: "♥Februari is the month of love and friendship. That's why the Xamarin community is sharing some Xamarin Love every day of this month: Xamarin Month of love and friendship! ♥ A lot "
pubDate: "2019-01-01"
legacy: {"id":1340,"path":"/2019/01/01/multi-targeting-am-i-falling-in-love/","taxonomySlugs":{"categories":["android","architecture","c","cross-platform","ios","uwp","xamarin"],"tags":[]}}
categories: ["C#","android","architecture","cross-platform","ios","uwp","xamarin"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/MultiTargetingDemo"]
heroImage: "/wp-content/uploads/2019/02/post-1.png"
---

♥  
Februari is the month of love and friendship. That's why the Xamarin community is sharing some Xamarin Love every day of this month: [Xamarin Month of love and friendship](https://luismts.com/blog/xamarin/xamarin-month-february-2019/)!  
♥

A lot has been told the past years about code sharing strategies. Sharing as much code as possible between different platforms is vital for keeping your source code clean and maintainable. But since .NET runs on a variety of platforms, it is also very important to think about how to access code that is specific to a particular platform. When writing a Xamarin app, we want to share as much code as possible, but as soon as we want to access the file system for example, we need to write code specific to each platform.  
Recently I've 'discovered' an alternative way that seems to promote code sharing, maintainability, simplicity and allows to incorporate platform specific code in an elegant way: **multi targeting**. But first, let's look back at this code sharing road we've been walking...

## The code sharing strategy "Who Must Not Be Named": Shared Projects

I get the shivers when I hear this term… Not to mention the twitches I get when I open-up a solution and I see that my predecessor used the 'Shared Projects' code sharing strategy. From the first time I saw this in action (back in the days when we could share code between Windows Phone and WinRT 8-) ), I was never really fond of it. I hated the file linking, conditional compilation symbols which added a lot of clutter to the source code and it made the code a lot more complex to read (<= this is an opinion!). Yes, I was a PCL-guy!

## My 1° choice back in the days: PCL and Depedency Injection

I was a lot more in favour of working with PCLs. But what about platform-specific implementations? Well, we've got dependency injection for that. And this combination of PCLs with dependency injection was my favorite way of structuring my code.

Of course it wasn't all puppies and sunshine… PCLs had their shortcomings and the different profiles made it complex and unclear. Because of the way PCL (profiles) were built, it was very unclear what was available in a partifuclar profile and where it could be used and where not. Luckily Microsoft came up with something 'new': .NET Standard.

## The way forward: .NET Standard and Depedency Injection

I guess these days most of you will know what .NET Standard is because it is becoming the preferred way to write code/libraries that can be used on multiple platforms. I always see .NET Standard as a sort of contract (an interface if you will). For example: .NET Standard 1 defines that X, Y and Z should 'exist'. So, platforms that want to support .NET Standard 1 need to have X, Y and Z. .NET Standard 'n+1' defines that everything of .NET Standard 'n' should exist and adds A, B and C to its 'contract'. And so platforms that support .NET Standard 'n+1' need to have the entire 'contract' implemented (X, Y, Z, A, B and C). Great concept!  
As soon as I could, I started using .NET Standard in my projects instead of PCLs. And for platforms specific implementations I would still use dependency injection: I'd define interfaces and abstractions in my library, implement the interfaces in my platform specific projects and inject them at runtime. Life is beatiful!

## But wait, there is more: multi targeting

Sporadically I heard this term called 'multi targeting'. I heard it was an even better way to structure you sharable and platform-specific code. I never really paid a lot of attention to it as I was happy with the way I was structuring my code. And so, like with a lot of 'new things', I put it on my 'to-watch/to-look-at/….'-list.  
Recently I was looking at a Xamarin.Forms project that had different 'features'. Each feature was a different project. Oh, wait… Did a said **A** different project? I mean: Each feature was a set of **4** (!) different projects: one (.NET Standard) project containing the sharable code and abstraction and besides that, three platform specific (iOS, Android, UWP) projects containing platform specific stuff for this feature. Yep, I'm touching on a sore point with code sharing and dependency injection. This was my trigger to finally start looking at multi targeting.

### What does multi targeting solve?

With multi targeting, we can throw all our code -sharable and platform specific- in one project. We can define for what platforms (plural!) the project should be build. When compiling, MS build will build for all the platforms, only taking the source files that are relevant for the platform it is compiling for. In other words: one project results in multiple compiled libraries, that on their own only contain the source code that is relevant for the platform it is compiled for. So, we no longer need platform specific projects for writing platform-specific code.  
But, doesn't this sound a lot like Shared Projects? Well, yes and no. One of the big differences is that you no longer need platform-specific 'head'-projects, no file linking. Also, you don't need to use conditional compilation symbols in order to specify what to do, what code-paths to follow or what code to take on a particular platform. Instead, we tell MS Build what files to take for each supporting platform. No more file linking, no source files cluttered with compilation symbols. That said, it is still possible to work with conditional compilation symbols if you want.  
One image says more then 1000 words:

![](/wp-content/uploads/2019/01/ezgif-1-f473166e6558.webp)

## OK, I'm listening…

### But how do we tell MS Build what to do?

All is done in the .csproj file. Let's take a look (leaving out some stuff for brevity):

```xml
<PropertyGroup>
    <!--Work around so the conditions work below-->
    <TargetFrameworks></TargetFrameworks>
    <TargetFrameworks Condition=" '$(OS)' == 'Windows_NT' ">netstandard1.0;netstandard2.0;Xamarin.iOS10;MonoAndroid81;uap10.0.16299</TargetFrameworks>
    <TargetFrameworks Condition=" '$(OS)' != 'Windows_NT' ">netstandard1.0;netstandard2.0;Xamarin.iOS10;MonoAndroid81</TargetFrameworks>

...
</PropertyGroup>
```

```xml
<ItemGroup Condition=" $(TargetFramework.StartsWith('netstandard')) ">
</ItemGroup>

<ItemGroup Condition=" $(TargetFramework.StartsWith('uap10.0')) ">
  <Compile Include="**\*.uwp.cs" />
</ItemGroup>

<ItemGroup Condition=" $(TargetFramework.StartsWith('MonoAndroid')) ">
  <Compile Include="**\*.android.cs" />
</ItemGroup>

<ItemGroup Condition=" $(TargetFramework.StartsWith('Xamarin.iOS')) ">
  <Compile Include="**\*.apple.cs" />
</ItemGroup>
```

At the top we list all platforms that we want to support. This means that if we compile, we want to compile for all the platforms listed here. But the most interesting are the itemgroups beneath that.  
Take a look at the first itemgroup that has a condition.

```xml
<ItemGroup Condition=" $(TargetFramework.StartsWith('uap10.0')) "> <Compile Include="**\*.uwp.cs" /> </ItemGroup>
```

What we are saying here is actualy very straight forward: if the target framework we are compiling for contains uap10.0 (UWP), we want to include all files that end with .uwp.cs. The other ItemGroups tell the same thing: if we are compiling for Xamarin Android, we want to include all files ending with .android.cs, when the target framework is Xamarin iOS we want to include all files with .apple.cs at the end. At the top, there is an ItemGroup without a condition which says to take all the files ending with .shared.cs. These files are always included, no mater what platform you are building for. This is, of course, your platform-independent, sharable code.  
This is one way to do it. If you want, you could also specify that -for example- all your UWP implementations are in a specific folder instead of looking at the file name:

It's all up to you how you want to structure your project.

### But what about platform specific references inside this project?

References can also be defined per target platform. In Visual Studio you can see, in your project's dependencies the dependencies per target platform:

![](/wp-content/uploads/2019/01/dependencies.jpg)

### Does this mean if have to constantly fiddle with the csproj file?

Yes and no… There is this [Visual Studio extension](https://marketplace.visualstudio.com/items?itemName=vs-publisher-473885.PluginForXamarinTemplates), developed by James Montemagno, which adds a project template for creating Xamarin Forms plugins. When you create a project with this template, a lot of stuff is already generated for you and it's the ideal starting point to create your own libraries.  
More information can be found [here](https://montemagno.com/new-plugin-for-xamarin-multi-target-templates-for-visual-studio-2017/).

Unfortunatly, adding references can only be done on project level in Visual Studio. That means that a NuGet package for example will be added to all compatible target frameworks. If you don't need the reference for a particular target, you can go into the csproj file and remove it for that target. Not ideal (or I'm missing something), but it's doable.

### How do I reference to this project?

That's easy!  
If the reference is inside the same solution, just add a project reference. Visual Studio will figure everything out!  
If you've build this library in a separate solution, pack the result as a NuGet package and from your other project add a reference to the NuGet package.

## Show me some code!!

Let's keep this sample very simple: a cross platform plugin which exposes only one method: SayHello.  
I installed his [Visual Studio extension](https://marketplace.visualstudio.com/items?itemName=vs-publisher-473885.PluginForXamarinTemplates), developed by James Montemagno. I can now create a new project using the Cross-platform .NET Standard Library Plugin. I call it 'SayHello'

This generates a project with multi targeting, containing 2 shared files (CrossSayHello and an ISayHello interface) and 1 file per platform (Android, iOS and UWP) that implement the ISayHello interface. I've added the following code:

```csharp
public interface ISayHello
{
    string SayHello();
}

//SayHello.android.cs
public class SayHelloImplementation : ISayHello
{
    public string SayHello()
        => "Hello Android";
}

//SayHello.apple.cs
public class SayHelloImplementation : ISayHello
{
    public string SayHello()
        => "Hello iOS";
}

//SayHello.uwp.cs
public class SayHelloImplementation : ISayHello
{
    public string SayHello()
        => "Hello UWP";
}
```

The generated csproj contains no secrets. We've previously already discussed what's in here: for UWP it compiles the .uwp.cs files, for Android .android.cs and for iOS .apple.cs files.

Now take a look at the generated CrossSayHello class. In the end, through its Current property, this class returns an instance of a class implementing the ISayHello interface. In fact, it always returns

```csharp
new SayHelloImplementation();
```

But which implementation is it? Simple! The one that got compiled! :-)

To check this, you can do the following: open the CrossSayHello class and click the dropdown in the upperleft. There you get to choose the different targets that are defined for the project.

![](/wp-content/uploads/2019/01/targets.jpg)

Select for example 'SayHello(uap 10.0.16299)'. As you browse through the project now, you are 'seeing' how it is configured for building for UWP in this case. Want proof? Right-click SayHelloImplementation in the CrossSayHello class and select 'Go to definition'. Tadaaa: Visual Studio should now have navigated to SayHello.uwp.cs. Exactly the class that should compile in the selected target. This helps you checking if your configuration is correct, but also, and more importantly, when writing code for a specific platform, make sure you select the right target so that all references and stuff can be resolved correctly.

Finally, create a new Xamarin.Forms project. Add a reference to the SayHello project in all of your Xamarin.Forms projects.

In MainPage.xaml.cs you can now access our CrossSayHello class:

```csharp
public MainPage()
{
    InitializeComponent();
    var message = CrossSayHello.Current.SayHello();
    DisplayAlert("Multi targeting", message, "OK");
}
```

And that's it! That's all we have to do to make this work! One project that outputs for different platforms.

You can find this example on [GitHub](https://github.com/PieEatingNinjas/MultiTargetingDemo).

## Thoughts

I have to be honest: I haven't played THAT much with multi targeting yet. But the things I've seen and that I've tried out, make me kinda happy. Less projects, which means much faster loading times in Visual Studio, simpler / cleaner solution structure, having some extra flexibility that Shared Projects offered but without the drawbacks, faster code (in theory as you don't need to resolve types at runtime for example), ...  
It's promising!

That being said, I need to play with this a lot more just to see for what kinds of things this approach is ideal and for wich it might be less ideal. Of course, there will be still a lot of places where I would like to keep dependency injection (for dozens of reasons, incl. testing) and there will be places, like libraries and plugins, where I might throw platforms specific DI away and replace it with a reference to a library/NuGet package that I built with multi targeting, without DI.

Only time will tell if this is just love at first sight, a 'coup de foudre' that will go away as quickly as it came, or if it's true love that will last.
