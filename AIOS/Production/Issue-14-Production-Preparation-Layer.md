# AIOS Production v4.4 — Production Preparation Layer

Status: Draft implementation addendum
Scope: Issue #14
Authority: Derived from AIOS Core, AIOS Runtime, and AIOS Production. This addendum SHALL NOT redefine Core or Runtime.

---

## 1. Purpose

The Production Preparation Layer defines the pre-production layer responsible for converting intake, references, constraints, and available assets into a production-ready state.

This layer SHALL prepare production execution. It SHALL NOT replace Production workflow logic, Runtime execution behavior, or Core architecture.

---

## 2. Layer Boundary

The Production Preparation Layer is responsible for:

- intake normalization;
- reference inventory;
- registry readiness;
- missing-data classification;
- production dependency validation;
- readiness gating;
- handoff to planning or execution.

The Production Preparation Layer is not responsible for:

- redefining AIOS Core;
- redefining Runtime behavior;
- replacing Story, Storyboard, Image, Video, Audio, or QC engines;
- approving final production outputs;
- bypassing QC.

---

## 3. Preparation Inputs

The layer SHALL inspect the following inputs when available:

- CASE intake;
- business goal;
- platform;
- product information;
- target audience;
- references;
- constraints;
- success criteria;
- notes;
- locked assets;
- existing registries;
- required output format.

Missing inputs SHALL be explicitly marked and SHALL NOT be silently invented.

---

## 4. Preparation States

| State | Meaning |
|---|---|
| `NOT_STARTED` | Preparation has not begun. |
| `INTAKE_READY` | Required intake fields are present or explicitly marked. |
| `REFERENCE_READY` | Required references are available or marked missing. |
| `REGISTRY_READY` | Required registries are created or pending. |
| `DEPENDENCY_READY` | Production dependencies are validated. |
| `READY_FOR_PLANNING` | Planning may begin. |
| `READY_FOR_EXECUTION` | Execution may begin. |
| `BLOCKED` | Required information or validation is missing. |

State transitions SHALL be explicit and traceable.

---

## 5. Missing Data States

Preparation SHALL classify missing or incomplete data using:

- `UNSET` — data is not available.
- `PENDING_LOCK` — data must be defined before final generation.
- `DIRECTOR_DEFINED` — Director may define the value within allowed authority.
- `BLOCKED` — production cannot continue until resolved.

---

## 6. Preparation Gates

### Gate 1 — Intake Gate

Validates that basic CASE or task intake is present.

### Gate 2 — Reference Gate

Validates that required references are present, declared absent, or marked for Director definition.

### Gate 3 — Registry Gate

Validates required asset registries and lock states.

### Gate 4 — Dependency Gate

Validates dependencies between CASE, Chapter, Registry, Prompt, QC, and Export artifacts.

### Gate 5 — Execution Gate

Validates that production may safely proceed to planning or generation.

Failure at any gate SHALL stop downstream production until the blocker is resolved.

---

## 7. Registry Preparation

The layer SHALL prepare or validate:

- Character Registry;
- Product Registry;
- World Registry;
- Camera Registry;
- Lighting Registry;
- Audio Registry;
- Props Registry;
- Style Registry;
- Environment Registry;
- Chapter Registry.

Locked registry values SHALL be protected from mutation.

---

## 8. Handoff Behavior

When preparation passes required gates, the layer SHALL hand off to the next applicable production phase:

- Production Planning;
- Storyboard Planning;
- Master Image Planning;
- Video Planning;
- QC Preparation;
- Export Preparation.

The handoff SHALL include readiness state, unresolved assumptions, registry references, and known blockers.

---

## 9. Completion Criteria

The Production Preparation Layer is complete when it can:

- normalize intake;
- inventory references;
- classify missing data;
- validate registries;
- validate dependencies;
- produce a readiness decision;
- hand off safely to production planning or execution.

---

## Issue Mapping

Closes #14
