# AIOS Export Specification v1.2 — Packaging Specification

Status: Draft

Defines canonical package structure, naming conventions, manifest requirements, metadata, and bundle composition for AIOS release exports.

## Package Contents
- SSOT documents
- Supporting addenda
- CHANGELOG
- Release notes
- Manifest
- Knowledge GPT package

## Rules
- Package version MUST match release version.
- Manifest MUST enumerate included artifacts.
- Missing required artifacts SHALL block packaging.

Closes #30