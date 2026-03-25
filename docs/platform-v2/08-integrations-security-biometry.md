# Integrations, Security, And Biometry

## Clarifying "Biometry"

The product must distinguish two separate concepts:

1. biometric authentication
2. biometric and health measurements

They solve different problems and require different architectures.

## Biometric Authentication

### Recommended approach

Use passkeys and WebAuthn for passwordless or second-factor authentication.

This supports:

- Face ID
- Touch ID
- Windows Hello
- platform authenticators

### Important rule

The platform must not store raw biometric information.

It should store only:

- passkey credentials
- credential public keys
- sign-in metadata

### Benefits

- stronger security
- better UX
- reduced password friction

## Health And Biometric Measurements

These are user metrics such as:

- body weight
- body fat
- heart rate
- sleep
- steps
- calories burned

These should be stored in dedicated health entities with:

- source metadata
- timestamps
- unit normalization
- visibility rules

## Integration Targets

Recommended future integrations:

- Apple Health
- Health Connect
- Garmin
- Fitbit
- Polar
- Strava import where relevant

## Integration Strategy

### Phase 1

Manual data entry only.

### Phase 2

Connection registry and import adapters.

### Phase 3

Scheduled sync jobs and source reconciliation.

## Source Of Truth Rules

1. Imported data must preserve provider and import timestamp.
2. Manual edits must not silently overwrite imported raw records.
3. Derived summaries may combine multiple sources, but source lineage must remain available.

## Privacy Rules

Health data is sensitive.

The platform must support:

- explicit client consent
- explicit sharing scope
- revocable permissions
- audit logs for professional access

## Security Controls

### Authentication

- JWT or secure token pair for API auth
- passkey support later
- refresh token rotation
- session revocation

### Authorization

- RBAC for workspace access
- scoped policies for client data
- deny-by-default for health and expert features

### Storage

- encrypt secrets
- hash passwords with modern algorithms
- sign object storage uploads
- validate media types

### Audit

Audit log required for:

- access to private client data
- role and permission changes
- assignment creation and termination
- integration connection changes

## Compliance Readiness

The product may later need stronger compliance posture depending on geography and usage.

Therefore the architecture should support:

- data export
- account deletion
- consent revocation
- retention policy configuration

This document does not claim medical compliance readiness. It only defines an architecture that can evolve toward stronger privacy governance.

## AI And Sensitive Data

If AI features consume health and coaching data:

1. use only explicitly permitted data
2. sanitize prompts
3. avoid sending unnecessary identifiers
4. log AI access paths
5. provide user-facing disclosure for assistant usage

## Reliability Requirements For Integrations

Integration jobs should be:

- idempotent
- retryable
- observable
- rate-limited

Failed imports must not corrupt existing user data.
