# AIOS Repository v1.2 — Repository Governance Addendum

Status: Draft implementation addendum
Scope: Issue #17
Authority: Derived from AIOS Repository and AIOS Core. This addendum SHALL NOT redefine domain specifications.

---

## 1. Purpose

Repository governance defines how AIOS repository changes are proposed, reviewed, locked, released, deprecated, and archived.

Governance SHALL preserve SSOT authority boundaries and prevent uncontrolled mutation of locked documents.

---

## 2. Governance Principles

AIOS repository governance SHALL follow these principles:

- Core authority is preserved.
- Domain documents own their own scope.
- Changes are traceable.
- Locked documents are not edited casually.
- Draft work is separated from released work.
- Major changes use RFC or documented review.
- Changelog entries accompany meaningful releases.

---

## 3. Change Types

Repository changes SHOULD be classified as:

| Type | Meaning |
|---|---|
| `docs` | Documentation change without semantic feature change. |
| `feat` | New behavior, template, rule, or documentation capability. |
| `fix` | Correction of error or inconsistency. |
| `chore` | Maintenance or structural work. |
| `refactor` | Restructure without semantic change. |
| `rfc` | Proposal requiring review before adoption. |
| `release` | Release packaging or version tagging. |

---

## 4. RFC Policy

An RFC SHOULD be used when a change:

- affects AIOS Core authority;
- changes architecture;
- changes document ownership;
- changes release compatibility;
- introduces a major workflow shift;
- breaks existing behavior or expectations.

RFCs SHALL remain proposals until approved.

---

## 5. Lock Policy

A document marked `LOCKED` SHALL NOT be changed except through an explicit revision process.

Allowed changes to locked documents include:

- typo correction;
- broken reference correction;
- metadata correction;
- approved version revision;
- approved RFC integration.

Any semantic change to a locked document SHALL require a new version or clearly documented revision note.

---

## 6. Release Policy

A release SHOULD include:

- release tag;
- release title;
- included document versions;
- changelog summary;
- migration notes when applicable;
- known limitations.

A release SHALL represent a traceable snapshot of repository state.

---

## 7. Deprecation Policy

Deprecated documents SHALL remain available for historical traceability unless removal is explicitly approved.

A deprecated document SHOULD identify:

- replacement document;
- deprecation reason;
- compatibility impact;
- migration path.

---

## 8. Governance Completion Criteria

Repository governance is complete when it defines:

- change classification;
- RFC policy;
- lock policy;
- release policy;
- deprecation policy;
- SSOT preservation requirements.

---

## Issue Mapping

Closes #17
