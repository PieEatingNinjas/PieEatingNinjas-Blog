---
title: "Setting up a basic MVVM architecture in .NET MAUI"
description: "Update December 2023 This blogpost was originally posted in February 2022. Since then, .NET MAUI and my insights have evolved a bit. On the other hand, lots of the things discussed"
pubDate: "2022-02-11"
legacy: {"id":1828,"path":"/2022/02/11/setting-up-a-basic-mvvm-architecture-in-net-maui/","taxonomySlugs":{"categories":["c","maui","mvvm","xamarin"],"tags":[]}}
categories: ["C#","maui","mvvm","xamarin"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/MAUI_MVVM_Demo"]
---

### Update December 2023

This blogpost was originally posted in February 2022. Since then, .NET MAUI and my insights have evolved a bit. On the other hand, lots of the things discussed in this blogpost are still valid today. However, if you want to have a comprehensive understanding about MVVM in .NET MAUI, I highly recommend to have a look at my book which is 100% dedicated to leveraging the MVVM pattern in .NET MAUI. My book "**The MVVM Pattern in .NET MAUI: The definitive guide to essential patterns, best practices, and techniques for cross-platform app development**" is available on [Amazon](https://www.amazon.com/MVVM-Pattern-NET-MAUI-cross-platform/dp/1805125001/) and many others. Click [here](/2023/12/01/i-wrote-a-book/ "I Wrote a book…") for more info.

# Intro

The MAUI-team seems to be on a roll! We've seen multiple preview releases over the last months and with every release the product visibly improves!

Last week I installed Preview 12 with the idea of creating a basic MVVM architecture for my future MAUI apps. I've done this multiple time in the past with Xamarin.Forms and I wanted to see how different this would be in MAUI.

In the past, I've been working with both _Prism_ and _FreshMVVM_. Both libraries are great to speed up your development process, as a lot of complex boilerplate code is already done for you! But -mostly for very small apps- I've previously also chose to not take a dependency on a third party library, and set up my app using my own little 'framework'.

I noticed that, at this moment of writing, both _Prism_ and _FreshMVVM_ aren't quite there yet with MAUI. I've seen both frameworks doing great on earlier bits, but now on Preview 12 I'm not getting anything from them. Which, of course, is totally understandable: with all these preview releases rolling out, the maintainers of these projects have a ton of work to keep everything working, for which I have nothing but huge respect!

# The basic idea

So the idea is to set up my own little 'MVVM framework' with the following features:

-   Have Dependency Injection (DI) working
-   Ability to bind ViewModels to Views
-   Simple navigation from the ViewModels (only 'linear' navigation, forward, back, no tabs or drawer navigation)
-   Ability to pass parameters when navigating
-   Trigger events or call functions when navigating

# Dependency injection

One of the awesome new things in MAUI is that we now have a DI container at our disposal out-of-the-box. Just like with ASP.NET Core applications, there's now this '_Builder_' that let's you configure your application in a fluent style and which exposes a DI container through the Builder's _Services_ property.

If we want, for example, to add our _MainPage_ class to the DI container, we can do this as follows:

```csharp
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
            });

        builder.Services.AddTransient<MainPage>();

        return builder.Build();
    }
}
```

If we now add a parameter of type _MainPage_ to the constructor of the _App_ class, the DI container will inject an instance when an the _Builder_ resolves an instance of the _App_ class:

```csharp
public App(MainPage mainPage)
{
    InitializeComponent();

    MainPage = new NavigationPage(mainPage);
}
```

So, to have DI working, we don't need to do anything special because we already get this out of the box.

## Binding ViewModels to Views

We can use this mechanism as well to inject a _ViewModel_ into our _View_. The only thing we have to do, is adding a constructor parameter to our _MainPage_, and make sure we register such a type (_MainPageViewModel_ for example) in our DI container.

```csharp
public MainPage(MainPageViewModel viewModel)
{
    BindingContext = viewModel;
    InitializeComponent();
}
```

```csharp
public static MauiApp CreateMauiApp()
{
    var builder = MauiApp.CreateBuilder();
    builder
        .UseMauiApp<App>()
        .ConfigureFonts(fonts =>
        {
            fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
        });

    builder.Services.AddTransient<MainPage>();
    builder.Services.AddTransient<MainPageViewModel>();

    return builder.Build();
}
```

This means that when an instance of _App_ is resolved, _MainPage_ needs to be resolved and all of its dependencies, like in this example _MainPageViewModel_. If said ViewModel would have a dependency (like a Service or Repository) on itself, which needs to be injected through the constructor, the DI container will (try to) resolve all of them. If you wouldn't have registered a particular type which is a dependency of another type, a _System.InvalidOperationException_ will be thrown, as you might expect.

The following code demonstrates how you can add a dependency of an _IDataService_ interface to the _MainPageViewModel_, and how to register a concrete implementation of said interface.

```csharp
public class MainPageViewModel
{
    readonly IDataService _dataService;
    public MainPageViewModel(IDataService dataService)
    {
        _dataService = dataService;
    }
}
```

```csharp
builder.Services.AddSingleton<IDataService, DataService>();
```

How cool is this? Because of the built-in DI container in MAUI, we can make this all work without the need of any third party library!

So how could we do some simple navigation?

# NavigationService

A _NavigationService_ should be responsible for.... navigation, of course. It should expose methods that can be called in order to navigate from one page to another, and passing parameters from one ViewModel to another. I would like a _NavigationService_ to be injected in my ViewModels, so that I can perform a navigation from a command that was triggered when the user tapped a button, for example. Injecting such a _NavigationService_ into our ViewModels is the easy part, thanks to MAUI's baked-in DI container.

How can we implement the navigation itself? Well, navigation in MAUI is done through the _INavigation_ interface. Once we get a hold of an implementation of that interface, we can do stuff like _PushAsync_, _PopAync_, _PushModalAsync_, ... Every _Page_ in MAUI has a _Navigation_ property which is of type _INavigation_. But in our 'framework', the ViewModel doesn't know the Page, it doesn't have a reference to it. Luckily, we can access the _App_'s _MainPage_ and get its _Navigation_ property:

```csharp
INavigation navigation = App.Current.MainPage.Navigation;
```

Of course, this is only accessible once the _MainPage_ property is set, which is typically done in the constructor of the _App_ class.

Let's take a look at what the first implementation of my _NavigationService_ looks like:

```csharp
public class NavigationService : INavigationService
{
    readonly IServiceProvider _services;

    protected INavigation Navigation
    {
        get
        {
            INavigation? navigation = Application.Current?.MainPage?.Navigation;
            if (navigation is not null)
                return navigation;
            else
            {
                //This is not good!
                if (Debugger.IsAttached)
                    Debugger.Break();
                throw new Exception();
            }
        }
    }

    public NavigationService(IServiceProvider services)
        => _services = services;

    public Task NavigateToSecondPage()
    {
        var page = _services.GetService<SecondPage>();

        if (page is not null)
            return Navigation.PushAsync(page, true);

        throw new InvalidOperationException($"Unable to resolve type SecondPage");
    }
}
```

Let' break this down!

Firstly, the _Navigation_ property provides access to the _Navigation_ property of the _App_'s _MainPage_. This is just for convenience inside the _NavigationService_.

Secondly, you'll notice that the _NavigationService_ has a constructor with a parameter of type _IServiceProvider_. We can use this _ServiceProvider_ to resolve the classes or instances we registered in the _MauiProgram_ class. This _ServiceProvider_ will get injected when we resolve an instance of the _NavigationService_, and we'll set this _ServiceProvider_ as a readonly field on our class.

Finally, there is a _NavigateToSecondPage_ method. This is the kind of method that should be called from a ViewModel that gets this _NavigationService_ injected. By using the injected _IServiceProvider_, we'll try to resolve the type of page we want to navigate to. Once we have resolved an instance, we use the _Navigation_ property of type _INavigation_ to navigate to the resolved instance. While we resolved the requested page, the DI container will have resolved all dependencies, like a ViewModel and its dependencies, as long as everything was registered in our container.

We can even clean the _NavigateToSecondPage_ up, as most of the code in there can be reused once we add methods to navigate to other pages:

```csharp
public Task NavigateToSecondPage()
    => NavigateToPage<SecondPage>();

private Task NavigateToPage<T>() where T : Page
{
    var page = ResolvePage<T>();

    if(page is not null)
        return Navigation.PushAsync(page, true);

    throw new InvalidOperationException($"Unable to resolve type {typeof(T).FullName}");
}

private T? ResolvePage<T>() where T : Page
    => _services.GetService<T>();
```

We could even take it a step further and move these methods (_NavigateToPage_ and _ResolvePage_), together with the _IServiceProvider_ field and the _Navigation_ property to a base class and even put this in a separate library. But that's outside the scope of this blogpost ;-)

Now that we have the _NavigationService_ in place we can register it in our DI container, along with our new Page and its ViewModel:

```csharp
builder.Services.AddTransient<SecondPage>();
builder.Services.AddTransient<SecondPageViewModel>();
builder.Services.AddSingleton<INavigationService, NavigationService>();
```

Next, we can update the _MainPageViewModel_ so that an instance of type _INavigationService_ is injected and call its _NavigateToSecondPage_ method in a command, for example:

```csharp
public class MainPageViewModel
{
    readonly IDataService _dataService;
    readonly INavigationService _navigationService;

    public Command NavigateCommand 
        => new Command(async () => await _navigationService.NavigateToSecondPage());

    public MainPageViewModel(IDataService dataService, INavigationService navigationService)
    {
        _dataService = dataService;
        _navigationService = navigationService;
    }
}
```

All that's left to do, is bind this _NavigateCommand_ to a _Button_ in XAML:

```xml
<Button 
    Text="Click me"
    FontAttributes="Bold"
    Grid.Row="3"
    Command="{Binding NavigateCommand}"
    HorizontalOptions="Center" />
```

Tapping this button will call the _MainPageViewModel_'s (our BindingContext) _NavigateCommand_, which will call the _NavigationService_'s _NavigateToSecondPage_ method which will perform the actual navigation by resolving an instance of  type _SecondPage_ and navigate to that via the _App_'s _MainPage'_s _Navigation_ property.

## Can we also navigate back?

Of course we can! Because we have access to an _INavigation_ in our _NavigationService_, we can implement other stuff here as well: opening pages as Modal, manipulating the NavigationStack, navigating back,...

All we have to do, is expose a method in the _NavigationService_ (and the _INavigationService_ interface) which implements the thing you want to achieve. Then you can call that method from your ViewModel.

NavigationService:

```csharp
public Task NavigateBack()
{
    if (Navigation.NavigationStack.Count > 1)
        return Navigation.PopAsync();

    throw new InvalidOperationException("No pages to navigate back to!");
}
```

INavigationService:

```csharp
public interface INavigationService
{
    Task NavigateToSecondPage();
    Task NavigateBack();
}
```

SecondPageViewModel:

```csharp
public class SecondPageViewModel
{
    readonly INavigationService _navigationService;

    public Command GoBackCommand
        => new Command(async () => await _navigationService.NavigateBack());

    public SecondPageViewModel(INavigationService navigationService)
    {
        _navigationService = navigationService;
    }
}
```

SecondPage:

```xml
<Button 
    Text="Go back!"
    FontAttributes="Bold"
    Grid.Row="3"
    Command="{Binding GoBackCommand}"
    HorizontalOptions="Center" />
```

The result:

![Navigation](/wp-content/uploads/2022/02/MauiNavigation.webp)

# Passing parameters and more

This is all fun and games, but without being able to properly pass parameters from one page to an other, it's not that very useful. On top of that, when navigating to or from a page, ideally some methods on your ViewModels should be called to do stuff like fetching or cleaning-up data.

Let's add a _ViewModelBase_ class with three methods: _OnNavigatingTo_, _OnNavigatedFrom_ and _OnNavigatedTo_

```csharp
public virtual Task OnNavigatingTo(object? parameter)
    => Task.CompletedTask;

public virtual Task OnNavigatedFrom(bool isForwardNavigation)
    => Task.CompletedTask;

public virtual Task OnNavigatedTo()
    => Task.CompletedTask;
```

These methods stand for the following:

-   **OnNavigatingTo** is called when navigating 'forward' to a View(Model). It accepts a parameter of type object which allows us to pass a parameter from one ViewModel to another.
-   **OnNavigatedFrom** is called when we navigate away from a View(Model). The parameter _isForwardNavigation_ indicates if we're navigating forward from this view to another (true), or if we navigate back from this view to the previous one (false). The later is particularly interesting to clean-up stuff as the page is no longer in the NavigationStack.
-   **OnNavigatedTo** is called when we have navigated to a View(Model). This method is called when we navigate to a new View (forward navigation) AND also when we navigate back to a View (back navigation)

In order to call these methods, we need to add some extra code to the _NavigationService_ and make sure our ViewModels inherit _ViewModelBase_.

First, let's take a look at the updated _NavigateToPage_ method:

```csharp
private async Task NavigateToPage<T>(object? parameter = null) where T : Page
{
    var toPage = ResolvePage<T>();

    if (toPage is not null)
    {
        //Subscribe to the toPage's NavigatedTo event
        toPage.NavigatedTo += Page_NavigatedTo;

        //Get VM of the toPage
        var toViewModel = GetPageViewModelBase(toPage);

        //Call navigatingTo on VM, passing in the paramter
        if (toViewModel is not null)
            await toViewModel.OnNavigatingTo(parameter);

        //Navigate to requested page
        await Navigation.PushAsync(toPage, true);

        //Subscribe to the toPage's NavigatedFrom event
        toPage.NavigatedFrom += Page_NavigatedFrom;
    }
    else
        throw new InvalidOperationException($"Unable to resolve type {typeof(T).FullName}");
}
```

The first thing that's added is the fact that this method now accepts an optional parameter which will serve as the parameter we can pass from one view to another.

Next, once we've resolved the page we want to navigate to, we're going to subscribe to its _NavigatedTo_ method. We'll see the implementation of that in just a second, but you can already guess what it'll do.

Another thing we added to this method, is the thing were we want to get the page's ViewModel, of type _ViewModelBase_. Nothing fancy going on in this _GetPageViewModelBase_ method:

```csharp
private ViewModelBase? GetPageViewModelBase(Page? p)
    => p?.BindingContext as ViewModelBase;
```

But back to the _NavigateToPage_ method, once we have the _ViewModelBase_, we're going to call our newly created method _OnNavigatingTo_, passing in the parameter.

After that, we're going to navigate to our page and finally also subscribe to the Page's _NavigatedFrom_ event.

Let's see what the _NavigatedTo_ eventhandler that I talked about earlier looks like:

```csharp
private async void Page_NavigatedTo(object? sender, NavigatedToEventArgs e)
    => await CallNavigatedTo(sender as Page);

private Task CallNavigatedTo(Page? p)
{
    var fromViewModel = GetPageViewModelBase(p);

    if (fromViewModel is not null)
        return fromViewModel.OnNavigatedTo();
    return Task.CompletedTask;
}
```

Pretty straightforward, isn't it? When it's called, we are going to see if the page has a _ViewModelBase_. If that's the case, we are going to call the ViewModel's _OnNavigatedTo_ method.

The final thing we need to take a look at, is the _NavigatedFrom_ eventhandler:

```csharp
private async void Page_NavigatedFrom(object? sender, NavigatedFromEventArgs e)
{
    //To determine forward navigation, we look at the 2nd to last item on the NavigationStack
    //If that entry equals the sender, it means we navigated forward from the sender to another page
    bool isForwardNavigation = Navigation.NavigationStack.Count > 1 
        && Navigation.NavigationStack[^2] == sender;

    if (sender is Page thisPage)
    {
        if (!isForwardNavigation)
        {
            thisPage.NavigatedTo -= Page_NavigatedTo;
            thisPage.NavigatedFrom -= Page_NavigatedFrom;
        }

        await CallNavigatedFrom(thisPage, isForwardNavigation);
    }
}

private Task CallNavigatedFrom(Page p, bool isForward)
{
    var fromViewModel = GetPageViewModelBase(p);

    if (fromViewModel is not null)
        return fromViewModel.OnNavigatedFrom(isForward);
    return Task.CompletedTask;
}
```

The _NavigatedFrom_ event is triggered by MAUI when we navigate away from a particular page. This can be in one of two ways: or you navigate forward from that page to another, or you navigate back from the page to the previous page. The fact that the navigation is forward or backward is very valuable information, so we want to pass this to ViewModel we've navigated from.

By looking at the _NavigationStack_ we can determine which way (forward or backward) we've navigated. If we've navigated forward from a particular page, that page should be the 2nd to last item in the _NavigationStack_ (as the page we've navigated to will be the last page in the stack). If that's not the case, we've navigated back. Makes sense?

Important to notice here is the fact that when it's a back navigation, we want to unsubscribe from the page's events! That way the page and ViewModel can be GC'ed as there are no more references to the page anymore.

So once we've determined if its forward or backward navigation, unsubscribed from events (if needed), we can look up de Page's _ViewModelBase_ and call its _OnNavigatedFrom_ method.

With all of this in place, we can now start passing parameters from one ViewModel to another. If, for example _SecondPageViewModel_ needs to get an id to be properly initialized, we need to do the following:

INavigationService:

```csharp
Task NavigateToSecondPage(string id);
```

NavigationService:

```csharp
public Task NavigateToSecondPage(string id)
    => NavigateToPage<SecondPage>(id);
```

MainPageViewModel:

```csharp
public Command NavigateCommand
    => new Command(async () => await _navigationService.NavigateToSecondPage("some id"));
```

SecondPageViewModel:

```csharp
public override Task OnNavigatingTo(object? parameter)
{
    Console.WriteLine($"On navigating to SecondPage with parameter {parameter}");
    return base.OnNavigatingTo(parameter);
}
```

## One final thing

With all this navigation stuff in place, there is one final thing we shouldn't forget. Remember how we initially set-up the _MainPage_ property in our _App_? We injected in instance of _MainPage_ in the _App_'s constructor. While this works well, by doing so, we are completely bypassing all the above logic for our first page. Let's make sure these navigation methods are also called on our initial ViewModel. To do so, we only need to tweak the _App_ class a little bit:

```csharp
public App(INavigationService navigationService)
{
    InitializeComponent();
    MainPage = new NavigationPage();
    navigationService.NavigateToMainPage();
}
```

Instead of injecting an instance of _MainPage_, we're going to inject an instance of the _INavigationService_. We'll assign the _MainPage_ property to a new _NavigationPage_, followed by calling _NavigateToMainPage_ on our _NavigationService:_

```csharp
public Task NavigateToMainPage()
    => NavigateToPage<MainPage>();
```

# Conclusion

This is what I tinkered together in order to have some sort of navigation in MAUI when building apps in a MVVM-ish architecture.

Purists might argue about a couple of stuff, but this is a basic setup that works for me and that will probably work for simple apps. Of course, established libraries as _Prism_ and _FreshMVVM_ (and others) are a lot more extensive and thought-through than what I cooked up in a few hours. But, I had fun doing it! I hope by sharing this stuff you learned a bit more about MAUI's dependency injection and how you can use it. Or if you are building an app in MAUI and don't want (or aren't allowed) to take a dependency on a third party library, I hope you can get some inspiration from this post found it useful! :-)

While writing this blogpost, I thought of some additional stuff and improvements, so I might keep working a bit on this and I'll share findings on this blog.

For now, the source code of the snippets can be found [here](https://github.com/PieEatingNinjas/MAUI_MVVM_Demo).
