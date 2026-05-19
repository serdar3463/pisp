# PISP Mobile Architecture

## Product Principle

PISP is a local-first personal information sovereignty application. Raw personal data should remain under user control on the device unless the user explicitly approves a disclosure.

## Layering

The application is organised around these layers:

- `src/data`: domain taxonomy, templates, policy state, disclosure projection and risk scoring.
- `src/services`: security, identity, storage, QR exchange and ledger services.
- `src/navigation`: product navigation definitions.
- `src/components`: shared UI/runtime components such as error boundaries.
- `App.tsx`: composition layer for the current MVP screens.
- `legal`: launch draft legal documents.
- `docs`: architecture and release governance.

## Security Model

Current controls:

- Local encrypted vault using app-level AES encryption.
- Encryption key stored in OS secure storage.
- Device unlock before app access.
- Background lock on app state changes.
- Device signing identity for QR exchange.
- Signed QR request and response payloads.
- Explicit consent before disclosure.
- Hash-only sovereignty ledger.

## Data Flow

1. User enters values in Vault.
2. Values are encrypted and stored locally.
3. Policy toggles decide which fields are eligible for disclosure.
4. Templates request a defined set of field IDs.
5. Disclosure preview intersects template fields with active policy.
6. QR exchange requires signature verification and explicit approval.
7. Ledger records proof hashes and metadata, not raw personal values.

## Current Boundaries

The current MVP is client-only. Future production infrastructure should be limited to:

- Template catalog.
- Public key discovery.
- Revocation registry.
- Optional proof anchoring.
- Support and abuse prevention.

Raw personal data should not be centrally stored by default.

