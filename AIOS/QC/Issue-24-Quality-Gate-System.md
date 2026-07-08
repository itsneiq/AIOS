# AIOS QC Manual v1.2 — Quality Gate System Addendum

Status: Draft implementation addendum
Scope: Issue #24
Authority: Derived from AIOS QC Manual, Runtime, Production, Prompt Standards, Templates, Repository, and Export. This addendum SHALL NOT redefine those documents.

---

## 1. Purpose

The Quality Gate System defines checkpoints that determine whether an AIOS document, prompt, registry, artifact, or release package may proceed to the next lifecycle stage.

Quality gates SHALL be explicit, traceable, and severity-aware.

---

## 2. Gate Types

QC v1.2 SHALL support the following gates:

| Gate | Purpose |
|---|---|
| Intake Gate | Validates required request or CASE information. |
| Authority Gate | Validates SSOT ownership and non-redefinition. |
| Registry Gate | Validates registry readiness and locked asset states. |
| Prompt Gate | Validates prompt compliance and compilation readiness. |
| Asset Gate | Validates locked asset consistency. |
| Continuity Gate | Validates CASE, chapter, and artifact continuity. |
| Output Gate | Validates generated or drafted output quality. |
| Export Gate | Validates packaging and delivery readiness. |
| Release Gate | Validates release candidate readiness. |

---

## 3. Gate Decisions

Each gate SHALL return one of:

- `PASS` — gate is satisfied.
- `FAIL` — gate is not satisfied.
- `HOLD` — gate requires missing information or review.
- `WAIVED` — gate is intentionally bypassed by approved authority.
- `N/A` — gate does not apply.

A waived gate SHALL include a reason.

---

## 4. Gate Blocking Rules

- Critical failures SHALL block approval.
- Major failures SHOULD block approval unless explicitly waived.
- Minor failures MAY allow conditional approval when documented.
- Warnings SHALL be tracked but MAY NOT block.
- Informational notes SHALL NOT block.

---

## 5. Gate Evidence

Gate results SHOULD include:

- gate name;
- decision;
- severity;
- evidence;
- affected artifact;
- remediation note;
- reviewer or validator;
- timestamp when available.

---

## 6. Completion Criteria

The Quality Gate System is complete when it defines:

- gate types;
- decision states;
- blocking rules;
- waiver behavior;
- evidence requirements.

---

## Issue Mapping

Closes #24
