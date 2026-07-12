---
title: "The Nuances of Open Source: What I Learned from Becoming an Apache Committer"
published: 2026-07-12
description: ""
image: "/committer-list.jpg"
tags: [opensource]
category: "opensource"
draft: false
lang: "en"
---

A few days ago, I received an email from the Apache Mahout PMC (Project Management Committee), followed by a [public announcement](https://lists.apache.org/thread/x92ozrhxb61t9g3tgqh3bb4zc328troc).

The message was brief: after discussion and a vote, the Apache Mahout community had formally invited me to become an Apache Mahout Committer.

Naturally, I was thrilled.

Since first encountering Apache Mahout in January, I had participated in Google Summer of Code, read the project's source code, researched related technologies, submitted pull requests, discussed implementation approaches with the community, and joined biweekly syncs. The invitation felt like a tangible milestone marking those months of work.

Then came the Committer onboarding process: accepting the invitation, confirming my CLA (Contributor License Agreement), waiting for my Apache account, choosing an Apache ID, linking my GitHub account, configuring my `@apache.org` email address, and learning about the services used within Apache.

Seeing my Apache ID, `vicwen`, become active and joining the ASF GitHub organization truly felt like I had finally stepped inside.

![](/asf-github.jpg)

Once the initial excitement settled, however, I began to wonder:

> What does becoming an Apache Committer actually mean?

* Does it mean I can merge code directly into the project?
* Is it a title I can add to my résumé, LinkedIn, and personal website?
* Does it mean my technical ability has officially been recognized by an international open source community?

None of these answers is entirely wrong, but each tells only part of the story.

After truly participating in an Apache project, I gradually learned that open source is not simply about finding an issue, writing code, opening a pull request, and waiting for a maintainer to click Merge.

The things that do not appear directly on a GitHub contribution graph—communication, review, testing, documentation, licensing, consensus, and trust—often determine whether an open source project can endure.

This article is not a guide to becoming an Apache Committer quickly. Committership is not an achievement guaranteed by completing a certain number of issues or submitting a certain number of pull requests.

Instead, I want to record the nuances I encountered on the journey from Contributor to Committer, and how that experience changed my understanding of software engineering, community collaboration, and open source contribution.

## What Exactly Is an Apache Committer?

Before sharing my reflections, it is worth explaining what an Apache Committer actually is.

For most people new to open source, the most familiar role is Contributor: someone who contributes to a project through issues, pull requests, documentation, or other means.

Most Contributors do not have direct write access to the project's repository.

After submitting a pull request, a Contributor generally waits for a Maintainer or Committer to review it. Only after its design, code quality, and tests have been checked can the change be merged.

A Committer, by contrast, has write access to the project's repository.

Committers can submit their own changes and review and merge contributions from others. Whether a project follows “Review Then Commit” or “Commit Then Review” depends on that Apache project's development process.

Committer is not an engineering rank within Apache, nor is it a badge automatically unlocked after accumulating enough contributions.

Typically, existing Project Management Committee members notice that a Contributor has participated steadily over time, understands the project well, and is willing to take on more responsibility. The PMC then nominates the person, discusses the nomination, holds a vote, and formally issues an invitation.

Apache's official guidance makes an important point: becoming a Committer is less a reward or commendation than a decision made in the project's own interest. A community invites someone because it believes that person can help the project continue to grow.

In other words:

> Committership is not a medal awarded by the community. It is a responsibility built on sustained contribution and community trust.

When I first read that, it struck me as somewhat cold.

After investing so much time in open source and finally receiving recognition, it is natural to hope that the invitation validates your personal effort.

But on reflection, the principle makes perfect sense.

For an open source project that must be maintained over the long term, the most important question is never “How much has this person already contributed?” It is:

> If we give this person greater access, will they make the project better?

## More PRs Do Not Necessarily Bring You Closer to Committership

When I began contributing to open source, I naturally focused on measurable numbers. How many pull requests had I submitted? How many had been merged? How many green squares appeared on my GitHub contribution graph? Was I near the top of the contributor list?

These metrics are not meaningless. For someone just getting involved in a project, they can provide a sense of accomplishment and help sustain momentum. Over time, however, I realized that PR count and actual impact are not necessarily correlated. A change of only a few lines might solve a longstanding problem for many users, while a pull request changing hundreds of lines might be difficult to merge because it lacks tests, is over-engineered, or does not align with the project's direction.

For an open source project, a good contribution must do more than simply run. It must answer further questions:

* Is this problem truly worth solving?
* Does the change align with the project's long-term direction?
* Will it break compatibility for existing users?
* Do the tests cover important edge cases?
* Will future maintainers understand the code?
* Does it introduce unnecessary complexity or dependencies?
* Can other developers continue building on this design?

These questions rarely show up in a PR count.

Apache also emphasizes that code is not the only recognized form of contribution. Design, documentation, user support, outreach, pull request review, and help resolving longstanding issues can all be essential to a project's health.

This changed my understanding of an “effective contribution.” I once thought contributing meant continually claiming issues, implementing fixes, and submitting more PRs. Now I first look at what the project actually lacks. Sometimes it is an installation guide nobody can understand; sometimes it is a CI pipeline that has been failing for ages; sometimes it is a core feature without adequate tests; and sometimes many people have asked the same question, but nobody has documented the answer.

If five users have already asked a question, answering it for the **sixth** time may be less valuable than improving the documentation so the **seventh** user never needs to ask.

I gradually formed a new view of open source contribution:

> Open source is not about adding green squares to your résumé. It is about reducing future trouble in someone else's project.

## A Pull Request Is a Communication Tool, Not Just a Code Container

When people submit their first pull request, code is usually their main concern.

In a large open source project, however, a pull request is more than a container for code. It is also a place for design discussion, accumulated knowledge, and a record of decisions.

When a Reviewer opens your pull request, they may not know what you researched, which alternatives you ruled out, or why you chose the current implementation.

If the PR description says only **Fix the issue**, the Reviewer must reconstruct the entire problem from scratch. A complete pull request should therefore explain:

* What problem does this PR solve?
* How does the problem occur?
* Why was this implementation chosen?
* Were other approaches considered?
* What compatibility implications might there be?
* How was the change tested?
* What should the Reviewer pay particular attention to?

This writing is not there merely to make the PR look formal. It lowers the cost of understanding the change. I have also had cases where discussions with my Mentor led me to revise my original implementation direction.

The first version might run and pass some tests, yet placing the problem back into the full system architecture reveals more input types, edge cases, and existing behavior that must be considered.

The hardest part is often not changing the code, but accepting that your original understanding of the problem was incomplete.

A Reviewer may tell you that the design is unsuitable, the tests are insufficient, the abstraction is at the wrong level, or even ask you to research the entire approach again. At first, it is hard not to think: “But I already spent so much time on this,” “This version clearly works,” or “Do we really need to consider that many cases?”

Eventually, I learned that a Reviewer is critiquing the design in front of them, not rejecting the Contributor. They may have maintained the project for years and know that an odd-looking implementation exists to address a past compatibility issue. They may know that an apparently clean refactor would have unexpected effects on downstream users. That context is difficult to gain merely by reading a handful of current files.

Repeated revisions to a pull request do not necessarily mean the first implementation failed. They are a form of public collaboration that gradually narrows the gap between a Contributor's and a Maintainer's understanding of the problem.

> In an open source project, code answers only “what was done.” Whether a change is accepted usually depends on whether you can clearly explain “why it should be done this way.”

## English Is Not the Biggest Barrier; Missing Information Is

Before joining an international open source community, I thought English might be the greatest barrier. Beyond written communication on GitHub, there were biweekly syncs where people from around the world discussed the project's direction. I worried that my grammar would be poor, my vocabulary unprofessional, or I would not understand others quickly enough.

After joining, I found that most open source communities do not expect everyone to sound like a native speaker.

Here is a funny example: during one sync, we simply could not understand an Indian participant's accent. We had to ask him to repeat himself—and even blamed the connection and asked him to say it again. XD

People come from different countries and naturally have different linguistic backgrounds. A grammatically perfect message containing no technical information is of little help. Conversely, even simple sentences can let others understand and help if they clearly state the environment, steps to reproduce, expected result, and actual result.

Before sending a message, I gradually learned to ask myself:

> If I were a Maintainer with no background knowledge, could I understand what happened from this email or comment alone?

This habit is useful beyond open source. In a company, research team, or any collaborative project, clearly communicating context is an important engineering skill.

Many software development problems look technical on the surface but are actually caused by incomplete information.

## Important Matters Should Remain in Public Discussion

Apache projects value public, traceable communication. Some projects use Slack, Discord, or other instant messaging tools, but formal technical discussions and decisions generally still need to return to a public mailing list, issue, or pull request.

At first, a mailing list can feel like an outdated form of collaboration. Compared with instant messaging, its interface is less intuitive and discussion is not necessarily faster.

As I came to understand how Apache operates, however, I realized that public communication is not mere formalism; it is an important part of open source governance.

If a major design decision exists only in a private conversation between two people, other Contributors cannot know:

* Why was this choice made?
* Which alternatives were considered?
* What constraints led to the current design?
* Under what future conditions could it be reconsidered?

More practically, those two people may someday leave the project. Without a public record, the knowledge disappears with them. Even after discussing something privately with a Mentor or another Committer, important conclusions should therefore be summarized in a public channel. This is not duplicated work; it allows people who were absent to understand the decision later.

Apache's new Committer guide also notes that many teams have “tribal knowledge” held only in members' heads or private notes. Moving that knowledge into public documentation reduces the project's dependence on particular individuals.

## Community Over Code Is Not Just a Slogan

The Apache community often uses the phrase **Community Over Code**.

It does not mean that code is unimportant. It means that even excellent code is unlikely to endure without a healthy community. Code can be rewritten, architecture refactored, and frameworks and tools replaced.

But if a project lacks people willing to review, answer questions, prepare releases, address security issues, and help new Contributors, it may gradually lose momentum regardless of how good the code itself is.

When assessing whether an open source project is successful, I usually first look at:

* Whether the repository has recent commits—activity matters!
* Its number of GitHub stars
* Its number of Contributors

If you want to contribute, you should pay even closer attention to:

* Are pull requests being reviewed?
* Do issues go unanswered for long periods?
* Is the project willing to nurture its next generation of Contributors?

These things may be less visible, but they determine a project's lifecycle more directly. The point of Community Over Code is not to lower code quality. It is to build a community capable of continually producing, reviewing, maintaining, and improving code.

**A piece of code may solve today's problem, but a healthy community can keep solving problems that have not appeared yet.**

## Becoming a Committer Does Not Mean You No Longer Need Review

One of the most obvious changes after becoming a Committer is gaining more project access. Direct write access to the repository, however, does not mean every change can now be decided alone.

On the contrary, greater access demands greater care.

As a Contributor, my biggest concern might have been: **Can my code be merged?**
As a Committer, the question gradually becomes: **Could the code I merge cause problems for others?**

A change might affect downstream users, break backward compatibility, or increase future maintenance costs. Having permission to modify something directly does not make doing so the best choice. Larger features, architectural changes, and changes that may affect users should still undergo public discussion and review.

Apache's new Committer guide likewise reminds Committers to understand the project's collaboration model and treat code carefully after gaining direct access. Changes from a Committer can still be reviewed by other Committers.

In an open source community, access is really closer to responsibility. “I am allowed to do this” does not mean “I should do this.”

What matters is not whether you can merge directly, but whether you can judge when to act, when to seek review, and when to establish community consensus first.

## Reviewing Other People's Code Is Harder Than It Looks

As a Contributor, your main task is generally completing your own changes. After becoming a Committer, you also need to read and review other people's pull requests more proactively.

Review is not simply checking whether CI passes. A complete review requires understanding:

* The problem the Contributor wants to solve
* The modules affected by the change
* The project's existing design
* Whether the tests genuinely verify correct behavior
* Whether any edge cases were overlooked
* Whether the change will be maintainable
* Whether it follows the project's coding style
* Whether it raises licensing, dependency, or security concerns

Even with AI assistance, understanding someone else's pull request can take as long as implementing it yourself. Review also demands careful communication. Pointing out a problem is easy; patiently explaining where it lies, why it needs to change, and what possible solutions exist is harder.

A better review should explain, wherever possible:

* In what scenario a problem could occur
* Which assumption the current design violates
* Whether an existing implementation can serve as a reference
* Whether the issue must be fixed or is merely a suggestion
* Whether other design directions are possible

At the same time, a Reviewer should avoid demanding perfection in every respect. If a PR already solves the original problem, additional refactoring or improvements can be moved to a follow-up issue rather than expanding the current PR indefinitely. A good review is not the one that finds the most problems; it helps the Contributor and the project achieve a better outcome at a reasonable cost.

**This is also something I still need to keep learning. 🫡**

## The Things That Do Not Look Like Programming

Only after receiving the Committer invitation did I discover how many technical and administrative steps the role involves.

For example:

* Confirming and submitting an ICLA
* Choosing an Apache ID
* Setting up an Apache account
* Linking GitHub and Apache identities
* Enabling two-factor authentication
* Configuring an `@apache.org` email address
* Joining the project's mailing lists
* Learning about Gitbox and Apache Infrastructure
* Configuring SSH or PGP keys
* Understanding the difference between Committer and PMC privileges
* Learning the release vote and related processes

ICLA stands for Individual Contributor License Agreement.

It does not transfer copyright in your work to the Apache Software Foundation. Instead, it grants the ASF sufficient rights to distribute your contributions under the Apache License. Contributors retain copyright in their own work.

These processes may initially feel cumbersome.

But when a project's users are spread around the world and many companies integrate it into their products, the provenance of code, licensing, account security, and release integrity cannot depend on verbal assurances alone.

Procedures that look bureaucratic often protect Contributors, the project, the foundation, and the people who use the software.

Nor is a Committer responsible only for developing new features.

Other work includes:

* Maintaining documentation and websites
* Answering user questions
* Reviewing Contributors' pull requests
* Helping resolve longstanding issues
* Monitoring CI/CD and build problems
* Verifying release candidates
* Participating in technical discussions on mailing lists
* Watching the licensing of code and third-party dependencies
* Helping new Contributors understand the project
* Turning scattered knowledge into public documentation

Individually, these tasks may seem trivial and may not become the most prominent line on a résumé. Together, however, they form the foundation that allows a large open source project to operate over the long term. They are the “nuances of open source” as I understand them.

## From Completing Tasks to Taking Responsibility for the Project

When I first joined the Apache community, I understood contribution mainly as completing a series of explicit tasks: find an issue, understand the requirements, change the code, add tests, and submit a pull request.

This resembles a conventional software development workflow and makes progress easier to measure. As my involvement deepened, however, I realized that many things in a project have no clear owner and may never be organized into an issue waiting to be claimed.

Sometimes you need to notice for yourself that:

* Documentation no longer matches the current version
* A test lacks an important edge case
* A design needs public discussion first
* An old PR needs only a little final help
* Certain usage patterns are known only to a few core members
* New Contributors struggle to find an appropriate entry point

A Contributor often asks: **What task can I complete?**
Someone taking ownership of a project more often asks: **What matters most to the project right now?**

The questions sound similar, but they represent different ways of thinking. The first focuses mainly on what you can produce. The second requires viewing the project and its users as a whole and deciding where resources should go.

Apache describes this attitude as **Project Ownership**: prioritizing the overall interests of the project and its users rather than only the needs of an individual, company, or current task.

I do not believe I have mastered this, but becoming a Committer has at least taught me to view each change from a different angle. Instead of asking only, “Does this code run?” I also ask, “Is this what the project truly needs?”, “Can other people understand and maintain it?”, “Has the decision been recorded clearly enough?”, and “Will it add future technical debt?”

## Trust Does Not Come from One Impressive Contribution

Another lesson that struck me after becoming a Committer is:

> Trust in an open source community usually comes not from one spectacular contribution, but from consistent, predictable behavior over time.

A major feature may attract attention, but when a community considers granting greater access, it observes much more:

* Do you consistently respond to reviews?
* Can you discuss disagreements rationally?
* Will you take responsibility when a change causes problems?
* Do you respect the project's existing processes?
* Are you willing to handle less visible work such as documentation and tests?
* Do you care only about your own needs, or consider other users too?
* Can you collaborate with Contributors from different backgrounds?

These qualities are difficult to measure with a single metric. They take time and repeated interaction to become visible.

Apache therefore explicitly warns that there is no checklist guaranteed to result in Committership. Completing many recommended activities does not ensure an invitation. Deliberately gaming the criteria merely to gain the title can instead damage the community's trust in a Contributor.

I think this is very different from preparing for an internship or job search. In recruiting, we often study evaluation criteria and identify which skills or experiences to add. An open source community is not an interview scored against a fixed rubric; it is more like a long-term working relationship.

The community is not deciding whether you completed a checklist. It is deciding whether it wants to keep maintaining the project with you in the future.

## What Did I Really Gain from Becoming a Committer?

The most direct benefit, of course, is the identity of Apache Mahout Committer.

I now have an Apache ID, an `@apache.org` email address, and the relevant project privileges. I can participate more deeply in the project's development and maintenance.

These experiences certainly help my résumé and career.

Especially for a student still learning and building experience, contributing to a project under the Apache Software Foundation and collaborating with developers from different countries and backgrounds is a rare opportunity.

But reducing the experience to one more title on my résumé would miss the more important part. Its real value is that I have begun to understand how a large open source project can be maintained for years by people without a traditional management hierarchy, through public discussion, consensus, trust, and shared responsibility.

I also learned to:

* Accept having my design challenged in public review
* Proactively ask questions when information is incomplete
* Preserve technical decisions and their discussion context
* Consider licensing and maintenance beyond the code itself
* Write code from the perspective of future maintainers
* Understand that being trusted is often harder than being noticed
* Care about the health of the whole project, not only my own tasks

When I first began contributing, I might think, “I can put this contribution on my résumé,” or “Once this PR is merged, it will prove my technical ability.” Those thoughts are not wrong. Open source has indeed introduced me to many generous people and brought me many opportunities, for which I am deeply grateful. 🥹🙏

But the deeper you become involved, the more you realize that what keeps people around is often not a line on a résumé, but a growing sense of responsibility for the project. You begin to know why a module was designed a certain way, which issue has troubled users for a long time, and which features still need someone to carry them forward.

At that point, contribution is no longer only about proving yourself. You contribute because you genuinely want the project to become better.

## For People Who Want to Join Open Source: Do Not Chase Committership First

If I could give one piece of advice to someone beginning in open source, it would be: **Do not make “becoming a Committer” your only goal from the start.**

When you focus too heavily on acquiring a title, it is easy to measure contribution in the wrong way. You may continually seek the easiest issues, care only about PR count, or join every discussion merely to increase your visibility.

But the most valuable contributions are not always the easiest to quantify.

Instead of asking:

> How many PRs do I need to submit before I can become a Committer?

It is more worthwhile to ask:

> What can I do to make this project better?

Choose a project you genuinely want to use, study, or follow over time. Read its documentation, Contributor Guide, recent issues, pull requests, and mailing lists before immediately changing the first `good first issue` you see. Begin with small, well-scoped problems to learn the tests, development environment, and review process—but do not choose only the easiest changes forever. Respond to Reviewer feedback, and even when you cannot finish immediately, let others know your current status.

Beyond writing new features, you can improve tests, documentation, and user experience.

**Most importantly, be consistent.**

Submitting a flood of changes and then disappearing may be less valuable than reliable, high-quality participation over time. Open source communities usually do not need a hero who appears from nowhere. They need people everyone knows they can safely collaborate with when problems arise.

## Conclusion

Becoming an Apache Committer is certainly something worth celebrating.

But it feels less like unlocking a new title after completing a game quest and more like the community placing a key to the project in your hand. The key means you can do more; it also means others trust you to know when to use it and when to pause and discuss first.

Looking back, perhaps the greatest change is that I no longer measure my open source contributions only by how much code I wrote. I care whether a change is easy to understand, whether the tests are sufficient, whether the discussion was recorded, whether newcomers can join smoothly, and whether the project can continue even if a core developer leaves.

Code is important, of course, but it will eventually be modified, refactored, or even replaced entirely.

What keeps an open source project alive is a community of people willing to communicate, take responsibility, and pass opportunities on to the next person.

Perhaps that is the **Community Over Code** I only truly came to understand after becoming an Apache Committer.

For me, becoming a Committer is not the end of this open source journey. It is more like the community telling me:

> We have seen your commitment, and we trust you to help us keep moving this project forward.

The real work is only beginning. ✨
