---
title: "How to catch multiple types of exceptions in one catch block"
description: "Catch 'em all Last week a colleague asked: what's the best way to catch different types of exceptions that need to be handled in the same way? He saw a couple of options himself, f"
pubDate: "2016-09-26"
legacy: {"id":657,"path":"/2016/09/26/how-to-catch-multiple-types-of-exceptions-in-one-catch-block/","taxonomySlugs":{"categories":["c"],"tags":[]}}
categories: ["C#"]
tags: []
---

# Catch 'em all

Last week a colleague asked: what's the best way to catch different types of exceptions that need to be handled in the same way? He saw a couple of options himself, for example:

```csharp
try
{
    DoSomethingThatCanGoWrong(myVar);
}
catch (ArgumentException aex)
{
    HandleException(aex);
}
catch (FileLoadException flex)
{
    HandleException(flex);
}
catch(Exception)
{
    throw;
}
```

Or an other proposal:

```csharp
try
{
    DoSomethingThatCanGoWrong(myVar);
}
catch(Exception ex)
{
    if (ex is ArgumentException || ex is FileLoadException)
        HandleException(ex);
    else
        throw;
}
```

# Exception Filters

While both of these options work, since C# 6 there is an other way of dealing with this. Since C# 6 we have Exception Filters that allow us to 'filter' our catch-blocks.

So, for example, if we only want to catch our exceptions when the Logger property on our current object isn't null, we could write the following:

```csharp
try
{
    DoSomethingThatCanGoWrong();
}
catch (Exception ex) when(this.Logger != null)
{
    Logger.Log(ex);
}
```

In this when-clause we can basically write any expression that returns a bool.

Thus, if we want to handle multiple types of exceptions in the same way using Exception Filters, we could write this:

```csharp
try
{
    DoSomethingThatCanGoWrong(myVar);
}
catch(Exception ex) when(ex is ArgumentException || ex is FileLoadException)
{
    HandleException(ex);
}
```

One could argue if this approach is better compared to the first two proposals...

Well, it is definitely better than the second one! Why? Because if we would just catch all exceptions and do checks inside that particular catch block, we are always unwinding the stack. Even if we decide -because of the checks- to do nothing with that exception and re-throw it.

For this particular scenario, both the first example and the Exception Filtering approach are good solutions. Honestly, I don't know which approach I prefer... I do like Exception Filters, but I don't know if we should use it for this particular scenario...
