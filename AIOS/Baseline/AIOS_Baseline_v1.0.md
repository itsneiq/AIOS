# AIOS Baseline v1.0

**Single Source of Truth**

Version: **1.0**

Status: **Release Baseline**

Classification: **Release Coordination Specification**

---

## Purpose

AIOS Baseline v1.0 defines the release coordination layer for AIOS v1.0.0.

This document does not redefine AIOS Core, Runtime, Production, Prompt Standards, Templates, Repository, QC, or Export specifications.

Instead, it records the release-level document map, ownership matrix, dependency matrix, terminology index, compatibility expectations, and Knowledge GPT packaging map required to keep the AIOS release set synchronized.

---

## Authority Rule

AIOS Core v4.3 SSOT remains the highest authority.

All documents listed in this baseline SHALL follow the authority order below:

1. AIOS Core v4.3 SSOT
2. AIOS Runtime v1.2
3. AIOS Production v4.4
4. Domain specifications
5. Templates and implementation artifacts
6. Release and packaging documents

No release baseline document MAY override or redefine an upstream SSOT.

---

## Part I — Release Manifest

The AIOS v1.0.0 release target consists of the following canonical document set:

| Domain | Canonical Path | Target Version |
|---|---|---:|
| AIOS Core | `AIOS/Core/AIOS_Core_v4.3_SSOT.md` | 4.3 |
| AIOS Runtime | `AIOS/Runtime/AIOS_Runtime_v1.2.md` | 1.2 |
| AIOS Production | `AIOS/Production/AIOS_Production_v4.4.md` | 4.4 |
| AIOS Prompt Standards | `AIOS/Prompt Standards/AIOS_Prompt_Standards_v1.3.md` | 1.3 |
| AIOS Templates | `AIOS/Templates/Templates_v1.2 SSOT.md` | 1.2 |
| AIOS Repository | `AIOS/Repository/Repository_v1.2.md` | 1.2 |
| AIOS QC Manual | `AIOS/QC/QC_Manual_v1.2.md` | 1.2 |
| AIOS Export Specification | `AIOS/Export/Export_Specification_v1.2.md` | 1.2 |
| AIOS Baseline | `AIOS/Baseline/AIOS_Baseline_v1.0.md` | 1.0 |

---

## Part II — Knowledge Ownership Matrix

| Knowledge Area | Owning Document | Notes |
|---|---|---|
| Architecture | AIOS Core | Highest authority |
| Runtime behavior | AIOS Runtime | Derived from Core |
| Production behavior | AIOS Production | Derived from Core and Runtime |
| Prompt governance | AIOS Prompt Standards | Domain authority only |
| Template formats | AIOS Templates | Implementation template authority |
| Repository governance | AIOS Repository | Repository structure authority |
| Quality control | AIOS QC Manual | QC process authority |
| Export readiness | AIOS Export Specification | Packaging and delivery authority |
| Release map | AIOS Baseline | Coordination only |

---

## Part III — Document Responsibility Matrix

| Document | Responsibility |
|---|---|
| AIOS Core | Defines architecture and authority model |
| AIOS Runtime | Defines runtime execution behavior required to implement Core |
| AIOS Production | Defines production execution behavior derived from Core and Runtime |
| AIOS Prompt Standards | Defines prompt construction, validation, and maintenance standards |
| AIOS Templates | Defines reusable document and production templates |
| AIOS Repository | Defines repository layout, governance, and maintenance rules |
| AIOS QC Manual | Defines review, validation, and quality gates |
| AIOS Export Specification | Defines release package and export readiness requirements |
| AIOS Baseline | Defines release-level cross-document coordination |

---

## Part IV — Document Dependency Matrix

| Document | Depends On | Must Not Redefine |
|---|---|---|
| Runtime | Core | Core |
| Production | Core, Runtime | Core, Runtime |
| Prompt Standards | Core, Runtime, Production as references | Core, Runtime, Production |
| Templates | Core, Runtime, Production, Prompt Standards | Core, Runtime, Production |
| Repository | Core, Runtime, Production, domain specs | Core, Runtime, Production |
| QC Manual | Core, Runtime, Production, domain specs | Core, Runtime, Production |
| Export Specification | Full release document set | Core, Runtime, Production |
| Baseline | Full release document set | Any upstream SSOT |

---

## Part V — Master Terminology Index

| Term | Source Authority |
|---|---|
| AIOS Core | AIOS Core |
| Runtime | AIOS Runtime |
| Production | AIOS Production |
| Prompt Standard | AIOS Prompt Standards |
| Template | AIOS Templates |
| Repository | AIOS Repository |
| QC | AIOS QC Manual |
| Export | AIOS Export Specification |
| Baseline | AIOS Baseline |
| Knowledge GPT Package | AIOS Export Specification and AIOS Baseline |

---

## Part VI — Cross Reference Standard

All release documents SHOULD reference canonical document names and canonical repository paths.

References to deprecated versions SHOULD be updated before final release lock.

Release references SHALL use the target set listed in Part I unless a document intentionally documents historical compatibility.

---

## Part VII — GPT Knowledge Map

The Knowledge GPT package SHOULD include the release-target SSOT set in the following reading order:

1. AIOS Baseline v1.0
2. AIOS Core v4.3 SSOT
3. AIOS Runtime v1.2
4. AIOS Production v4.4
5. AIOS Prompt Standards v1.3
6. AIOS Templates v1.2
7. AIOS Repository v1.2
8. AIOS QC Manual v1.2
9. AIOS Export Specification v1.2
10. Release notes and release manifest

---

## Part VIII — Version Compatibility Matrix

| Document | Target Version | Compatibility Status |
|---|---:|---|
| AIOS Core | 4.3 | Required |
| AIOS Runtime | 1.2 | Required |
| AIOS Production | 4.4 | Required |
| AIOS Prompt Standards | 1.3 | Required |
| AIOS Templates | 1.2 | Required |
| AIOS Repository | 1.2 | Required |
| AIOS QC Manual | 1.2 | Required |
| AIOS Export Specification | 1.2 | Required |
| AIOS Baseline | 1.0 | Required |

---

## Part IX — Final Lock Statement

AIOS Baseline v1.0 is release coordination authority only.

It does not change AIOS Core, Runtime, Production, or any domain SSOT.

Final AIOS v1.0.0 release lock MAY only occur after all release blockers in the release checklist are cleared.
