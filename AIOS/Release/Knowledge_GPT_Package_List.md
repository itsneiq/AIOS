# AIOS Knowledge GPT Package List

Release Target: **AIOS v1.0.0**

Status: **Prepared — Pending Final Release Lock**

---

## Purpose

This document defines the Knowledge GPT package candidate list for AIOS v1.0.0.

The package list is prepared for release assembly, but it is not final until the release checklist confirms that all blockers are cleared.

---

## Required Knowledge Files

Upload the following files to the Knowledge GPT package in this order:

1. `AIOS/Baseline/AIOS_Baseline_v1.0.md`
2. `AIOS/Core/AIOS_Core_v4.3_SSOT.md`
3. `AIOS/Runtime/AIOS_Runtime_v1.2.md`
4. `AIOS/Production/AIOS_Production_v4.4.md`
5. `AIOS/Prompt Standards/AIOS_Prompt_Standards_v1.3.md`
6. `AIOS/Templates/Templates_v1.2 SSOT.md`
7. `AIOS/Repository/Repository_v1.2.md`
8. `AIOS/QC/QC_Manual_v1.2.md`
9. `AIOS/Export/Export_Specification_v1.2.md`

---

## Release Support Files

The following files may be included as release support references, but they are not SSOT authority documents:

- `AIOS/Release/Release_Manifest.md`
- `AIOS/Release/Release_Notes_v1.0.0.md`
- `AIOS/Release/Compatibility_Report.md`
- `AIOS/Release/AIOS_v1.0_Release_Checklist.md`
- `AIOS/Release/SSOT_Audit_Report.md`
- `AIOS/Release/SSOT_Synchronization_Report.md`
- `AIOS/Release/Sprint_C1_Release_Closure_Report.md`

---

## Package Rules

- Upload only canonical release-target documents.
- Do not upload patch files.
- Do not upload branch notes as authority documents.
- Do not upload duplicate older versions unless explicitly needed for historical comparison.
- Do not let release support files override SSOT documents.
- AIOS Core remains the highest authority.

---

## Blocking Conditions

The Knowledge GPT package MUST NOT be treated as final while any of the following remain unresolved:

- Runtime still marked DRAFT.
- Production still marked DRAFT.
- Prompt Standards still contains development notes or unresolved draft markers.
- Templates, Repository, QC, or Export contain internal version mismatches.
- Compatibility Report is incomplete.
- Release Manifest is still Draft.
- Release Notes are still Draft.

---

## Current Result

The Knowledge GPT package list is prepared for AIOS v1.0.0 release assembly.

Final upload approval remains blocked until the release checklist reaches release-ready status.
