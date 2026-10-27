---
title: "Out with WordPress, in with Astro"
description: "I moved my blog from WordPress to Astro and GitHub Pages. Here is how I migrated the posts and comments, kept the old URLs, and used Copilot along the way."
pubDate: "2026-10-26"
heroImage: "/assets/2611-MoveToAstroHeader.png"
categories: ["astro", "giscus", "copilot", "github-pages", "wordpress"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/PieEatingNinjas-Blog"]
---

It was time for a refresh. My blog had been running on WordPress for years, and last weekend I finally moved it to a new home: Astro, hosted on GitHub Pages.

The result is still my blog, with the same posts and the same URLs. But there is no PHP site to maintain, and I can cancel the WordPress hosting.

## Astro, Markdown, and GitHub Pages

Astro is a web framework for building content-focused websites. In this project, each post is a Markdown file with a little metadata at the top, like its title, date, and categories. Astro combines that content with the site layouts and builds the pages, archives, and other data from it.

This is the interesting bit: while I am editing the site, the content feels dynamic. But when I push a change, the site is rebuilt into plain HTML, JavaScript, and assets. Visitors get those files directly; nothing is generated on the fly.

When I push to `main` (or start the workflow manually), a GitHub Action checks out the repository and uses Astro's GitHub Action to build the site with Node.js 24 and npm. It uploads the generated site as an artifact, then a deploy job publishes that artifact to GitHub Pages. The custom domain, [blog.pieeatingninjas.be](https://blog.pieeatingninjas.be), points to Pages.

The [blog repository](https://github.com/PieEatingNinjas/PieEatingNinjas-Blog) is public now, so you can browse the site source and its [GitHub Pages workflow](https://github.com/PieEatingNinjas/PieEatingNinjas-Blog/blob/main/.github/workflows/deploy.yml). The build step is deliberately small:

```yaml
- name: Build and upload Astro site
  uses: withastro/action@v6
  with:
    node-version: 24
    package-manager: npm
```

The workflow then deploys that artifact with `actions/deploy-pages@v5`.

No database, no WordPress or PHP updates to keep an eye on.

For comments, I added [Giscus](https://giscus.app/), which uses GitHub Discussions. I also brought over the comments from the old blog using WordPress's export. That saved me from having to copy them over by hand, and it means the history is still there.

Google Analytics is still available, but it only runs after a visitor gives consent. The blog should not need to track everyone just because it can.

## Keeping the old stuff

There were quite a few posts to migrate. I wanted every old post to keep its original URL, so links from years ago would still work. The old posts are now Markdown files, and the existing dated URLs are preserved.

Some of those old posts had code samples embedded as images. Yes, we all make questionable choices sometimes. I converted those back into actual text and code blocks, which makes them easier to read, copy, and search.

Some images I had in my blog were hugely oversized, so while I was at it, I resized them as well. 

## Copilot as a migration buddy

I used Copilot throughout the project. I started with the idea, put the WordPress export and the existing site into the project, and iterated from there. Copilot helped with the migration, the Astro implementation, and the less exciting details like keeping routes and content consistent.

When I say "I migrated the blog", there is a small asterisk: I did not write a single line of code. I prompted the agents, reviewed what they came back with, and tested the result. I did not even retype code from screenshots nor did I resize the pictures myself. The agents handled that too.

The VS Code Agents window was my main workspace. I could split the job into smaller tasks and let multiple agents work in parallel, while I checked how the pieces fitted together. I also connected the Astro Docs MCP, so the agents could look up the [Astro documentation](https://docs.astro.build/) as they worked.

While I was on the go, I could kick off a few things from [vscode.dev/agents](https://vscode.dev/agents) through a tunnel to my MacBook. That meant I could keep the migration moving and spend valuable time with my family instead of being tied to the editor.

It was a fun weekend with the family, while I migrated my years-old blog in the background. It was not a one-shot prompt that magically produced a finished blog: I still reviewed the output and tested the pages. Some small details need a bit more love here and there, but this made a weekend-sized side project feel very doable.

Astro and GitHub Pages turned out to be a nice fit for a content-heavy personal blog: fast pages, straightforward hosting, and content I can manage right alongside the code. The [new blog](https://blog.pieeatingninjas.be) is live, the old posts are still where you expect them, and I can finally say goodbye to my PHP WordPress hosting bill. 

All the code behind the blog is available in the [public GitHub repository](https://github.com/PieEatingNinjas/PieEatingNinjas-Blog) if you want to see how it is put together.
