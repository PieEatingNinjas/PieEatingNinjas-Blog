---
title: "A Bigger Context Window Doesn't Mean You Should Use It All"
description: "Models now offer context windows of a million tokens, but that doesn't mean every Copilot session should fill them. Why I keep starting new sessions, and how I carry knowledge over."
pubDate: "2026-11-19"
categories: ["ai", "github copilot"]
tags: []
---

I had an interesting discussion with someone at a conference recently about how I use Copilot.

I mentioned that, for larger tasks, I tend to start new sessions throughout the day rather than keeping one conversation going indefinitely. My reasoning is pretty simple: I want to keep the context focused, to limit token usage and to avoid the quality of the conversation degrading as it gets longer.

He strongly disagreed.

His argument was essentially: "Why would you do that? Models have context windows of a million tokens now. You're throwing away useful context every time you start a new session, and then you have to explain everything again."

And, to be fair, he has a point.

But I still think there's a fundamental misunderstanding here:

**A large context window is a capability. It is not a recommendation.**

## Context capacity and context quality are different things

A model being able to handle 1M tokens doesn't mean that feeding it 1M tokens is a good idea.

There are at least three separate questions:

1. Can the context fit?
2. How efficiently is that context processed?
3. How effectively can the model find and use the relevant information?

The first one has improved dramatically.

The other two haven't magically disappeared.

There's actually some interesting research on this. The [Lost in the Middle](https://arxiv.org/abs/2307.03172) paper by Liu et al. found that models can struggle to retrieve relevant information when it's buried in the middle of a long context. Performance was generally better when the relevant information appeared near the beginning or end of the context.

So there's a slightly counterintuitive problem here: having more context can sometimes make the useful context harder to use.

## A coding session accumulates a lot of junk

This becomes particularly relevant with coding agents.

A long Copilot session is a lot more than a sequence of questions and answers. Over time, you accumulate tool calls, tool outputs, file contents, searches, generated code, intermediate decisions and all the other context needed to keep the conversation going.

Some of that is incredibly valuable.

A lot of it eventually isn't.

Imagine spending two hours investigating one problem, fixing it, and then moving on to a completely different part of the codebase.

Do I really want my next question to be asked in the context of everything that happened during those previous two hours?

Maybe.

But often I don't.

At some point, the conversation turns into a historical archive instead of useful working memory.

That's where starting a new session makes a lot of sense.

Interestingly, this isn't just my personal preference. GitHub's own guidance on optimizing Copilot usage recommends keeping context lean, starting a new conversation when switching problems, and separating research, planning and implementation into different phases.

## I'm not arguing for a new session after every prompt

There's obviously a balance here.

If we're deep into debugging a complicated issue and we've already established ten hypotheses, rejected eight of them, discovered some obscure dependency, and finally narrowed the problem down to one particular component, I'd absolutely want to keep that context.

Starting a new session at that point would be a mistake.

The important distinction is that starting a new session doesn't have to mean starting from zero.

Before moving on, I can ask the current session to extract the durable knowledge from the conversation:

> Review what we learned in this session and classify the learnings into: (1) session-specific context that can be discarded, (2) project knowledge that should be persisted in project instructions or documentation, and (3) reusable patterns that could become a Copilot instruction, skill, or reusable workflow.

That gives me something much more useful than carrying the entire conversation forward.

For example, discovering that a project deliberately uses PostgreSQL-specific behaviour might belong in project documentation or instructions. A recurring workflow for handling a particular type of migration might be worth turning into a reusable skill. Meanwhile, the five approaches we tried and discarded to fix today's bug probably don't need to survive the session.

In other words, I'm trying to preserve knowledge and put it in the right place. Preserving history is a different goal, and a much less useful one.

A few thousand tokens of relevant knowledge can be far more useful than hundreds of thousands of tokens of conversational history.

## And yes, there's a cost dimension too

There's another reason I like this approach: token usage.

The economics are more nuanced than "longer context = proportionally more expensive." Modern systems use context caching, so repeatedly sending the same context isn't equivalent to paying full price for it.

But caching doesn't make irrelevant context free.

There's still a cost to carrying around huge amounts of context. More importantly, the model has more information to consider when answering the current question.

So the goal shouldn't be to ask:

*How much context can I fit into this model?*

I'd rather ask:

*What is the smallest context that contains everything relevant to this task?*

That's a very different optimization target.

## Bigger context windows make context management more important

This is perhaps the part I find most interesting.

When context windows were tiny, we had no choice but to manage context carefully.

Now that we're getting 100k, 200k, even million-token context windows, it's tempting to conclude that context management is becoming irrelevant.

I think the opposite is true.

As context gets larger, we're going to put more stuff into it. And the more we put into it, the harder it gets to tell relevant state from historical noise.

A 1M-token context window is fantastic when you actually need 1M tokens of relevant context.

It doesn't mean every conversation should grow into a 1M-token conversation.

So yes, I will keep starting new Copilot sessions throughout the day.

Modern models can handle long contexts, and I still don't think that means they should.

What do you think? How do you work with long-running AI coding sessions? Do you keep one conversation going for as long as possible, or do you prefer starting fresh?

Let me know by leaving a comment.
