# Governance

AIOS governance preserves document authority, version compatibility, and release quality.

## Authority Model

AIOS Core is the highest authority.

Derived documents SHALL NOT redefine AIOS Core.

Derived document authority order:

1. AIOS Core
2. AIOS Runtime
3. AIOS Production
4. Domain specifications
5. Templates and implementation artifacts

## Decision Process

Major changes SHOULD use an RFC or tracked issue before integration.

## Release Process

A release SHOULD include:

- synchronized SSOT documents;
- compatibility report;
- release manifest;
- release notes;
- changelog;
- Knowledge GPT package when applicable.

## Version Policy

Breaking changes require a major version update.
Compatible additions require a minor version update.
Editorial fixes may use patch-level release notes.
