---
title: "Watch for changes in Blazor WASM to automatically reload your page"
description: "The first times I used Blazor WASM, I found it annoying that I wasn't able to make changes to the HTML while debugging and immediately see the result in the browser. As a developer"
pubDate: "2021-02-06"
legacy: {"id":1734,"path":"/2021/02/06/watch-for-changes-in-blazor-wasm-to-automatically-reload-your-page/","taxonomySlugs":{"categories":["blazor","visual-studio"],"tags":[]}}
categories: ["blazor","visual-studio"]
tags: []
---

The first times I used Blazor WASM, I found it annoying that I wasn't able to make changes to the HTML while debugging and immediately see the result in the browser.

As a developer mainly working with XAML in frontends, I got so used to things like Hot Reload that allow me to change my XAML while debugging and directly see the changes on the screen. The improves the feedback loop drastically and lets me quickly iterate when finetuning and debugging my UI. Lots of (JS) UI frameworks support something similar as well.

Luckily, it is possible to achieve something similar while working with Blazor WASM. The trick is to NOT start debugging your project from Visual Studio, but rather from the command line.

If you use the following parameters, your application will automatically reload when you make changes to your files:

```bash
dotnet watch run
```

Have fun while working with Blazor!
