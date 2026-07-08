# AIOS

AIOS (AI Operating System) is the official repository for the AIOS documentation and specifications.

AIOS is a specification-first ecosystem for structuring AI production workflows, runtime behavior, prompt standards, templates, repository governance, quality control, and export readiness.

## Status

Release target: `AIOS v1.0.0`

Current state: Release preparation and Sprint C1 release closure preparation.

## Single Source of Truth

`AIOS/Core/AIOS_Core_v4.3_SSOT.md` is the architectural authority.

All derived specifications must reference AIOS Core and must not redefine it.

Authority order:

1. AIOS Core
2. AIOS Runtime
3. AIOS Production
4. Domain specifications
5. Templates and implementation artifacts
6. Release and packaging documents

## Repository Structure

- `AIOS/Baseline/` — AIOS release baseline and coordination map
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

- `AIOS/Baseline/AIOS_Baseline_v1.0.md`
- `AIOS/Release/SSOT_Audit_Report.md`
- `AIOS/Release/SSOT_Synchronization_Report.md`
- `AIOS/Release/Compatibility_Report.md`
- `AIOS/Release/Release_Manifest.md`
- `AIOS/Release/Release_Notes_v1.0.0.md`
- `AIOS/Release/AIOS_v1.0_Release_Checklist.md`
- `AIOS/Release/Sprint_C1_Release_Closure_Report.md`
- `AIOS/Release/Knowledge_GPT_Package_List.md`

## Repository Guides

- `CONTRIBUTING.md`
- `GOVERNANCE.md`
- `SUPPORT.md`
- `ROADMAP.md`
- `CODE_OF_CONDUCT.md`
- `CHANGELOG.md`
- `SECURITY.md`
- `CODEOWNERS`

## Release Readiness

AIOS v1.0.0 requires:

- SSOT audit completion;
- compatibility verification;
- revision history synchronization;
- release manifest completion;
- Knowledge GPT package preparation and approval;
- final release lock.

Sprint C1 has prepared the release closure layer, but final release lock remains blocked until all unresolved gates are cleared.

## License

See `LICENSE`.
