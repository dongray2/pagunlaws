# Pennsylvania firearms record

Date: 2026-10-16
Status: draft for review

## Intent

A public website where a Pennsylvania citizen can see the firearms laws that bind them, how those laws got there, and what a new bill or a real-world story runs into.

The person this is for wants to defend Article I, Section 21 of the Pennsylvania Constitution and the Second Amendment with the statute book. They use a date and a quotation in an argument. A wrong effective date, or a story that claims more than the session law says, is a failure even if the screen works.

The Legislative Reference Bureau's *Pennsylvania Laws Relating to Firearms* (revised February 20, 2026, through Act 60 of 2025) is the current unofficial compilation. It says the official text is the Laws of Pennsylvania and the Pennsylvania Consolidated Statutes. This site is the layer that book does not provide: the path each provision took, and the day it started to bind people.

## Success

A reader can do three things on one screen:

1. Open a topic and walk it from the oldest instrument to the one in force, reading the text and the day it took effect.
2. Paste a proposed ordinance, regulation, bill, or statute and see the existing laws it runs into, each of which can be opened back to its origin.
3. Describe a scenario and see which laws are potentially in play, separated where the facts call for it into the shooting, the weapon, the manner, and the place.

## The screen

There is one screen. Nothing in version 1 is a second app or a second layout.

- Across the top, the whole record: lanes of time from the 1776 Constitution through the present, with a marker for the instrument in view. The strip stays visible when a filter is on. Lanes outside the filter go dim. This dimming is a design call, not something the reader asked to rearrange.
- Under that, a column of the instruments the current filter includes, in time order.
- On the right, the instrument that column is pointing at.

On the left, a topic list. **All Laws** is first and is selected on arrival. Arrival shows every instrument. No filter is on.

Under the topics, two more filters: **Proposed Legislation** and **Explore Scenario**.

Choosing an instrument puts its stored material in the right-hand pane: the title, the verbatim text, the citation, the effective-date statement, and what that moment changed. The model does not rewrite that text.

**Provide context** is a control in that pane. The writing it returns sits under the stored quotation and is labeled as background. It does not replace the quotation. On a dimmed out-of-scope row there is no quotation. The pane says the law may be outside the scope of this site, and **Provide context** can still be used.

## Topics

These are curated walks. They are not asked of the model. A statute is stored once and may sit on several walks. Article I, Section 21 is on every walk.

1. All Laws
2. Concealed carry
3. Open carry
4. Defensive gun use
5. Hunting gun use
6. Buying, selling, gifting, inheriting
7. Loss and restoration of gun rights
8. Owning NFA items
9. Transportation
10. Philadelphia
11. Preemption and supremacy

**All Laws** is the open tree. Choosing it again clears Proposed Legislation and Explore Scenario.

The other nine narrow the column to the instruments built for that walk, oldest first.

Preemption and supremacy is the walk where a city ordinance, and a federal statute, meet Pennsylvania law. That reading of "supremacy" was stated in design and not corrected.

## What a dot is

A dot is one moment a law was enacted or materially changed. The pane holds that moment's text, citation, and effective date. The open tree is all of those moments at once.

Order dots by the effective date when that date has been checked against the session law. If only an approval date is known, order by the approval date and say so in the pane. Do not present an approval date as the day the law began to bind people.

A reported decision that limits whether a printed statute is in effect is attached to that statute in the pane, and it is also its own dot on the date of the decision. *Commonwealth v. Sumpter* on § 6108 and *Leach v. Commonwealth* on parts of § 6120 are the kind of dot this rule is for. This attachment rule is a design call.

## The record

Each moment stores at least:

- a stable id
- the date used for order, and whether that date is an effective date or only an approval date
- a lane, for the strip (the right itself, carry, use of force, who may possess, sale and transfer, local power, and others as instruments require them)
- title
- status, in the reader's words: in force, superseded, not yet checked, or limited by a court
- citation to the session law or the constitution, and the consolidated citation when there is one
- the effective-date language, or an explicit statement that it has not been read
- what changed
- verbatim text, or an explicit "text not loaded"
- which curated walks include it

All Laws does not need a membership list. It is every moment.

The tree starts at the Constitution of 1776. A colonial law from before then enters only when leaving it out would falsify how the right to bear arms is affected. That start date is a design call. "Founding of the state" was the request.

Neighboring bodies of law enter only far enough to complete that picture. The rest of the title stays out.

