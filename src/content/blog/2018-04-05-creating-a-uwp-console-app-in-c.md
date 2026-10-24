---
title: "Creating a UWP Console app in C#"
description: "UWP Console apps In my last two blogposts, I've already shown some really cool features coming in the Windows Redstone 4 update. Also new in the RS4 update is the ability to create"
pubDate: "2018-04-05"
legacy: {"id":1134,"path":"/2018/04/05/creating-a-uwp-console-app-in-c/","taxonomySlugs":{"categories":["c","rs4","uwp","visual-studio"],"tags":[]}}
categories: ["C#","rs4","uwp","visual-studio"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/UwpConsoleApp"]
---

# UWP Console apps

In my last two blogposts, I've already shown some really cool features coming in the Windows Redstone 4 update. Also new in the RS4 update is the ability to create UWP Console apps! As there currently is no project template available in Visual Studio, there are a couple of things that need to be set-up manually. If, in the future, the project template becomes available, this blogpost will still give you some background information about the 'magic' this template will do.

**Update (07/06):** Microsoft has released an update to the Console UWP App project templates on the Visual Studio marketplace. Find out more [here](https://blogs.windows.com/buildingapps/2018/06/06/c-console-uwp-applications/#BpG2IeiGJgGVgr6y.97 "C# Console UWP Applications").

# Create new project and throw away everything...

… well, not everything :-) To get started, create a new UWP project in Visual Studio.

![](/wp-content/uploads/2018/04/UwpConsoleNewPrj.jpg)

Then, select the appropriate UWP versions (at the moment of writing this is "Windows 10 Insider Preview Build 17120"). Once that is done, you can start removing some stuff! As we are building a Console app, we don't need App.xaml(.cs) and MainPage.xaml(.cs), just delete these 4 files. Next, we need to add a new file: Program.cs. As a result, your project will look something like this:

![](/wp-content/uploads/2018/04/UwpConsolePrjStructure.jpg)

# Add DISABLE\_XAML\_GENERATED\_MAIN Compilation Symbol

In the Properties window of our UWP app, we need to add **DISABLE\_XAML\_GENERATED\_MAIN** to the Conditional Compilation Symbols. This prevents the build system from generating the default Main method.

![Conditional compilation symbols](/wp-content/uploads/2018/02/CompileSymbol.jpg)

But how will our UWP start without a Main method? Simple, we are going to write our own!

# Start building

In this newly created Program class, we are going to add a Main method:

**Main method**

```csharp
namespace UwpConsole
{
    class Program
    {
        static void Main(string[] args)
        {
        }
    }
}
```

Looks a lot like your classic Windows Console applications, doesn't it? :-) Well, just like in your classic console applications, this is going to be our entry point. We now only need to hint Windows where it can find this Main method. For this, we need to open the Package.appxmanifest file.

To begin with, we need to add two extra namespaces: `xmlns:uap5="http://schemas.microsoft.com/appx/manifest/uap/windows10/5"`  and `xmlns:desktop4="http://schemas.microsoft.com/appx/manifest/desktop/windows10/4"`

**Additional namespaces**

```xml
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:mp="http://schemas.microsoft.com/appx/2014/phone/manifest"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:uap5="http://schemas.microsoft.com/appx/manifest/uap/windows10/5"
  xmlns:desktop4="http://schemas.microsoft.com/appx/manifest/desktop/windows10/4"
  IgnorableNamespaces="uap mp desktop4 uap5">
```

Now, we can start using these namespaces in our appxmanifest. Next, we need to tell that this app will run in the console (and can run in multiple instances). This can be done by adding the following attributes to the Application element: `desktop4:Subsystem="console" desktop4:SupportsMultipleInstances="true"` . Also we need point the `EntryPoint` attribute to the class, containing our Main method. So in the end, the entire Application tag will look something like this:

**Updated Application tag**

```xml
<Application Id="App"
  Executable="$targetnametoken$.exe"
  EntryPoint="UwpConsole.Program"
  desktop4:Subsystem="console"
  desktop4:SupportsMultipleInstances="true">
```

Now, we can already run the application from Visual Studio! If everything is correct, a Console window will pop-up. Probably, the window will also immediately close, just like with classic Console applications. So let's put some code in our Main method:

**Main method**

```csharp
static void Main(string[] args)
{
    Console.WriteLine("Hello UWP Console!");
    Console.ReadKey();
}
```

Cool! Our first UWP Console app! And just like you would expect: if you add 'Command Line Arguments' to your Start options (right-click your project -> properties -> Debug), you'll get them in your Main method through the `args` parameter!

# But wait, there's more!

Now we have an app that can be launched just like a regular UWP app, but instead of showing a UI, a console window opens up. That's cool, but wouldn't it be great if we could run our console app from, well..., the console itself?

In order to accomplish this, we need to add an AppExecutionAlias to the Appxmanifest file:

**appExecutionAlias**

```xml
<Extensions>
  <uap5:Extension
      Category="windows.appExecutionAlias"
      Executable="UwpConsole.exe"
      EntryPoint="UwpConsole.Program">
    <uap5:AppExecutionAlias desktop4:Subsystem="console">
      <uap5:ExecutionAlias Alias="UwpConsole.exe" />
    </uap5:AppExecutionAlias>
  </uap5:Extension>
</Extensions>
```

The Alias that you provide in the ExecutionAlias element, is the alias that you will be able to use from the console:

![](/wp-content/uploads/2018/04/UwpConsole.jpg)

FYI: If you go to Settings in Windows and select Apps, there's this link 'Manage app execution aliases'. If you click this link, you'll get an overview of all apps that have an alias registered on your system:

# ![](/wp-content/uploads/2018/04/Aliases.jpg)

# Let's do something cool!

Now that we got our very basic app running, let's talk to a UWP api from it. How about triggering a toast notification from the console?

**Sending toast notification from the console**

```csharp
static void Main(string[] args)
{
    string content, title;
    if (args.Length == 2)
    {
        title = args[0];
        content = args[1];
    }
    else
    {
        Console.Write("\nPlease enter the content for you notification: ");
        content = Console.ReadLine();
        Console.Write("Please enter the title for your notification: ");
        title = Console.ReadLine();
    }

    Console.Write("\nSending notification...");

    ToastNotifier notifier = ToastNotificationManager.CreateToastNotifier();
    XmlDocument toastXDoc = ToastNotificationManager.GetTemplateContent(ToastTemplateType.ToastText02);
    XmlNodeList toastNodes = toastXDoc.GetElementsByTagName("text");
    toastNodes.Item(0).AppendChild(toastXDoc.CreateTextNode(title));
    toastNodes.Item(1).AppendChild(toastXDoc.CreateTextNode(content));
    IXmlNode toastNode = toastXDoc.SelectSingleNode("/toast");
    XmlElement audioElem = toastXDoc.CreateElement("audio");
    audioElem.SetAttribute("src", "ms-winsoundevent:Notification.Reminder");

    ToastNotification toast = new ToastNotification(toastXDoc);
    notifier.Show(toast);

    Console.WriteLine("Notification sent!");
    Console.ReadKey();
}
```

![](/wp-content/uploads/2018/04/UwpConsoleNotification-1.webp)

You can find this code on [GitHub](https://github.com/PieEatingNinjas/UwpConsoleApp/tree/master "UwpConsoleApp").

Another example of a UWP Console app can be found in [this blogpost](/2018/05/15/image-classification-with-winml-and-uwp/ "Image classification with WinML and UWP"). In this post we use a UWP Console app that does image classification using WinML.

# That's it

Yet another cool new UWP thing coming to RS4! Curious to see what tools or other stuff you guys will be building and publishing through the store! Or maybe some awesome text-based adventure game? (I'd pay for that ;-) )
