# API And Frontend Map

## Goal

This document translates the product and domain model into implementation-oriented module and screen boundaries.

## Backend API Domains

### Identity APIs

Endpoints should cover:

- register
- login
- refresh
- logout
- passkey registration
- passkey authentication
- profile read and update
- privacy settings

### Workspace APIs

Endpoints should cover:

- create workspace
- update workspace
- join workspace
- invite members
- manage members
- manage custom roles
- assign roles
- moderation

### Channel APIs

Endpoints should cover:

- list channels
- create channel
- update channel
- archive channel
- get messages
- send message
- moderate message

### Feed APIs

Endpoints should cover:

- get personal feed
- get workspace feed
- create post
- create activity share
- comment
- react
- delete or moderate

### Program APIs

Endpoints should cover:

- create challenge
- join challenge
- get leaderboard
- create habit
- log habit
- get progress summaries

### Workout APIs

Endpoints should cover:

- create workout session
- update workout session
- attach exercises and sets
- list workout history
- get analytics
- create template
- assign plan

### Nutrition APIs

Endpoints should cover:

- create meal log
- update meal log
- get daily nutrition summary
- set macro targets
- create nutrition plan
- assign nutrition plan

### Health APIs

Endpoints should cover:

- create biometric entry
- list trends
- connect data provider
- import source summary

### Professional APIs

Endpoints should cover:

- create professional profile
- manage client assignments
- send feedback
- create check-in templates
- review check-ins

### Notification APIs

Endpoints should cover:

- list notifications
- mark read
- notification preferences

## Suggested Backend DTO Principles

1. Separate create and update DTOs.
2. Use explicit visibility enums.
3. Keep source metadata on imported records.
4. Avoid generic JSON for core business entities when a stable schema is known.
5. Keep JSON only for flexible preferences and extensible metadata.

## Suggested Frontend Route Structure

```text
/(app)
  /home
  /feed
  /explore
  /workspaces
  /workspaces/[workspaceId]
  /workspaces/[workspaceId]/channels/[channelId]
  /workspaces/[workspaceId]/members
  /workspaces/[workspaceId]/programs
  /workspaces/[workspaceId]/settings
  /workouts
  /workouts/new
  /nutrition
  /health
  /events
  /profile/[nickname]
  /coach
  /coach/clients
  /coach/clients/[clientId]
  /settings
  /inbox
```

## Frontend Feature Modules

Recommended client-side module organization:

```text
components
  identity
  workspace
  channel
  feed
  workout
  nutrition
  health
  coach
  notifications
  ui
```

Recommended API client organization:

```text
lib/api
  auth.ts
  profiles.ts
  workspaces.ts
  channels.ts
  feed.ts
  programs.ts
  workouts.ts
  nutrition.ts
  health.ts
  professionals.ts
  notifications.ts
```

## State Management Guidelines

Keep state in three layers:

1. server data
2. UI state
3. session and preferences

Recommended principles:

- workspace and feed data should be fetched per screen and cached
- UI-only state should stay local or in lightweight stores
- authentication and theme can remain in global stores

## Cross-Cutting Frontend Requirements

### Visibility and privacy

Every form that publishes user-generated content should expose visibility controls when relevant.

### Mobile support

All core flows must work on mobile:

- quick workout log
- meal log
- channel messaging
- notifications
- check-ins

### Attachment support

Core entities that should support attachments:

- feed items
- messages
- workouts
- meals
- check-ins

## Recommended Backend-to-Frontend Rollout

1. workspace and RBAC APIs
2. channels and messaging
3. feed APIs
4. workout APIs
5. nutrition APIs
6. health APIs
7. professional APIs
8. notifications and real-time polish
