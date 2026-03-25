# Product Vision

## Product Statement

Momentum is a social active lifestyle platform where people can improve habits, log workouts, track nutrition, monitor personal health signals, join communities, and work with coaches or nutrition experts.

The long-term product position is not "habit tracker with teams". It is:

- a community platform for active people
- a personal operating system for healthy routines
- a collaboration tool for coaches, nutritionists, and teams
- a social activity network with structured progress data

## Core Product Goals

1. Help users build consistency in daily routines.
2. Help users track structured physical activity and nutrition.
3. Help users participate in communities, clubs, and teams.
4. Help professionals manage clients and programs inside the same platform.
5. Help users understand progress using analytics, trends, and AI assistance.

## Strategic Direction

Momentum should combine four product layers:

1. Personal layer
   - habits
   - workouts
   - nutrition
   - biometrics
   - goals

2. Social layer
   - activity feed
   - profiles
   - comments and reactions
   - clubs and communities
   - events and challenges

3. Team layer
   - shared spaces
   - channels
   - role-based management
   - team programs
   - team analytics

4. Professional layer
   - coach and nutritionist profiles
   - client assignments
   - plans and reviews
   - private feedback
   - progress oversight

## Primary Personas

### 1. Individual User

Wants to:

- track daily consistency
- log workouts and meals
- see progress over time
- optionally share results publicly or with a group

### 2. Team Member

Wants to:

- join a community or team
- chat with others
- participate in group challenges
- share updates and activity results

### 3. Team Owner or Moderator

Wants to:

- manage members
- control space structure
- create channels and roles
- run events, competitions, and programs

### 4. Coach

Wants to:

- assign workouts and plans
- monitor adherence
- review client progress
- communicate with individuals or groups

### 5. Nutritionist

Wants to:

- assign meal plans and nutrition targets
- review logs and trends
- track body metrics and behavior
- send recommendations and check-ins

## Product Principles

### Team-first but not team-only

The product should work for solo users and groups. Community is a differentiator, not a forced dependency.

### Structured data before vanity features

Workout logs, meal logs, and health metrics are more valuable than decorative features. A strong data model unlocks analytics, coaching, and AI.

### Permission-based collaboration

The system must rely on permissions, not a fixed enum of roles. This is required for scalable moderation and expert workflows.

### Privacy by design

Health and biometric data must have explicit visibility rules. Public social data and private health data must not share the same defaults.

### Gradual platform expansion

The product should evolve in stages:

- community foundation
- training and nutrition foundation
- expert workflows
- integrations
- advanced social discovery

## Product Capability Matrix

| Capability | Personal User | Team Member | Team Admin | Coach | Nutritionist |
| --- | --- | --- | --- | --- | --- |
| Habit tracking | yes | yes | yes | view if assigned | optional |
| Workout logging | yes | yes | yes | assign and review | view |
| Nutrition logging | yes | yes | yes | view | assign and review |
| Biometric logging | yes | yes | yes | review if permitted | review if permitted |
| Community channels | yes | yes | manage | manage assigned spaces | manage assigned spaces |
| Challenges and programs | join | join | create and manage | assign | assign |
| Public activity feed | optional | optional | optional | optional | optional |
| Client management | no | no | no | yes | yes |

## Non-Goals For The First Platform Rewrite

The first major platform version should not try to fully implement:

- route maps and GPS segment competition
- full marketplace billing
- medical diagnostics
- device-specific deep native integrations for every vendor
- enterprise multi-tenant organizations above team/workspace level

These can come later after the core product model is stable.
