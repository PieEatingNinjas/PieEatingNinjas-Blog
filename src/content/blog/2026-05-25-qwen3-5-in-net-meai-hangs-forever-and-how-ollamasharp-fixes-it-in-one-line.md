---
title: "Qwen3.5 in .NET MEAI Hangs Forever And How OllamaSharp Fixes It in One Line"
description: "If your Microsoft.Extensions.AI.OllamaChatClient call to qwen3.5 never returns, this post is for you. The culprit is Qwen3.5's built-in thinking mode and the fix is switching to a "
pubDate: "2026-05-25"
legacy: {"id":2012,"path":"/2026/05/25/qwen3-5-in-net-meai-hangs-forever-and-how-ollamasharp-fixes-it-in-one-line/","taxonomySlugs":{"categories":["ai","c","llms","ollama"],"tags":[]}}
categories: ["C#","ai","llms","ollama"]
tags: []
heroImage: "/wp-content/uploads/2026/05/llama2.webp"
---

If your `Microsoft.Extensions.AI.OllamaChatClient` call to `qwen3.5` never returns, this post is for you. The culprit is `Qwen3.5`'s built-in thinking mode and the fix is switching to a client that can actually control it.

## My Use Case: Entity Disambiguation Against a Fixed Vocabulary

Imagine you're building an assistant that maps free-form user input onto a fixed list of ~200 canonical values (think official country names, registered company names, product categories, and so on). The prompt includes the full list and instructs the model to return the best match, handling typos, abbreviations, and casing differences:

-   "USA" → "_country:United States_"
-   "Microsft" → "_company:Microsoft_"
-   ...

It's a focused, fast task. You don't need a reasoning powerhouse. Instead you need something small, reliable, and instruction-following. That's exactly where **Qwen3.5:4b** shines.

## Why Qwen3.5?

Qwen3.5 is Alibaba's latest open-weight model family (Apache 2.0 licensed). The 4B variant hits a sweet spot:

-   **Small enough to run locally:** ~3 GB on disk, fits easily in 8–16 GB of unified or system memory
-   **Strong instruction following:** handles structured prompts with a large vocabulary list reliably
-   **Dual-mode:** supports both fast response mode and deep "thinking" mode in the same model, switchable per request
-   **Fast:** especially on Apple Silicon (more on that below)

For disambiguation tasks where correctness matters and latency counts, it consistently punches above its weight class.

## The Problem: Your App Just Hangs

You wire up the standard `Microsoft.Extensions.AI.OllamaChatClient`:

```csharp
var client = new OllamaChatClient("http://localhost:11434", "qwen3.5:4b"); 
var agent = client.AsAIAgent(instructions: prompt);
var response = await agent.RunAsync("MS is a company in the United States of A ...");
```

You run it. Ten seconds pass. Thirty. A minute. Nothing.

**Symptoms:**

-   `RunAsync` never resolves
-   No output, no exception, no timeout
-   `ollama ps` shows the model loaded and running
-   `ollama stop qwen3.5:4b` leaves it stuck on "stopping"
-   The only way out: `pkill -9 ollama` (macOS/Linux) or kill the process in Task Manager (Windows)

## What's Actually Happening: Thinking Mode

Qwen3.5 has a built-in **thinking mode**. Before responding, the model generates an internal chain-of-thought inside `<think>...</think>` blocks. For complex reasoning tasks this is powerful. For a fast lookup task against a 200-item vocabulary, it is probably overkill. I expected this to be the culprit, so for my use case I could happily turn it off:

```csharp
var response = await agent.RunAsync("MS is a company in the United States of A ...", 
        options:new (){ AdditionalProperties = new () { { "think", false } } });
```

Tough luck, still no response... It looks like the `think` parameter is silently being ignored... After some debugging, I found out why:

`OllamaChatClient` routes requests to Ollama's OpenAI-compatible endpoint (`/v1/completions`). Debug logging confirms this:

```text
# With OllamaChatClient:
msg="completion request" ← OpenAI-compatible endpoint
```

That endpoint doesn't support Ollama-native parameters like `think`. Whatever you pass in `AdditionalProperties` is silently dropped. As a result: thinking mode stays on and the hang persists.

## The Fix: Switch to OllamaSharp

[`OllamaSharp`](https://github.com/awaescher/OllamaSharp) is a .NET library (with support for `Microsoft.Extensions.AI`!), built specifically for Ollama's native API. It routes requests to /api/chat instead and debug logs confirm that too:

```text
# With OllamaSharp:
POST "/api/chat" ← native Ollama endpoint
```

On this endpoint, the `think` parameter is actually respected.

After adding the NUGET package, you can simply replace your OllamaChatClient with this:

```csharp
var client = new OllamaApiClient("http://localhost:11434", "qwen3.5:4b");
```

To confirm thinking mode is the culprit: set `Think = true` with `OllamaSharp` and the hang returns. Set it to `false` and you get a response. The parameter makes all the difference.

```csharp
var client = new OllamaApiClient("http://localhost:11434", "qwen3.5:4b"); 
var agent = client.AsAIAgent(instructions: prompt);
var response = await agent.RunAsync("MS is a company in the United States of A ...", 
        options:new (){ AdditionalProperties = new () { { "think", false } } });
```

## On a MacBook? Pull the MLX Variant

Ollama 0.19 (March 2026) introduced an MLX backend for Apple Silicon, replacing the previous llama.cpp/Metal stack. MLX is Apple's own machine learning framework built around the unified memory architecture. This means no copying between CPU and GPU memory and native hardware acceleration throughout. On older versions of Ollama (0.19 preview) you may need to set OLLAMA\_USE\_MLX=1 explicitly before starting Ollama. On 0.24 (the version I'm running) pulling the -mlx model tag is sufficient. The speed difference for the disambiguation task is enormous:

qwen3.5:4b → ~3200ms qwen3.5:4b-mlx → ~2200ms

In practice the end-to-end improvement was closer to 50%, but YMMV depending on your hardware and prompt size.

```bash
# Pull the MLX variant
ollama pull qwen3.5:4b-mlx
```

Then use `"qwen3.5:4b-mlx"` as your model name in OllamaSharp. The `Think = false` flag works exactly the same way.

```csharp
var client = new OllamaApiClient("http://localhost:11434", "qwen3.5:4b-mlx"); 
var agent = client.AsAIAgent(instructions: prompt);
var response = await agent.RunAsync("MS is a company in the United States of A ...", 
        options:new (){ AdditionalProperties = new () { { "think", false } } });
```

## TL;DR

-   `OllamaChatClient` (Microsoft.Extensions.AI) routes to `/v1/completions` → Ollama-native parameters like `think` are silently ignored → Qwen3.5 enters thinking mode → infinite hang
-   Kill stuck Ollama: `pkill -9 ollama`
-   Switch to `OllamaApiClient` (OllamaSharp) → routes to `/api/chat` where think is respected → set `Think = false`
-   On Apple Silicon: pull `qwen3.5:4b-mlx` for a free ~30–50% speed boost, no configuration needed

_Tested with OllamaSharp 5.4.25, Ollama 0.24.0, .NET 10, Apple M3 Max, 64GB memory._
