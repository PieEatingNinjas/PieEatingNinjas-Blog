---
title: "Using Rx in a UWP project with MVVM"
description: "Intro My team and I are currently working on a UWP project which is a complete rewrite of a WinRT app that we have been building.Recently we started development on the 'Search' fun"
pubDate: "2015-11-14"
legacy: {"id":132,"path":"/2015/11/14/using-rx-in-a-uwp-project-with-mvvm/","taxonomySlugs":{"categories":["c","mvvm","rx","uwp"],"tags":["c","mvvm","rx","uwp"]}}
categories: ["C#","mvvm","rx","uwp"]
tags: ["C#","mvvm","rx","uwp"]
codeRepositories: ["https://github.com/PieEatingNinjas/TestRxUniversal"]
---

# Intro

My team and I are currently working on a UWP project which is a complete rewrite of a WinRT app that we have been building.Recently we started development on the 'Search' functionality. It's that typical search paradigm: only hit the backend when the user has at least typed 3 characters and when he hasn't typed anything in the searchbox for 500ms. And, ofcourse, cancel an ongoing search operation when the user changes his search query. It's the same functionality that we built before in our (almost legacy) WinRT app. Back in days we used _CancellationTokens_ and _Task.Delay_ to do the job. And it worked well! But, I didn't like the code to be honest, passing that cancellationToken around, cancelling it when needed, checking if it hadn't been cancelled yet...

```csharp
private void TryDoSearch()
{
    Results = null;

    if (cancellationTokenSource != null)
        cancellationTokenSource.Cancel();

    cancellationTokenSource = new CancellationTokenSource();

    try
    {
        DoSearch(cancellationTokenSource.Token);
    }
    catch(TaskCanceledException)
    {
    }
}

private async void DoSearch(CancellationToken token)
{
    try
    {
        token.ThrowIfCancellationRequested();
        
        await Task.Delay(500, token);

        var result = await SearchDataService.SearchAsync(EnteredSearchQuery, token);

        token.ThrowIfCancellationRequested();

        Results = result?.Select(a => a.thumb_url).ToList();

    }
    catch (TaskCanceledException)
    {
    }
}
```

Note that this or any code sample in the post, isn't really our 'production' code of our project. I've mimicked it so I could easily share it. Also, the code shown here might not be production-ready yet, it might need some additional tweaking before using it in a production environment.

# Using Rx

This time around I said to my team to take a look at _Reactive Extensions_ (Rx) in order see if we could implement this search thing in a cleaner way. So we did and the initial result looked somewhat like this (code-behind of the view):

**Doing all the RX stuff in code-behind**

```csharp
var textChangedSequence =
    Observable.FromEventPattern<TextChangedEventArgs>(SearchBox, 
    nameof(SearchBox.TextChanged));

var throttledTextChangedSequence =
    textChangedSequence.Select(x => ((TextBox)x.Sender).Text)
          .DistinctUntilChanged()
          .Throttle(TimeSpan.FromSeconds(.5));

var result = (from qry in throttledTextChangedSequence
              from images in SearchDataService.Search(qry)
                  .TakeUntil(throttledTextChangedSequence)
              select images);

result.ObserveOn(SynchronizationContext.Current).Subscribe(
    (e) => ViewModel.Results = e?.Select(a => a.thumb_url).ToList());
```

I'll explain, very high level, what this code does, I'm not going to elaborate too much on Rx itself (see links at the bottom of this post for more information about Rx). First, we create an _IObservable_ sequence of the _TextChanged_ event of our _SearchBox_. This means, each time this particular event is triggered, the sequence will push the data of this event. The data that will get pushed to us is of type _EventPattern_ that holds the same information that you would get when handling the event: a sender (object) and eventArgs (_TextChangedEventArgs_ in this case). Next, as we are only interested in the _Text_ that has been entered in the _TextBox_ and not in the eventArgs or anything else, we cast the sender to a _TextBox_ and select the _Text_ property. The _Throttle_ operator handles our 'timeout' of 500ms: this means that the _IObservable_ sequence only pushes an item after 500ms, instead of 'realtime'.

So what this code does in human language: when the text of the _TextBox_ changes, the _IObservable_ sequence pushes us the entered text after 500ms. If the text changes within these 500ms, only this new value will get pushed (after 500ms), the previous item won't. It's exactly on that moment when we get the entered text from our _IObservable_ sequence, that we want to launch our search request to the server. And that is what we do in the following code:

**Launching Search call for the entered query**

```csharp
var result = (from qry in throttledTextChangedSequence
                          from images in SearchDataService.Search(qry)
                              .TakeUntil(throttledTextChangedSequence)
                          select images);
```

We also added an additional method to our SearchDataService, one that accepts a query string and returns an _IObservable<IEnumerable<Result>>_

```csharp
internal static IObservable<IEnumerable<Result>> Search(string qry)
{
    return Observable.FromAsync(() => SearchAsync(qry));
}
```

So when an item is pushed in the throttledTextChangedSequence, we do a call to our _SearchDataService_ and return the result as an IObservable.

Finally, we are going to subscribe to our result sequence so that we can define what code needs to execute whenever a search query is executed. In this scenario, we want to update the _Results_ property of our _ViewModel_ with the result of our search. From each result, we are only interested in the thumb\_url.

**Selecting the thumb\_url and update the Results property. **

