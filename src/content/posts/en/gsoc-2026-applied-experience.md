---
title: "Google Summer of Code 2026 Application Experience: Only Two Students from Taiwan?"
published: 2026-07-10
description: ""
image: "/gsoc-2026.jpg"
tags: [internship, opensource]
category: "Open Source"
draft: false
lang: "en"
---

This year, I was lucky enough to be selected for **[Google Summer of Code 2026](https://summerofcode.withgoogle.com/)** as a GSoC Mentee for **[Apache Mahout](https://github.com/apache/mahout)** under the [Apache Software Foundation](https://www.apache.org/).

The organization I applied to was the Apache Software Foundation, and the project I joined was Apache Mahout. Apache Mahout was originally known for distributed machine learning, but in recent years it has gradually moved toward distributed quantum computing, numerical computing, and related infrastructure. If you want a more detailed introduction to Apache Mahout, you can also read my other article: [Introduction to Apache Mahout: From Distributed Machine Learning to Distributed Quantum Computing](https://vicwen.com/zh-tw/blog/zh-tw/zbout-apache-mahout).

In this article, I want to share how I prepared for GSoC 2026, along with some of my thoughts on open-source communities, proposal writing, and long-term contribution.

## Why Apache Mahout?

<img src="https://upload.wikimedia.org/wikipedia/commons/1/10/Apache_Mahout_Logo.png" width="50%" style="margin: 0 auto;" />

I actually started getting involved with GSoC 2026 quite early, around January this year. At that time, [Jay](https://www.linkedin.com/in/jiekaichang/), a core member of the Apache Mahout community and a current PMC member, asked me whether I would be interested in joining Apache Mahout.

What first attracted me was that Apache Mahout is a very special project. It combines machine learning, distributed systems, and quantum computing-related directions, which made it feel new, challenging, and exciting to me.

Compared with simply building model applications, I have always been more interested in lower-level infrastructure projects that are maintained for the long term. Apache Mahout happened to fit that direction very well. It is not the kind of project that only looks trendy in the short term. It is closer to a real open-source system that requires long-term understanding, accumulation, and commitment.

Jay also mentioned that if I continued contributing to Apache Mahout, GSoC would not be the only possible outcome. In the future, there might also be a path toward becoming an Apache Committer, or even an Apache PMC member. That was very attractive to me, because I have always hoped that I would not just complete one-off tasks, but truly participate in a long-running open-source community.

So compared with many people who might start looking for organizations, studying issues, and submitting short-term contributions around March or April to get mentors' attention, I ended up taking a slightly different path.

I did not first treat GSoC as the goal and then search for a project. Instead, I first entered the community, became familiar with the project, built up contributions, and eventually GSoC became one stage within that larger process.

## Trust Is the Most Important Thing in Open Source

To me, GSoC is not an application that succeeds only because the proposal is well written. Of course, the proposal matters a lot, but in an open-source community, something even more important is the trust or credit you build over time.

Open-source projects are very different from class assignments, competitions, or personal projects. The code you submit is not used only by yourself. It enters a shared codebase maintained by many people. Your design, tests, documentation, and communication style all affect the future maintenance cost of the entire project.

Because of that, when mentors and organizations evaluate a GSoC applicant, they are not only asking, "Is this person technically strong?" They also care whether the applicant truly understands the project, communicates reliably, accepts review, finishes work completely, and can be trusted with an important proposal.

I think this is one of the most central ideas in open source: trust is not built through one big contribution. It is accumulated slowly through many stable, reliable, reviewable contributions.

When I first joined Apache Mahout, I did not immediately pick a huge feature to work on. I started from smaller things: reading existing code, understanding the test workflow, observing community discussions, fixing small issues, and helping review other people's pull requests.

These contributions may not look very flashy from the outside, but they are actually important. They help you gradually understand the project's coding style, CI workflow, testing habits, review standards, and how community members collaborate with each other.

By the proposal deadline on April 1, I had already accumulated more than **25+ PRs** and **40+ reviewed PRs**. For a GSoC applicant, I think that was a fairly active contribution record.

Those PRs and reviews were not just there to make my resume or application look better. They genuinely helped me understand Apache Mahout more deeply, and they also helped the community gradually recognize me as someone who could participate consistently, communicate well, and stay committed.

I think this was one of the key reasons I was eventually selected, at least according to Jay.

## A Proposal Does Not Come Out of Nowhere

During the GSoC application process, the proposal is still a very important part.

But I believe a good proposal should not be invented out of thin air. It should also not be just a pile of impressive-sounding technical terms. It should be built on top of your understanding of the current state of the project, the needs of the community, the mentor's expectations, and the feasibility of the implementation.

While writing my proposal, I frequently discussed the architecture and details with my mentor to make sure the plan could realistically be completed within the GSoC timeline and that it matched the long-term direction of Apache Mahout.

When I wrote my proposal, I paid special attention to a few things.

### First, the Goal Needs to Be Clear

You should not only write, "I want to improve this system" or "I want to add this feature." You need to clearly define what the project will produce, what problem it solves, and how the result can be evaluated.

### Second, the Timeline Needs to Be Reasonable

GSoC has a limited timeline, so the milestones in the proposal cannot be just an idealized breakdown. They need to realistically account for development, testing, review, revision, and documentation.

### Third, You Need to Be Aware of Risks

There will always be uncertainty during implementation, so the proposal should explain possible risks and whether there are fallback plans if the original design turns out to be infeasible.

### Fourth, Communication Also Matters

I did not simply ask my mentor, "Is this okay?" Instead, I first organized my own understanding, proposed several possible approaches, and then asked my mentor to help confirm which direction best matched the project's needs. This kind of communication feels more like co-designing a solution instead of passively waiting for an answer.

To me, the point of writing a proposal is not to package yourself nicely. It is to prove that you truly understand the project and that you are capable of carrying the work from design to implementation, testing, and documentation.

## Long-Term Contribution Matters More Than Short-Term Sprinting

Many people may think of GSoC as a summer program where you find an issue before the application season, submit a few PRs, write a proposal, and then hope to get selected.

That is certainly not impossible, but I would personally recommend **treating GSoC as part of long-term open-source contribution**, rather than as a one-time application event.

If you join a project early, you have much more time to understand the codebase. You will also have a clearer sense of which problems are actually important, which designs the community can accept, and which parts need alignment with mentors. These things are very hard to fully catch up on within just a few weeks.

> More importantly, long-term contribution lets the community see your consistency.

Open-source communities do not lack one-time contributors. What they often lack are people who are willing to maintain things over time, keep responding to reviews, and improve quality continuously. When you can show up consistently in the community, reply seriously to discussions, revise your PRs, and help review others' work, mentors will naturally build more trust in you.

That trust becomes a major advantage when applying to GSoC.

Because the mentor is not only seeing a proposal. They have already seen how you actually work.

## How I Felt After Being Selected

In the end, I was very fortunate to stand out among many candidates and become one of the **Google Summer of Code 2026 Mentees**.

What made it even more interesting was that I later learned there were apparently only two students from Taiwan selected for GSoC in 2026. I was honestly surprised when I heard that, and it made me feel that this opportunity was even rarer than I had originally imagined.

Of course, being selected for GSoC is not the end. It feels more like a new beginning.

To me, the most important part of this experience is not just getting the title of GSoC Mentee. It is that I truly entered an international open-source community, participated in real open-source collaboration, and gained a deeper understanding of how large open-source organizations like the Apache Software Foundation operate.

In the future, I hope to keep contributing to Apache Mahout. I do not only want to complete my GSoC proposal. I also hope to build more practical contributions in the project and keep working toward becoming an Apache Committer, or even an Apache PMC member someday.

## For Future GSoC Applicants

If you also want to apply for GSoC in the future, my advice is simple: do not wait until the application season to start.

The earlier you enter a community, the better. You do not need to start with a large feature. You can begin with documentation, tests, small bugs, examples, CI, or reviews. These seemingly simple contributions are actually great ways to understand a project and build trust.

Also, do not focus only on writing the proposal. The proposal is important, but it should be the natural result of your long-term understanding of the project, not a document you package at the last minute before applying.

When communicating with mentors, try not to only throw questions at them. Bring your own understanding and possible solutions into the discussion. This lets the other person know that you are not only looking for answers, but are genuinely thinking about the project's design and trade-offs.

Finally, I think the most valuable part of GSoC is not just adding one more line to your resume. It is that GSoC gives you a real way to enter an international open-source community, learn how to collaborate with engineers from around the world, understand how to make your code maintainable over the long term, and build influence in a real large-scale project. Along the way, you may also build relationships with others and open up broader career opportunities.
