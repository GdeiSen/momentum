# RBAC And Workspaces

## Why The Current Role Model Must Change

The current project uses fixed workspace roles:

- member
- admin
- owner

This is not enough for the target platform because Momentum must support:

- moderator
- coach
- nutritionist
- content manager
- event organizer
- analyst
- read-only observer

The system must move from enum-based access to permission-based RBAC.

## Workspace Model

Workspace is the new product abstraction for the current team entity.

Workspace types:

- `team`
- `club`
- `program`
- `coach-group`
- `private-group`

All group collaboration features should depend on workspace membership.

## Role System

### System Roles

System roles are protected roles that always exist:

- `owner`
- `admin`
- `member`

These roles may be implemented as seeded templates.

### Custom Roles

Workspace owners and admins with the appropriate permission should be able to create custom roles such as:

- `moderator`
- `coach`
- `nutritionist`
- `captain`
- `reviewer`

### Multi-Role Assignment

A single member may have multiple role assignments inside one workspace.

Example:

- a user may be `member + coach`
- a user may be `member + moderator`

## Permission Model

Permissions should be flat, explicit, and machine-readable.

Permission naming convention:

`resource.action`

Examples:

- `workspace.update`
- `workspace.delete`
- `members.invite`
- `members.remove`
- `members.block`
- `roles.manage`
- `channels.create`
- `channels.manage`
- `messages.moderate`
- `posts.create`
- `posts.moderate`
- `events.create`
- `challenges.manage`
- `programs.assign`
- `workouts.assign`
- `nutrition.assign`
- `health.view_summary`
- `health.view_private_assigned`
- `analytics.view_workspace`

## Permission Resolution

Permission checks should be resolved in this order:

1. account is authenticated
2. account is an active workspace member
3. member is not blocked or suspended
4. aggregate permissions are calculated from all assigned roles
5. resource-level constraints are checked

## Resource-Level Constraints

Permission alone is not enough. Some actions need ownership or scope checks.

Examples:

- a coach may view only assigned clients, not all members
- a moderator may delete messages but not transfer ownership
- a nutritionist may manage meal plans but not workspace branding

## Recommended Tables

### `role_templates`

- id
- workspace_id
- name
- description
- is_system
- priority
- created_by

### `permissions`

- code
- resource
- action
- description

### `role_permissions`

- role_template_id
- permission_code

### `member_role_assignments`

- membership_id
- role_template_id
- assigned_by
- assigned_at

## Recommended Backend Implementation

### Current state

Permission logic is mostly hardcoded in services and guards.

### Target state

Add:

- `PermissionsGuard`
- `@RequirePermissions(...)` decorator
- `AccessResolverService`
- resource policies for sensitive domains

Example flow:

1. controller declares permissions
2. guard loads workspace membership
3. guard resolves effective permissions
4. policy service validates object-level access

## Workspace Structure

Each workspace should support:

- overview page
- members
- channels
- feed
- events
- challenges and programs
- optional expert section
- analytics
- settings

## Membership Lifecycle

Membership statuses:

- `pending`
- `active`
- `blocked`
- `left`
- `removed`

Entry methods:

- public join
- invite link
- email whitelist
- direct assignment by workspace admin

## Moderation Requirements

Workspace moderation should support:

- mute member in channel
- suspend member
- block member
- remove member
- archive channel
- delete or hide message
- hide post from feed

These actions must be auditable.

## Audit Log

Sensitive workspace actions should create audit records:

- role created
- role updated
- role assigned
- member blocked
- member removed
- channel permissions changed
- private data access by professional

## Default Role Templates

### Owner

Can do everything inside the workspace.

### Admin

Can manage members, channels, feed, programs, and moderation, but cannot delete owner-controlled safeguards unless explicitly granted.

### Member

Can participate in allowed channels, feed, and public workspace activities.

### Coach

Can manage assigned training programs, view assigned client training data, and communicate in scoped channels.

### Nutritionist

Can manage assigned nutrition plans, view assigned client nutrition and health data based on consent, and communicate in scoped channels.
