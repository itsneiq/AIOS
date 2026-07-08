# AIOS Repository v1.2 — Document Ownership Addendum

Status: Draft implementation addendum
Scope: Issue #20
Authority: Derived from AIOS Repository and AIOS Baseline. This addendum SHALL NOT redefine AIOS Core or other domain specifications.

---

## 1. Purpose

Document ownership rules define which AIOS document owns each domain of authority.

Ownership SHALL prevent lower-authority documents from redefining higher-authority concepts.

---

## 2. Ownership Matrix

| Document | Owns | SHALL NOT Own |
|---|---|---|
| AIOS Core | Architecture, authority model, core concepts | Runtime implementation details, production templates |
| AIOS Runtime | Execution behavior, runtime state, runtime APIs, hooks | Core architecture, production strategy |
| AIOS Production | Production workflow, production lifecycle, production engines | Core architecture, runtime internals |
| AIOS Prompt Standards | Prompt structure, prompt compilation, prompt behavior | Core, Runtime, or Production definitions |
| AIOS Templates | Reusable document and production templates | Architecture or behavioral authority outside templates |
| AIOS Repository | Repository structure, governance, versioning, lifecycle | Core, Runtime, Production, Prompt, QC, or Export semantics |
| AIOS QC Manual | Validation, quality gates, review criteria | Production workflow ownership or Core architecture |
| AIOS Export Specification | Export formats, packaging, delivery behavior | QC authority or production behavior |
| AIOS Baseline | Knowledge map, compatibility matrix, cross-document references | Domain-specific behavior beyond baseline mapping |

---

## 3. Redefinition Rule

A document SHALL NOT redefine a concept owned by another document.

If a concept is needed from another document, the document SHALL reference the owning SSOT instead of duplicating or modifying the concept.

---

## 4. Cross-Reference Rule

Cross-references SHOULD include:

- source document name;
- source version when available;
- referenced domain;
- reason for dependency.

Cross-references SHALL preserve authority boundaries.

---

## 5. Conflict Rule

If two documents conflict, the owning document for that domain SHALL take precedence.

If ownership is unclear, AIOS Baseline or AIOS Repository MAY identify the correct owner, but SHALL NOT redefine the underlying domain concept.

---

## 6. Integration Rule

When addenda are integrated into SSOT files, the editor SHALL verify:

- ownership alignment;
- no Core redefinition;
- no Runtime/Production cross-over;
- terminology consistency;
- version compatibility;
- changelog coverage.

---

## 7. Completion Criteria

Document ownership is complete when it defines:

- ownership matrix;
- redefinition rule;
- cross-reference rule;
- conflict rule;
- integration rule.

---

## Issue Mapping

Closes #20
