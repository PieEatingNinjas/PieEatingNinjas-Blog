---
title: "UWP randomly throwing System.ExecutionEngineException => a Fix!"
description: "While debugging my UWP apps, I recently started getting this System.ExecutionEngineExeptionrandomly (roughly 50% of the time) when navigating to a new page. Today I finally found a"
pubDate: "2021-02-03"
legacy: {"id":1728,"path":"/2021/02/03/uwp-randomly-throwing-system-executionengineexception-a-fix/","taxonomySlugs":{"categories":["uwp"],"tags":[]}}
categories: ["uwp"]
tags: []
---

While debugging my UWP apps, I recently started getting this `System.ExecutionEngineExeption` randomly (roughly 50% of the time) when navigating to a new page.

![](/wp-content/uploads/2021/02/ExecutionEngineException.jpg)

Today I finally found a fix for this, thanks to some awesome people on Twitter and in the tech community! The cnoversation started here on [Twitter](https://twitter.com/dotMorten/status/1356839169826279425). As you can read, I already pointed out that I tried to disable all Hot Reload related stuff on UWP, but with limited success. [Timo Partl](https://twitter.com/tipartl) pointed to this [issue on the GitHub](https://github.com/xamarin/Xamarin.Forms/issues/12884) which I apprently missed.

There, [MattRames suggests](https://github.com/xamarin/Xamarin.Forms/issues/12884#issuecomment-735917369) to add the following to your csproj:

```xml
<EnableTypeInfoReflection>false</EnableTypeInfoReflection>
```

Since I've added this to my csproj, I haven't  had this exception any more!

Let's hope Microsoft fixes this issue soon!
