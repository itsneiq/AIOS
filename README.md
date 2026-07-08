# AIOS

AIOS (AI Operating System) is the official repository for the AIOS documentation and specifications.

AIOS is a specification-first ecosystem for structuring AI production workflows, runtime behavior, prompt standards, templates, repository governance, quality control, and export readiness.

## Status

Release target: `AIOS v1.0.0`

Current state: Release preparation and SSOT synchronization.

## Single Source of Truth

`AIOS/Core/AIOS_Core_v4.3_SSOT.md` is the architectural authority.

All derived specifications must reference AIOS Core and must not redefine it.

Authority order:

1. AIOS Core
2. AIOS Runtime
3. AIOS Production
4. Domain specifications
5. Templates and implementation artifacts

## Repository Structure

- `AIOS/Core/` — AIOS Core SSOT
- `AIOS/Runtime/` — Runtime specification
- `AIOS/Production/` — Production specification
- `AIOS/Prompt Standards/` — Prompt standards
- `AIOS/Templates/` — Templates
- `AIOS/Repository/` — Repository specification
- `AIOS/QC/` — Quality Control manual
- `AIOS/Export/` — Export specification
- `AIOS/RFC/` — Requests for Comments
- `AIOS/CHANGELOG/` — Sprint-level changelog entries
- `AIOS/Release/` — Release preparation documents

## Release Documents

Current release preparation files:

- `AIOS/Release/SSOT_Audit_Report.md`
- `AIOS/Release/Compatibility_Report.md`
- `AIOS/Release/Release_Manifest.md`
- `AIOS/Release/Release_Notes_v1.0.0.md`
- `AIOS/Release/AIOS_v1.0_Release_Checklist.md`

## Repository Guides

- `CONTRIBUTING.md`
- `GOVERNANCE.md`
- `SUPPORT.md`
- `ROADMAP.md`
- `CODE_OF_CONDUCT.md`
- `CHANGELOG.md`

## Release Readiness

AIOS v1.0.0 requires:

- SSOT audit completion;
- compatibility verification;
- revision history synchronization;
- release manifest completion;
- Knowledge GPT package preparation.

## License

See `LICENSE`.
