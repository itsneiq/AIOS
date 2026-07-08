# AIOS Repository v1.2 — Repository Lifecycle Addendum

Status: Draft implementation addendum
Scope: Issue #18
Authority: Derived from AIOS Repository. This addendum SHALL NOT redefine AIOS Core or other domain specifications.

---

## 1. Purpose

Repository lifecycle defines the official states through which AIOS documents, addenda, RFCs, and release artifacts move.

Lifecycle states SHALL make document maturity and authority visible.

---

## 2. Lifecycle States

| State | Meaning |
|---|---|
| `DRAFT` | Work is incomplete and subject to change. |
| `REVIEW` | Work is ready for evaluation. |
| `APPROVED` | Work has been accepted for integration or release. |
| `LOCKED` | Work is stable and protected from casual semantic change. |
| `RELEASED` | Work is included in an official repository release. |
| `DEPRECATED` | Work is obsolete but preserved for traceability. |
| `ARCHIVED` | Work is inactive and retained for historical purposes. |

---

## 3. State Transition Rules

Allowed transitions SHOULD include:

```text
DRAFT -> REVIEW
REVIEW -> DRAFT
REVIEW -> APPROVED
APPROVED -> LOCKED
LOCKED -> RELEASED
RELEASED -> DEPRECATED
DEPRECATED -> ARCHIVED
```

Emergency corrections MAY return a released document to review only through an approved revision process.

---

## 4. Draft Behavior

Draft documents MAY change frequently.

Drafts SHALL NOT be treated as final authority unless explicitly authorized for a workflow.

---

## 5. Review Behavior

Review documents SHOULD be checked for:

- authority boundary compliance;
- terminology consistency;
- dependency correctness;
- version compatibility;
- changelog readiness;
- release readiness.

---

## 6. Locked Behavior

Locked documents SHALL preserve semantic stability.

Locked documents MAY receive editorial corrections that do not change meaning.

Semantic revisions SHALL require explicit versioning or approved RFC integration.

---

## 7. Released Behavior

Released documents are official repository artifacts.

A release SHALL be treated as a traceable snapshot of repository state at a specific time.

---

## 8. Deprecated and Archived Behavior

Deprecated documents SHALL identify their replacement when possible.

Archived documents SHALL remain available for historical traceability unless removal is required.

---

## 9. Completion Criteria

Repository lifecycle is complete when it defines:

- lifecycle states;
- transition rules;
- draft behavior;
- review behavior;
- locked behavior;
- released behavior;
- deprecated and archived behavior.

---

## Issue Mapping

Closes #18
