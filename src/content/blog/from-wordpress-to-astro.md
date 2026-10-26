---
title: "Out with WordPress, in with Astro"
description: "I moved my blog from WordPress to Astro and GitHub Pages. Here is how I migrated the posts and comments, kept the old URLs, and used Copilot along the way."
pubDate: "2026-10-26"
categories: ["astro", "copilot", "github-pages", "wordpress"]
tags: []
---

It was time for a refresh. My blog had been running on WordPress for years, and last weekend I finally moved it to a new home: Astro, hosted on GitHub Pages.

The result is still my blog, with the same posts and the same URLs. But there is no PHP site to maintain, and I can cancel the WordPress hosting.

## Static site, custom domain

The site is built with Astro as a static site. The content lives in the repository as Markdown, and a build produces the files that GitHub Pages hosts. No database, no runtime server, and no WordPress updates to keep an eye on.

The site is published at [blog.pieeatingninjas.be](https://blog.pieeatingninjas.be), with the custom domain pointing to GitHub Pages. Astro takes care of the pages, while GitHub Pages serves the finished site.

For comments, I added Giscus, which uses GitHub Discussions. I also brought over the comments from the old blog using WordPress's export. That saved me from having to copy them over by hand, and it means the history is still there.

Google Analytics is still available, but it only runs after a visitor gives consent. The blog should not need to track everyone just because it can.

## Keeping the old stuff

There were quite a few posts to migrate. I wanted every old post to keep its original URL, so links from years ago would still work. The old posts are now Markdown files, and the existing dated URLs are preserved.

Some of those old posts had code samples embedded as images. Yes, we all make questionable choices sometimes. I converted those back into actual text and code blocks, which makes them easier to read, copy, and search.

I also reduced image sizes where it made sense. For images Astro can process, it can generate optimized output as part of the build.

## Copilot as a migration buddy

I used Copilot throughout the project. I started with the idea, put the WordPress export and the existing site into the project, and iterated from there. Copilot helped with the migration, the Astro implementation, and the less exciting details like keeping routes and content consistent.

It was not a one-shot prompt that magically produced a finished blog. I reviewed the output, tested the pages, fixed things that did not look right, and kept going until the site was in good shape. Still, having Copilot available made a weekend-sized side project feel very doable.

Astro and GitHub Pages turned out to be a nice fit for a content-heavy personal blog: fast pages, straightforward hosting, and content I can manage right alongside the code.

The new blog is live. The old posts are still where you expect them, and I can finally say goodbye to my PHP WordPress hosting bill.
