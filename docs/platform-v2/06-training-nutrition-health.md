# Training, Nutrition, And Health

## Goal

Momentum must support active lifestyle data as structured domains, not as generic notes.

The product should separate:

- habits
- workouts
- nutrition
- health and biometrics

## Habits

Habits remain useful for low-friction recurring behavior tracking.

Good habit examples:

- sleep before 23:00
- drink 2 liters of water
- stretch 10 minutes
- walk 10k steps

Habits should support:

- daily or weekly recurrence
- completion status
- streaks
- reminders
- challenge participation

## Training Domain

### Core Concepts

- workout template
- workout plan
- workout session
- exercise catalog
- exercise entry
- set entry
- personal records

### Sport Categories

Initial categories should include:

- running
- walking
- cycling
- swimming
- gym strength
- functional training
- stretching and mobility
- custom activity

### Workout Session Requirements

Each session should support:

- title
- sport type
- duration
- notes
- RPE
- calories optional
- attachments
- visibility

Strength session extension:

- exercises
- sets
- reps
- load
- rest

Endurance session extension:

- distance
- pace
- elevation later
- average heart rate optional

### Workout Plans

Plans should allow:

- assignment by self or coach
- weekly structure
- scheduled sessions
- completion status
- adherence analytics

### Analytics

Training analytics should include:

- sessions per week
- total duration
- total volume
- distance by sport
- load trend
- adherence to plan
- PR milestones

## Nutrition Domain

### Core Concepts

- meal log
- meal items
- food catalog later
- hydration log
- nutrition target
- nutrition plan

### Meal Log Requirements

Each meal log should support:

- meal type
- timestamp
- free text description
- structured macros when available
- photo
- tags
- visibility

### Nutrition Targets

Users should be able to maintain:

- daily calories
- protein target
- carb target
- fat target
- water target

### Nutrition Plan

A nutrition expert should be able to assign:

- calorie goal
- macro split
- meal timing guidance
- food preferences
- restrictions
- supplementation notes

### Nutrition Analytics

Nutrition analytics should include:

- target adherence
- macro consistency
- hydration consistency
- meal timing stability
- weekly summary

## Health And Biometric Domain

### Manual Metrics

Support manual entry for:

- body weight
- waist
- chest
- hips
- body fat
- resting heart rate
- sleep duration
- subjective energy

### Imported Metrics

Support external import for:

- steps
- calories burned
- sleep
- heart rate
- distance
- exercise energy

### Data Principles

1. Raw health data should be private by default.
2. Shared summaries should be derived views, not forced exposure of raw measurements.
3. Imported data should store source metadata.

### Trend Analytics

The product should later provide:

- weekly and monthly trends
- anomaly detection
- change over baseline
- adherence overlays with training and nutrition

## Why These Domains Must Stay Separate

If workouts, nutrition, and health are collapsed into habits:

- analytics become weak
- coaching becomes unreliable
- data import becomes hard
- permissions become unclear

If these domains are separated:

- each can evolve independently
- UI becomes clearer
- AI insights become more accurate
- coach and nutritionist workflows become feasible

## Example Cross-Domain Use Cases

### Use case 1: personal consistency

User tracks:

- sleep habit
- gym workouts
- protein target
- weekly weight trend

### Use case 2: team challenge

Workspace runs a hybrid challenge scored by:

- workout count
- water habit completion
- average step count

### Use case 3: nutrition review

Nutritionist reviews:

- meal adherence
- hydration trend
- weight change
- weekly check-in response

### Use case 4: coach support

Coach reviews:

- completed training sessions
- fatigue check-in
- resting heart rate trend
- missed sessions

## Recommended Release Order

1. workout sessions with basic analytics
2. meal logs with daily targets
3. manual biometrics
4. assigned plans
5. imported health data
6. advanced insights
