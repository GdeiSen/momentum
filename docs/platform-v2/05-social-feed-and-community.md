# Social Feed And Community

## Goal

Momentum should evolve from "team posts plus one chat" into a community platform with:

- structured workspace channels
- feed items from different domains
- comments and reactions
- activity sharing
- events and community discovery

## Community Building Blocks

### Workspaces

Serve as the primary social containers.

### Channels

Serve as real-time or near-real-time communication containers.

Recommended default channels:

- `general`
- `announcements`
- `wins`
- `workouts`
- `nutrition`

### Feed

Serves as the asynchronous social stream.

Recommended feed scopes:

- personal profile feed
- workspace feed
- global discovery feed later

## Feed Item Types

The feed should support typed content.

### Text Post

Use case:

- status update
- reflection
- team announcement

### Workout Activity

Use case:

- completed run
- gym session summary
- swim result

### Nutrition Update

Use case:

- meal share
- weekly nutrition adherence summary

### Progress Update

Use case:

- body metric progress
- before and after milestone
- streak milestone

### Challenge Result

Use case:

- challenge started
- challenge completed
- leaderboard update

### Event Announcement

Use case:

- team run invite
- group hike
- coach webinar

## Reactions And Comments

Feed items and selected messages should support:

- likes or kudos
- comments
- mentions
- bookmarks later

Rules:

1. reactions are lightweight and fast
2. comments are threaded one level deep at most in the first implementation
3. mentions produce notifications

## Social Graph

Introduce a follow model for users.

Follow use cases:

- view activity from favorite athletes or friends
- build a personal feed
- support public creator or expert profiles

Follow should be independent from workspace membership.

## Events

Events should become a first-class domain object.

Examples:

- weekend group run
- public swimming session
- team hike
- seminar

Event fields:

- organizer
- location type: `online`, `offline`, `hybrid`
- start and end
- capacity
- visibility
- participation rules

## Discovery

Discovery is a later-stage feature, but the architecture should leave room for:

- nearby events
- suggested communities
- suggested users
- trending public activities

## Messaging Model

### Channel types

- workspace channel
- direct message
- group direct message
- announcement-only channel

### Message capabilities

- text
- media
- links
- replies later
- moderation actions
- read receipts later

### Message moderation

Supported actions:

- delete
- hide
- flag
- mute sender in channel

## Notification Sources

The community layer should produce notifications from:

- comment on feed item
- reaction on feed item
- mention in comment or message
- invited to workspace
- added to event
- coach feedback
- challenge updates

## Feed Generation Strategy

### Phase 1

Simple query-based feed:

- fetch newest visible items by scope

### Phase 2

Fan-out or precomputed feed:

- generated inbox feed entries
- popularity and relevance sorting

### Phase 3

Ranking layer:

- relationship strength
- workspace relevance
- activity type preference
- recency and engagement

## Community Privacy Model

Workspace content visibility:

- public workspace content can be visible to guests when configured
- private workspace content is visible only to members
- health and client data is never public by workspace default

User content visibility:

- private
- followers
- workspace
- public

## Community KPIs

Product should later measure:

- daily active members
- messages per active workspace
- feed engagement rate
- event participation rate
- challenge participation rate
- retention after joining a workspace