- Defensive gun use gets the justification rules that decide when using the gun is lawful, not the whole law of crime and defense.
- Hunting gets the Game Code rules that limit a gun in the field, and the sportsman's permit that ties that use back to 18 Pa.C.S. § 6106.
- Owning NFA items is a Pennsylvania offense. Under 18 Pa.C.S. § 908, a machine gun, a shotgun with a barrel under 18 inches, and a firearm specially made or specially adapted for concealment or silent discharge are offensive weapons. Possessing or using one is a misdemeanor of the first degree unless authorized by law. Compliance with the National Firearms Act is a defense the person must prove, and that defense does not cover a bomb, grenade, or incendiary device. Section 908(b)(3) says the section does not apply to a firearm used or possessed for a purpose Pennsylvania law does not prohibit. Both sentences stay visible. The federal act is on the walk because it decides that Pennsylvania question. The walk stops there.

Loss and restoration of gun rights is who may not possess a firearm under Pennsylvania law, and how that disability is lifted. The walk is built to hold 18 Pa.C.S. § 6105 (persons not to possess, use, manufacture, control, sell or transfer firearms), including the court application for relief from that disability, and § 6105.1 (restoration of firearm rights for offenses under prior laws of this Commonwealth). A pardon or an expungement is on the walk only as far as it changes firearm possession. A federal prohibition that still binds the person after Pennsylvania has restored the right is on the walk, because it changes whether that person may possess a firearm here. The walk does not decide that a particular person has lost or regained the right. Those sections were identified on the General Assembly site. Their text and effective dates are not loaded until a person checks them. This topic was added on October 18, 2026, and placed after buying, selling, gifting, and inheriting.

The defensive-gun-use walk ends by asking whether the gun, the manner, or the place adds an offense the shooting does not answer.

- A concealed machine gun opens § 908. Concealment opens § 6106 only after the length test in § 6102. A rifle-sized machine gun can be an offensive weapon and still sit outside § 6106.
- A short-barreled shotgun on state game lands opens § 908 and § 6102 together, because a barrel under 18 inches is both an offensive weapon and a firearm. "Not legal for hunting" opens the hunting walk as its own question. A rule about taking game is a different sentence from the shooting and from § 908.

The record shows those as separate questions. It does not pick a winner between justification and a weapons charge.

No moment is shown with a date presented as fact until the session law's effective-date clause, or the constitutional adoption date, has been read. Until then the status is "not yet checked," and the pane says the date is not to be quoted. A walk with no checked moments says the walk is not loaded. It does not show invented instruments. The site may be shown while some walks are not loaded. That release bar is a design call.

The words come from the official sources. They are copied from those sources. They are not typed from memory.

- Current compiled text: the Pennsylvania Consolidated Statutes on the General Assembly site.
- History and the day it took effect: the Laws of Pennsylvania, the slip law or pamphlet law, which contain the enacting clause and the effective-date clause.
- The constitution: the official constitutional text.
- A limitation by a court: the opinion itself.
- The LRB compilation may be used to find which provisions belong in the record. It is not the source for history or for effective dates.

A moment is published only after a person has checked the copied text against that source, written the citation, and read the effective-date clause. A script may fetch a known official page into a draft. The draft is not the record until that check is done. Version 1 does not run an unattended crawler that writes the tree on a schedule.

A Pennsylvania-licensed attorney may start a review run by hand. The run reads the source credits on Title 18, Chapter 61 and queues one item for each session law, including an act that changed several sections. Those acts are stored before any model call. The text and the effective date still come from that act in the Laws of Pennsylvania, not from the compiled section. A later request asks the model, with web search, for other firearms session laws, constitutional provisions, and limiting appellate decisions that are not already in the record. If that search does not finish, the stored acts stay in the queue. A researcher pass tries to verify each item against an official page, including the effective-date clause. A run stops at 100 items. Nothing from that run is part of the public record until the attorney approves it. A field the researcher verified against an official source cannot be edited. A new run cannot be completed while any item is still waiting. The attorney approves, edits, or rejects each waiting item first.

## Proposed Legislation and Explore Scenario

The reader pastes text or describes what happened. An AI model reads it. The tree is the data the model uses. The model returns moments that already exist, and a guide that walks those moments in order.

The column narrows to the returned moments. The strip stays the whole record. The pane still shows stored text.

For a scenario, the guide's standard is "potentially in play." It separates the shooting, the weapon, the manner, and the place when the story contains them. It does not declare the shooting justified, and it does not declare an offense committed.

For proposed legislation, the guide lists the existing laws the text runs into. Opening one lands on that moment, so the origin, the citation, and the effective date are the same pane as everywhere else.

The model may quote a moment's stored text and say what in the paste brought that moment up. It may not add statute text of its own to the instrument pane.

If the model names a law the tree does not hold, that law appears in the column dimmed. The right-hand pane does not show a statute. It says this law may be outside the scope of this site. **Provide context** remains available on that row. The backstory stays labeled as background and does not turn the outside law into an instrument.

The curated topics do not go through the model.

## Provide context

**Provide context** asks a model for why that law was put into effect, who championed it, and what opposition existed.

