# ADR-0001: Local-First Personal Data Custody

## Status

Accepted.

## Context

PISP handles personal, sensitive and potentially special category data. Central storage would increase regulatory, security and trust risk.

## Decision

PISP stores raw user-entered personal data locally on the user's device in an encrypted vault. Server-side services, when introduced, should avoid raw personal data storage by default.

## Consequences

Benefits:

- Lower central breach impact.
- Stronger sovereignty story.
- Better alignment with data minimisation.

Trade-offs:

- Device loss and recovery require careful design.
- Multi-device sync is harder.
- Support workflows cannot rely on server-side data access.

