# AIOS Export Specification v1.2 — Export Validation Rules

Status: Draft

Defines validation rules that must pass before an AIOS artifact, bundle, or release package is marked export-ready.

## Validation Areas

- Document completeness
- Version consistency
- Dependency integrity
- Manifest correctness
- Package readiness
- Release readiness
- QC approval status

## Rules

- Export SHALL only process approved or export-eligible artifacts.
- Required documents SHALL be present before packaging.
- Version identifiers SHALL be consistent across manifest, changelog, and artifacts.
- Manifest SHALL enumerate all included files.
- Missing required artifacts SHALL block export.
- Failed QC SHALL block final export unless an explicit approved waiver exists.

## Result States

- `PASS` — export validation succeeded.
- `FAIL` — export validation failed.
- `HOLD` — export validation requires missing information.
- `WAIVED` — validation requirement was waived by approved authority.

## Failure Handling

If validation fails, Export SHALL:

1. Identify the failed validation area.
2. Report the missing or invalid artifact.
3. Preserve the export candidate state.
4. Route the blocker to QC, Repository, or the owning document domain.
5. Prevent export-ready marking until resolved.

## Issue Mapping

Closes #32
