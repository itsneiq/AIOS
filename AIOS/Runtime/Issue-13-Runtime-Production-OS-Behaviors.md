# AIOS Runtime v1.2 — Production Operating System Runtime Behaviors

Status: Draft implementation addendum
Scope: Issue #13
Authority: Derived from AIOS Core, AIOS Runtime, and AIOS Production. This addendum SHALL NOT redefine AIOS Core or AIOS Production.

---

## 1. Purpose

This addendum defines runtime behaviors required for AIOS to operate Production as an executable operating system layer.

Runtime SHALL provide execution behavior, state handling, context handling, module activation, validation hooks, and session continuity required to implement Production workflows.

Runtime SHALL NOT define production strategy, creative logic, template content, or governance authority. Those responsibilities remain with their respective SSOT documents.

---

## 2. Runtime Boundary

Runtime is responsible for:

- booting the active AIOS execution context;
- loading production-relevant modules;
- maintaining session and state continuity;
- resolving context required by production execution;
- enforcing runtime behavior gates;
- exposing runtime hooks used by Production;
- routing validation failures to the correct recovery behavior;
- preserving SSOT authority ordering during execution.

Runtime is not responsible for:

- redefining AIOS Core architecture;
- redefining Production workflow logic;
- defining creative strategy;
- defining template structures;
- making final production approval decisions outside authorized workflow states.

---

## 3. Production Runtime Boot Behavior

When AIOS enters a production workflow, Runtime SHALL execute the following boot behavior:

1. Confirm active AIOS version and compatible document set.
2. Load AIOS Core authority.
3. Load Runtime behavior rules.
4. Load Production workflow requirements.
5. Load case state when present.
6. Load active registries when present.
7. Detect missing required inputs.
8. Initialize production session state.
9. Expose runtime hooks required by Production.
10. Enter the correct production state.

If any required authority document is missing, Runtime SHALL halt production execution or mark the session as blocked according to the active Runtime rules.

---

## 4. Production Session Behavior

A production session SHALL maintain:

- active CASE ID;
- active chapter, scene, or artifact state when applicable;
- loaded registry references;
- production phase;
- validation state;
- unresolved blockers;
- approval state;
- output artifact references.

Runtime SHALL preserve session continuity across production steps unless a reset, branch, or new CASE is explicitly requested.

---

## 5. Production State Machine Behavior

Runtime SHALL support the following production-facing states:

| State | Meaning |
|---|---|
| `IDLE` | No active production execution. |
| `INTAKE` | CASE or task intake is being normalized. |
| `PREPARATION` | Production readiness is being validated. |
| `REGISTRY_READY` | Required registries are available or explicitly marked. |
| `PLANNING` | Production planning artifacts are being prepared. |
| `EXECUTION` | Production artifact generation is active. |
| `QC` | Generated or prepared artifacts are under validation. |
| `REVISION` | Output requires correction. |
| `APPROVED` | Output passed the required gate. |
| `BLOCKED` | Execution cannot continue without intervention. |

Transitions SHALL be explicit. Runtime SHALL NOT silently skip required gates.

---

## 6. Context Manager Behavior

Runtime Context Manager SHALL resolve production context in this order:

1. System and safety constraints.
2. AIOS Core.
3. AIOS Runtime.
4. AIOS Production.
5. Prompt Standards and Templates.
6. Repository and CASE state.
7. Locked registries.
8. User-provided task input.
9. Reference materials.
10. Model inference.

When context is incomplete, Runtime SHALL mark missing values using an explicit state such as `UNSET`, `PENDING_LOCK`, or `DIRECTOR_DEFINED` when permitted.

---

## 7. Module Loader Behavior

Runtime SHALL load only the modules required by the active production state.

Production-relevant runtime modules MAY include:

- Boot Manager;
- Module Loader;
- State Machine;
- Session Manager;
- Context Manager;
- Memory Manager;
- Runtime API;
- Runtime Hooks;
- Validation Router.

Modules SHALL operate under AIOS Core authority and SHALL NOT redefine Production logic.

---

## 8. Runtime Hooks for Production

Runtime SHALL expose hooks for:

- pre-intake validation;
- preparation gate validation;
- registry readiness checks;
- artifact dependency checks;
- prompt compilation checks;
- QC handoff;
- revision routing;
- approval locking;
- export readiness checks.

Hooks SHALL be deterministic and traceable.

---

## 9. Failure Handling

If validation fails, Runtime SHALL:

1. Identify the failed gate.
2. Preserve current session state.
3. Mark the production state as `BLOCKED` or `REVISION`.
4. Report the missing or conflicting requirement.
5. Avoid generating downstream artifacts until the blocker is resolved.

Runtime SHALL NOT invent missing locked values unless the active specification allows `DIRECTOR_DEFINED` resolution.

---

## 10. Completion Criteria

This behavior set is complete when Runtime can reliably:

- boot production execution;
- maintain production state;
- load required context;
- enforce production gates;
- preserve asset and registry integrity;
- route failures safely;
- hand off completed artifacts to QC or approval.

---

## Issue Mapping

Closes #13
