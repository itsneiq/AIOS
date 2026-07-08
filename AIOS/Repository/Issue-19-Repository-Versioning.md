# AIOS Repository v1.2 — Repository Versioning Addendum

Status: Draft implementation addendum
Scope: Issue #19
Authority: Derived from AIOS Repository. This addendum SHALL NOT redefine AIOS Core or other domain specifications.

---

## 1. Purpose

Repository versioning defines how AIOS repository documents and releases are versioned, tagged, and tracked.

Versioning SHALL preserve compatibility, traceability, and upgrade clarity.

---

## 2. Version Format

AIOS repository documents SHOULD use explicit version identifiers.

Recommended forms:

```text
vMAJOR.MINOR
vMAJOR.MINOR.PATCH
```

Examples:

```text
AIOS Core v4.3
AIOS Runtime v1.2
AIOS Repository v1.2
Release tag v4.3.0
```

---

## 3. Major Version

A major version SHOULD change when:

- authority model changes;
- architecture changes;
- compatibility breaks;
- document ownership changes;
- foundational workflow changes.

Major changes SHOULD use RFC review before adoption.

---

## 4. Minor Version

A minor version SHOULD change when:

- new compatible behavior is added;
- new templates are added;
- new governance rules are added;
- a specification expands without breaking compatibility.

---

## 5. Patch Version

A patch version SHOULD change when:

- typos are corrected;
- formatting is improved;
- broken references are fixed;
- clarifications are added without changing semantics.

---

## 6. Compatibility Rules

A document update is compatible when it does not contradict or override a higher-authority document.

A lower-authority document SHALL NOT claim compatibility if it redefines a higher-authority domain.

---

## 7. Migration Notes

Breaking or major changes SHOULD include migration notes explaining:

- changed behavior;
- affected documents;
- required user action;
- deprecated behavior;
- replacement behavior.

---

## 8. Release Tags

Release tags SHOULD identify stable repository snapshots.

A release tag SHOULD include:

- version number;
- release title;
- included document versions;
- changelog entry;
- known limitations.

---

## 9. Completion Criteria

Repository versioning is complete when it defines:

- version format;
- major version rules;
- minor version rules;
- patch version rules;
- compatibility rules;
- migration notes;
- release tag behavior.

---

## Issue Mapping

Closes #19
