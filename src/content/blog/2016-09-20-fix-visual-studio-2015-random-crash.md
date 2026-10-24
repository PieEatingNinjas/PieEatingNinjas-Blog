---
title: "Fix Visual Studio 2015 random crash"
description: "Visual Studio 2015 randomly crashing -> FIX! A colleague of mine was having issues with Visual Studio 2015. Every now and then his instance of Visual Studio would just crash. He th"
pubDate: "2016-09-20"
legacy: {"id":646,"path":"/2016/09/20/fix-visual-studio-2015-random-crash/","taxonomySlugs":{"categories":["visual-studio"],"tags":[]}}
categories: ["visual-studio"]
tags: []
---

# Visual Studio 2015 randomly crashing -> FIX!

A colleague of mine was having issues with Visual Studio 2015. Every now and then his instance of Visual Studio would just crash. He thought it would crash more often when pressing CTRL+X or Backspace... but I don't believe him, I think it was just random!

After trying out some things (including repairing Visual Studio), we finally could fix the issue by doing the following:

-   Start Visual Studio in 'Safe Mode'![Start Visual Studio in Safe Mode](/wp-content/uploads/2016/09/VS-SafeMode.jpg)
-   Inside Visual Studio, go to Tools -> Import and Export Settings -> Reset all settings and complete the wizard
-   Restart Visual Studio normally

That did the trick!
