# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private reporting instead: **Security > Report a vulnerability** on this repository. If that is unavailable, email pushpakmjaiswal@gmail.com.

Include what you found, how to reproduce it, and what you think the impact is. You will get a reply within a few days.

## What matters most here

- **The signing key.** Certificates are only trustworthy while `CERT_SIGNING_KEY` stays secret. A leak means every certificate must be re-issued with a new key.
- **Workflow injection.** `certify.yml` passes issue data to scripts only through environment variables. Anything that lets issue text run as a command is in scope.
- **Signature bypass.** Any way to make `checkSignature` accept an edited or forged certificate is in scope.
- **Score manipulation** that earns a high grade without real merged work is a bug, and welcome as a report.

## Supported versions

Only the latest commit on `main` is supported.
