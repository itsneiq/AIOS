# AIOS QC Manual v1.2 — Failure Classification Addendum

Status: Draft implementation addendum
Scope: Issue #26
Authority: Derived from AIOS QC Manual, Runtime, and Production. This addendum SHALL NOT redefine Runtime or Production behavior.

---

## 1. Purpose

Failure Classification defines how AIOS QC categorizes validation failures and determines required remediation behavior.

Failure classification SHALL make quality issues actionable, traceable, and severity-aware.

---

## 2. Severity Levels

| Severity | Meaning | Blocking Behavior |
|---|---|---|
| `CRITICAL` | Breaks authority, safety, locked asset integrity, or release viability. | SHALL block approval. |
| `MAJOR` | Breaks required behavior, workflow, continuity, or compliance. | SHOULD block approval. |
| `MINOR` | Non-blocking defect that should be corrected. | MAY allow conditional approval. |
| `WARNING` | Risk or concern that does not currently break requirements. | SHALL be tracked. |
| `INFO` | Informational note or observation. | SHALL NOT block approval. |

---

## 3. Critical Failures

Critical failures include:

- AIOS Core redefinition by a lower-authority document;
- locked asset mutation;
- unsafe or prohibited output;
- missing required SSOT authority;
- release package corruption;
- invalid export target when export is required.

Critical failures SHALL require remediation before approval.

---

## 4. Major Failures

Major failures include:

- incomplete required section;
- contradictory instructions;
- broken production dependency;
- unresolved registry conflict;
- non-conforming prompt structure;
- failed continuity requirement.

Major failures SHOULD be resolved before approval.

---

## 5. Minor Failures

Minor failures include:

- formatting inconsistency;
- minor terminology drift;
- incomplete optional metadata;
- low-impact clarity issue;
- non-blocking editorial issue.

Minor failures MAY be tracked for later correction.

---

## 6. Warnings and Informational Notes

Warnings identify risk that may become blocking later.

Informational notes preserve context and review observations.

Warnings and informational notes SHALL NOT be used to bypass required validation.

---

## 7. Remediation Routing

QC SHALL route failures as follows:

| Severity | Route |
|---|---|
| `CRITICAL` | Reject or block until resolved. |
| `MAJOR` | Revision required unless waived by approved authority. |
| `MINOR` | Conditional approval or backlog correction. |
| `WARNING` | Track and monitor. |
| `INFO` | Record only. |

---

## 8. Completion Criteria

Failure Classification is complete when it defines:

- severity levels;
- blocking behavior;
- critical failure examples;
- major failure examples;
- minor failure examples;
- warning and info behavior;
- remediation routing.

---

## Issue Mapping

Closes #26