The kind of writing this is: the National Firearms Act of June 26, 1934, and *United States v. Miller*, 307 U.S. 174 (1939). Jack Miller and Frank Layton were indicted for transporting a short-barreled shotgun in interstate commerce. The district court quashed the indictment. No one appeared for them in the Supreme Court. Justice McReynolds wrote that, without evidence the gun had a reasonable relationship to a well regulated militia, the Second Amendment did not protect it. That story is background. It is not the text of a Pennsylvania statute, and it is not the Gun Control Act of 1968.

In version 1 the background writing is prose the reader reads. There is no link, search box, or other control inside it. A later version may add a Google search and an Amazon search aimed at that topic. Those searches are out of version 1.

Context may discuss laws and cases that are not instruments on the tree. That discussion stays in the background block. Naming such a law as something the paste or the story runs into is the dimmed-row rule above, not a new instrument.

## Goals

- Show the firearms law in force in Pennsylvania, each moment with the day it took effect once that day is checked.
- Show the path to the current text: enactment, material amendments, what was replaced, and court decisions that limit effect.
- Let a reader set a new bill or ordinance beside that record.
- Let a reader set a scenario beside that record and see what is potentially in play.
- Keep statute text, model guide, and background writing visually distinct.

## Non-goals for version 1

- Directed Google or Amazon searches from Provide context.
- Any control inside the background writing.
- A verdict that a shooting was justified, that a person committed an offense, or that an ordinance is void.
- Importing the whole Game Code, the whole justification chapter, or the whole National Firearms Act.
- Asking the model to build the ten topic walks.
- Accounts, saved matters, or a second screen.

## Anti-goals

- An effective date that was not read from the session law, shown as fact.
- A citation that was not checked, shown as fact.
- Background writing that is visually interchangeable with the statute.
- A model answer that adds a law to the tree by writing it into the instrument pane.

## What was decided

- One screen: whole-record strip, filtered column, instrument pane.
- Topics, proposals, and scenarios are filters on that tree.
- All Laws is the first topic and the arrival selection.
- Loss and restoration of gun rights is a curated topic. It sits after buying, selling, gifting, and inheriting.
- The two filters under the topics are named Proposed Legislation and Explore Scenario.
- Those two filters are an AI model using the tree data.
- A law named by the model and absent from the tree is dimmed, with a scope message in the pane.
- Provide context is AI backstory in the same pane, under the stored text when there is stored text.
- Version 1 context has nothing further for the reader to interact with.
- Neighboring law is included only as far as the right to bear arms is affected.
- The NFA walk is the Pennsylvania offensive-weapons offense, with the federal act as part of that offense's defense.

## Calls made in design

These were not spelled out by the person who asked. A builder should keep them unless that person rejects them.

- The strip stays fully visible, and lanes outside the filter dim.
- A dot is one enactment or one material change. A material change alters who may possess, carry, buy, sell, transfer, transport, or use a firearm, the penalty, the license standard, a place rule, or preemption, or it is a decision that limits whether the statute is in effect. A recodification that only changes the citation, such as the 1972 Crimes Code, is its own moment. A purely editorial amendment is noted on the moment it belongs to and is not its own dot.
- Dots order by checked effective date, otherwise by approval date, labeled as such.
- A limiting appellate decision is both a note on the statute and its own dot.
- The tree starts in 1776. Earlier colonial law is admitted only under the scope rule.
- The site may be shown with some walks unloaded, and must not show an unchecked date as fact.
- One filter is on at a time. A topic, Proposed Legislation, and Explore Scenario do not combine.
- Texts are copied from the official sources listed above. A person checks each moment before it is shown as fact. Version 1 does not run an unattended crawler that writes the tree on a schedule.
- The Philadelphia walk is state law that singles out Philadelphia or a city of the first class, plus decisions on those statutes. A municipal ordinance is an instrument only when it is in force and changes what a person may do with a firearm.
- No accounts in version 1.
- A standing line says this is not legal advice, and that the official text is the Laws of Pennsylvania and the Pennsylvania Consolidated Statutes.
- "Supremacy" on the preemption walk includes the federal layer where it changes the Pennsylvania question, not a general course in federal constitutional law.

## Left to the builder

- Language, framework, and how the tree is stored.
- Hosting for version 1 is Cloudflare Pages. The domain is pagunlaws.net. The apex is the canonical host. www.pagunlaws.net redirects to it. DNS for the apex is on Cloudflare, because Pages will create the apex CNAME only when the domain is a zone on the same account.
- Which model is called, and how the tree is given to it, so long as statute text comes from the stored moment and the model returns ids that exist.
- The exact words of the scope message, provided they say the law may be outside the scope of this site and the row stays dim.
- How a not-yet-checked moment and a not-loaded walk look, provided they cannot be mistaken for a finished citation.
- How the guide is laid out in the column or above the pane, provided the instruments remain the stored moments and the guide is not the statute.
