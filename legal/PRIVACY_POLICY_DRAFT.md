# PISP Privacy Policy Draft

Last updated: 2026-04-15

This is a launch draft and must be reviewed by qualified legal counsel before public release.

## Summary

PISP is designed as a local-first personal information sovereignty application. The user's raw personal data is stored on the user's device in an encrypted local vault. PISP should not require central storage of raw personal data to operate core vault, policy, QR exchange and proof ledger functions.

## Data Stored On Device

The following data may be stored locally:

- Personal information entered by the user.
- Consent and policy settings.
- QR exchange request and response records.
- Local proof ledger entries.
- Device identity key material stored through the operating system secure storage.

## Data Not Intended For Central Collection

PISP's core design does not require central collection of:

- Identity values.
- Contact details.
- Health information.
- Financial information.
- Biometric values.
- Raw disclosure payloads.

## Optional Server-Side Data

Future production infrastructure may process:

- Account support requests.
- Public key discovery metadata.
- Template catalog metadata.
- Revocation metadata.
- Optional proof hash anchoring.
- Security abuse signals.

## QR Exchange

When a user scans a QR request, the request is verified locally where possible. The user sees the requested fields, the purpose and the requester DID before approving a response. PISP does not automatically disclose data after scanning a QR code.

## Deletion

Users can erase the local vault from inside the application. If server-side accounts or support records are introduced, PISP must provide a public data deletion request process.

## Contact

Support URL: https://pisp.example/support

