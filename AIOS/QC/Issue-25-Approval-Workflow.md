# AIOS QC Manual v1.2 — Approval Workflow Addendum

Status: Draft implementation addendum
Scope: Issue #25
Authority: Derived from AIOS QC Manual and AIOS Repository lifecycle. This addendum SHALL NOT redefine Repository lifecycle or Production authority.

---

## 1. Purpose

The QC Approval Workflow defines how validated work moves from review to approval, lock, and release readiness.

QC approval confirms quality readiness. It does not replace repository release authority or production ownership.

---

## 2. Approval States

| State | Meaning |
|---|---|
| `PENDING_QC` | Awaiting validation. |
| `IN_REVIEW` | Validation is active. |
| `REVISION_REQUIRED` | Output must be corrected. |
| `HOLD` | Missing information prevents decision. |
| `APPROVED` | QC requirements satisfied. |
| `REJECTED` | Output fails required quality gates. |
| `LOCK_READY` | Output may be locked after required approval. |
| `RELEASE_READY` | Output may proceed to release packaging. |

---

## 3. Transition Rules

Allowed transitions SHOULD include:

```text
PENDING_QC -> IN_REVIEW
IN_REVIEW -> REVISION_REQUIRED
IN_REVIEW -> HOLD
IN_REVIEW -> APPROVED
IN_REVIEW -> REJECTED
REVISION_REQUIRED -> IN_REVIEW
HOLD -> IN_REVIEW
APPROVED -> LOCK_READY
LOCK_READY -> RELEASE_READY
```

QC SHALL NOT mark an artifact `APPROVED` while unresolved critical failures remain.

---

## 4. Approval Evidence

Approval SHOULD include:

- validated artifact;
- QC result;
- gate summary;
- unresolved warnings;
- reviewer notes;
- approval state;
- release readiness note when applicable.

---

## 5. Lock Relationship

QC approval MAY support lock readiness, but document lock remains governed by repository lifecycle and ownership rules.

A document SHOULD NOT be locked if QC identifies unresolved critical or major blockers.

---

## 6. Completion Criteria

Approval Workflow is complete when it defines:

- approval states;
- transition rules;
- approval evidence;
- lock relationship;
- release readiness relationship.

---

## Issue Mapping

Closes #25
