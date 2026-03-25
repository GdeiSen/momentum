# Delivery Roadmap

## Goal

This roadmap defines a realistic delivery order for transforming the current codebase into the target Momentum platform.

## Current Baseline

Already implemented or partially implemented:

- authentication
- users and profile data
- teams
- team membership
- invites and whitelist
- challenge and habit model
- posts
- single team chat
- user dashboard and settings
- AI assistant

## Delivery Strategy

Do not rebuild the product in one step.

Use phased delivery where each phase:

- ships end-user value
- preserves current functionality
- improves architecture
- unlocks later modules

## Phase 1: Workspace Foundation

### Goals

- reframe teams as workspaces
- add custom roles and permissions
- prepare channel architecture

### Backend work

- introduce role and permission tables
- add permission resolver
- migrate membership logic
- introduce workspace terminology in API contracts where possible

### Frontend work

- update IA around workspace concept
- add role management screens
- add workspace settings sections

### Result

Momentum stops being locked to three fixed roles and becomes structurally extensible.

## Phase 2: Channels And Community Core

### Goals

- replace single team chat with multi-channel communication
- prepare stronger social layer

### Backend work

- add channels
- add message permissions
- add message moderation
- add read-state support later in the phase if capacity allows

### Frontend work

- workspace channel navigation
- channel screen
- create and manage channel UI

### Result

Each workspace becomes a real shared space, not just a team page with one chat.

## Phase 3: Feed And Social Activity Layer

### Goals

- replace narrow posts model with feed item architecture
- support multiple feed subjects

### Backend work

- create feed item domain
- add comments and reactions
- add follows
- connect workspace activity into feed

### Frontend work

- personal feed
- workspace feed
- feed composer
- profile activity stream

### Result

Momentum becomes a social product, not only a structured tracker.

## Phase 4: Workout Foundation

### Goals

- support structured workout logging
- support training analytics

### Backend work

- add workout templates
- add workout sessions
- add exercise and set entities
- add workout summaries

### Frontend work

- quick workout log
- structured strength session builder
- workout history
- workout analytics

### Result

Momentum becomes usable as a genuine fitness tracking platform.

## Phase 5: Nutrition Foundation

### Goals

- support meal and macro tracking
- support hydration and targets

### Backend work

- add meal logs
- add nutrition targets
- add nutrition plan entities

### Frontend work

- meal logging flow
- nutrition dashboard
- hydration tracking

### Result

The product expands from activity to full lifestyle management.

## Phase 6: Health And Biometrics

### Goals

- support manual body and health metrics
- prepare external integrations

### Backend work

- add biometric measurement entities
- add health connection scaffolding
- normalize source metadata

### Frontend work

- health dashboard
- manual metrics entry
- trend charts

### Result

Momentum can connect training and nutrition behavior with body and health outcomes.

## Phase 7: Coach And Nutritionist Layer

### Goals

- support expert-client relationships
- support assigned plans and check-ins

### Backend work

- add professional profiles
- add client assignments
- add check-ins and review notes

### Frontend work

- professional dashboard
- client profile workspace
- check-in submission and review flows

### Result

Momentum becomes a platform for professionals, not only end users.

## Phase 8: Integrations, Notifications, And AI Expansion

### Goals

- add device imports
- improve notification delivery
- upgrade AI assistant context

### Backend work

- integration jobs
- notification jobs
- AI context aggregation across workouts, nutrition, and health

### Frontend work

- integration settings
- notification center
- richer AI assistant screens

### Result

Momentum becomes operationally mature and significantly more sticky.

## Suggested Engineering Workstreams

Parallel workstreams:

1. product architecture and schema evolution
2. backend module delivery
3. frontend IA and screen delivery
4. design system and UX consistency
5. infrastructure and background job support

## Suggested Milestone Deliverables

### Milestone A

- workspace RBAC
- channels
- migration compatibility

### Milestone B

- feed
- comments and reactions
- events foundation

### Milestone C

- workout tracking
- workout analytics

### Milestone D

- nutrition tracking
- health metrics

### Milestone E

- coach and nutritionist workflows
- integrations

## Risk Register

### Risk 1: overloading current habit model

Mitigation:

- keep workouts and nutrition in separate domains

### Risk 2: access model complexity

Mitigation:

- central permission resolver and policy layer

### Risk 3: privacy mistakes with health data

Mitigation:

- private-by-default health visibility and explicit consent

### Risk 4: social features without proper moderation

Mitigation:

- moderation permissions and audit logs in early phases

### Risk 5: too much scope in one release

Mitigation:

- phased rollout with stable increments

## Definition Of Success

The platform rewrite is successful when:

1. a workspace can have multiple channels and custom roles
2. a user can publish structured activities into a feed
3. workouts and nutrition logs are first-class entities
4. private health data has enforceable visibility boundaries
5. coaches and nutritionists can manage clients through native workflows
