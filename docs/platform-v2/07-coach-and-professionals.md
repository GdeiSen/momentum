# Coach And Professional Platform

## Goal

Momentum should support a professional workflow layer for:

- coaches
- nutritionists
- hybrid experts

This layer must sit on top of personal and community data, not replace it.

## Professional Roles

Professional capabilities should be modeled through permissions and profile types, not separate account systems.

Possible professional role types:

- coach
- nutritionist
- wellness mentor

## Professional Profile

Professional profile should include:

- display title
- specializations
- description
- certifications optional
- languages
- service format
- pricing optional
- visibility

## Client Assignment Model

Clients and professionals should be linked through explicit assignments.

Assignment properties:

- scope: `training`, `nutrition`, `hybrid`
- status: `pending`, `active`, `paused`, `ended`
- granted permissions
- communication channels
- start date

## Visibility And Consent

A client must explicitly grant access for a professional to view:

- workout history
- nutrition logs
- body metrics
- selected imported health metrics

Access should be granular.

Example:

- coach can view workouts and readiness metrics
- nutritionist can view meals and weight trend
- neither can view unrelated private content without consent

## Professional Workflows

### Coach workflow

1. invite or accept a client
2. create plan or assign template
3. schedule sessions
4. review adherence and performance
5. provide feedback
6. receive check-ins

### Nutritionist workflow

1. invite or accept a client
2. define calorie and macro targets
3. assign meal structure
4. review meal logs and body metrics
5. provide feedback
6. track adherence and response

## Required Domain Objects

### ProfessionalProfile

Public or semi-public professional identity.

### ClientAssignment

Relationship wrapper between expert and client.

### PlanAssignment

Links a workout or nutrition plan to a client.

### CheckInTemplate

Questionnaire definition for recurring reviews.

### CheckInSubmission

Completed client review for a specific period.

### FeedbackNote

Private or shared recommendation from expert to client.

## Check-Ins

Check-ins are a major differentiator and should support:

- subjective energy and mood
- stress and sleep rating
- adherence self-rating
- weight and body metrics snapshot
- progress photos optional
- open text reflections

## Professional Dashboards

### Coach dashboard

Should show:

- upcoming sessions
- missed sessions
- training adherence
- recent client check-ins
- alert flags

### Nutritionist dashboard

Should show:

- meal adherence
- hydration adherence
- weight trend
- recent check-ins
- risk flags

## Professional Group Spaces

Experts should be able to run group workspaces such as:

- 8-week fat loss cohort
- beginner running club
- mobility challenge group

These workspaces should support:

- member channels
- announcements
- shared challenges
- content library later

## AI Support For Professionals

AI should support but never replace professional judgment.

Possible assistant features:

- summarize a client's last 7 days
- detect low adherence
- prepare a weekly review draft
- generate a trend summary

AI should not:

- silently alter plans
- publish client-sensitive conclusions automatically
- expose private data to unauthorized viewers

## Monetization Readiness

The model should leave room for later monetization:

- subscription to expert
- paid group cohorts
- premium analytics
- premium integrations

Billing is not required in the first architecture phase, but entity boundaries should not block it later.