```csharp
result.ObserveOn(SynchronizationContext.Current).Subscribe(
                (e) => ViewModel.Results = e?.Select(a => a.thumb_url).ToList());
```

And that's it! Bye bye _CancellationTokens_... But is this code realy more elegant?

# Let's try to make this code more elegant!

Well, while the above code works, and it's already a bit cleaner than working with _CancellationTokens_, it is far from being elegant. This block of code in code-behind just feels wrong in an MVVM architecture (although I believe that, in some scenarios you sometimes better 'break the architectural rules' rather writing complex workarounds). There has got to be a cleaner way to do this. So I came up with the following: move this code to the _ViewModel_ and instead of converting the _TextChanged_ event of my _TextBox_ to an _IObservable_ sequence, I'm going to convert the _PropertyChanged_ event of my _QueryText_ property:

**Rx on our ViewModel**

```csharp
var textChangedSequence = Observable.FromEventPattern<PropertyChangedEventArgs>(this,
    nameof(PropertyChanged));

var throttledTextChangedSequence = textChangedSequence
    .Where(a => a.EventArgs.PropertyName == nameof(EnteredSearchQuery))
    .Select(a => EnteredSearchQuery)
    .DistinctUntilChanged()
    .Throttle(TimeSpan.FromSeconds(.5));

var result = from qry in throttledTextChangedSequence
             from images in SearchDataService.Search(qry).TakeUntil(throttledTextChangedSequence)
             select images?.Select(a => a.thumb_url);

throttledTextChangedSequence.ObserveOn(
    SynchronizationContext.Current).Subscribe(e => UpdateList(null));

result.ObserveOn(
    SynchronizationContext.Current).Subscribe(UpdateList);
```

This already felt a bit better... Notice though, that I have to do a bit more work here because I have to filter out the event coming from the property we are actually interested in by using an additional Where statement: _Where(a => a.EventArgs.PropertyName == nameof(EnteredSearchQuery))._

But, there is still a lot of ceremony right? A lot of which should be repeated if we would like to convert the _PropertyChanged_ event of an other property to an _IObservable_ sequence.

Let's make this a little bit more generic, by creating an _Extension_ method on the _INotifyPropertyChanged_ interface as almost all of your ViewModels will implement this. This method should accept one parameter, a parameter that reflects the property we are interested in. We can make the type of this parameter an _Expression<Func<T>>_ (the same type of parameter as used in the MVVM Light's _RaisePropertyChanged_ method). This way we can pass in all the information we need from the property with only one parameter. In this method, we'll just create an _IObservable_ from an event, just like we did previously. This time, the target parameter is going to be the class that implements _INotifiyPropertyChanged_ on which we call this method. The event we want to convert to an _IObservable_ is the _PropertyChanged_ event. For this we can use the nameof expression so we avoid typos and don't need to use 'magic strings'. We'll also need to use the _Where_ clause we had before in order to filter out the event coming from the property we are interested in. The name of the property can also be retreived via our parameter. The last thing we want to do is returning the actual value of our property. All put together:

**Generic GetPropertyAsObservable ExtensionMethod **

```csharp
public static IObservable<T> GetPropertyAsObservable<T>(this INotifyPropertyChanged @class,
    Expression<Func<T>> property)
{
    var propName = (property.Body as MemberExpression).Member.Name;

    return Observable.FromEventPattern<PropertyChangedEventArgs>(@class,
        nameof(@class.PropertyChanged))
        .Where(a => a.EventArgs.PropertyName == propName)
        .Select(a => property.Compile().Invoke());
}
```

Usage:

**Using the GetPropertyAsObservable Extension Method **

```csharp
var throttledTextChangedSequence = this.GetPropertyAsObservable(() => EnteredSearchQuery)
                      .DistinctUntilChanged()
                      .Throttle(TimeSpan.FromSeconds(.5));
```

**The final result**

```csharp
var throttledTextChangedSequence = this.GetPropertyAsObservable(() => EnteredSearchQuery)
          .DistinctUntilChanged()
          .Throttle(TimeSpan.FromSeconds(.5));

var result = from qry in throttledTextChangedSequence
             from images in SearchDataService.Search(qry).TakeUntil(throttledTextChangedSequence)
             select images?.Select(a => a.thumb_url);

throttledTextChangedSequence.ObserveOn(
    SynchronizationContext.Current).Subscribe(e => UpdateList(null));

result.ObserveOn(
    SynchronizationContext.Current).Subscribe(UpdateList);
```

# Conclusion

In this blogpost I showed you how you can use _Reactive Extensions_ in a particular scenario. The main purpose was to look if we could get our 'legacy' code a bit cleaner without the usage of _CancellationTokens_. I worked out a way to integrate this nicely in an MVVM architecture, without needing to use an entire 3rd party toolset or framework (other than Rx itself ofcourse).

I can think of at least one scenario in our App where the usage of Rx might result in some cleaner code. One of these days I'm going to work that out, and will probably put the result on my blog.

## Links

Example Source Code: [GitHub](https://github.com/PieEatingNinjas/TestRxUniversal "GitHub")

The Rx Team's blog: [http://blogs.msdn.com/b/rxteam/](http://blogs.msdn.com/b/rxteam/)

Beginner's guide to Rx: [https://msdn.microsoft.com/en-us/data/gg577611.aspx](https://msdn.microsoft.com/en-us/data/gg577611.aspx)
