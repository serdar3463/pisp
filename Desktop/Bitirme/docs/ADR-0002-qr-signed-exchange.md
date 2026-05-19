# ADR-0002: Signed QR Request and Response Exchange

## Status

Accepted.

## Context

QR-based information exchange is useful but can be abused through spoofed or phishing requests.

## Decision

QR request and response payloads are signed using a device identity. Scanned requests must be verified and reviewed before response generation.

## Consequences

Benefits:

- Reduces spoofing risk.
- Creates auditable exchange semantics.
- Aligns with future DID/VC integration.

Trade-offs:

- Public key discovery and reputation are still needed for production.
- Users must still be warned about unknown requesters.

