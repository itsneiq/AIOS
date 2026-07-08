# AIOS Runtime Session State Lifecycle Addendum v1.2

## Single Source of Truth Addendum

**Version:** 1.2

**Status:** REVIEW REQUIRED

**Document Type:** Runtime Derived Addendum

**Applies To:** `AIOS/Runtime/AIOS_Runtime_v1.2.md`

**Authority:** AIOS Core v4.3 → AIOS Runtime v1.2

---

# Purpose

This addendum defines mandatory runtime behavior for CASE session state, phase transition, and CASE completion.

The purpose is to prevent Runtime from guessing production progress from conversation context or incorrectly marking a CASE complete when the final chapter has been generated.

This document defines runtime implementation behavior only.

It does not redefine AIOS Core, Production, Prompt Standards, Templates, or Repository governance.

---

# 1. Session State Requirement

## 1.1 Requirement

When a CASE is started, Runtime SHALL create and persist an explicit CASE Session State.

Runtime SHALL read the active CASE Session State before responding to any continuation command, including `next`, `lanjut`, `continue`, or equivalent continuation intent.

Runtime SHALL NOT infer the active CASE phase only from conversation context when a CASE Session State exists.

---

## 1.2 Minimum Session State Fields

Runtime SHALL preserve at minimum:

```yaml
CASE_ID: CASE-001
MODE: CREATIVE
PHASE: PSP
CHAPTER: 1
STATUS: ACTIVE
```

Additional implementation fields MAY be added when required for execution integrity, provided they do not redefine lifecycle semantics.

Recommended optional fields:

```yaml
LAST_ARTIFACT: PSP_CHAPTER_001
APPROVAL_STATE: PENDING
EXPORT_STATUS: NOT_STARTED
UPDATED_AT: <runtime timestamp>
```

---

## 1.3 Session State Read Rule

Before executing `next`, Runtime SHALL:

1. read active CASE Session State;
2. verify `STATUS` is not `COMPLETE`;
3. determine the next valid artifact from `MODE`, `PHASE`, `CHAPTER`, and approval state;
4. execute only the next valid artifact;
5. update CASE Session State after successful artifact generation or phase transition.

Runtime SHALL NOT skip this read rule.

---

# 2. Phase Transition Requirement

## 2.1 Canonical Production-Oriented Phase Flow

Runtime SHALL preserve the following production-oriented flow for CASE execution:

```text
Creative Planning
↓
PSP Generation
↓
PSP Approval
↓
Compiler Phase
↓
Export
```

This flow represents execution behavior only and SHALL NOT redefine AIOS Core lifecycle semantics.

---

## 2.2 Creative Mode Behavior

While `MODE=CREATIVE`, `next` SHALL produce only the next valid creative planning artifact.

Valid Creative Mode behavior includes:

- generating the next chapter planning artifact;
- generating required PSP material;
- recommending chapter structure improvements when the active state requires creative decision support;
- requesting approval only when the active phase requires approval before production handoff.

Runtime SHALL NOT enter production artifact generation while `MODE=CREATIVE` unless PSP has been completed and approved.

---

## 2.3 PSP Approval Transition

After PSP is completed and approved, Runtime SHALL automatically update CASE Session State as follows:

```yaml
MODE: PRODUCTION
PHASE: SPG
STATUS: ACTIVE
```

After this transition, Runtime SHALL treat story structure, chapter count, and approved creative direction as locked production inputs.

Runtime SHALL NOT return to chapter creation, rewrite story structure, or alter approved creative decisions unless the user explicitly requests a revision and the Runtime records that revision as a state-changing override.

---

## 2.4 Production Mode Behavior

While `MODE=PRODUCTION`, `next` SHALL continue producing the next required production artifact according to the active `PHASE`.

Production phases MAY include, when applicable:

```text
SPG
Storyboard Sheet
Storyboard Image Prompt
MIP
Master Image
VPG
Generated Video
QC
Export
```

Runtime SHALL use the active phase and CASE Session State to determine the next artifact.

Runtime SHALL NOT regenerate creative chapters merely because the user says `next`.

---

# 3. CASE Completion Rule

## 3.1 Incorrect Completion Behavior

Runtime SHALL NOT mark a CASE complete solely because the final planned chapter has been reached or generated.

The following implicit behavior is invalid:

```text
if Chapter == Last:
    CASE COMPLETE
```

---

## 3.2 Correct Completion Behavior

CASE completion SHALL depend on the full production lifecycle, not on chapter count.

The correct rule is:

```text
if Export == Finished:
    CASE COMPLETE
else:
    continue next production artifact
```

Runtime SHALL keep `STATUS=ACTIVE` until export has finished successfully.

---

## 3.3 Completion Gate

Runtime MAY set:

```yaml
STATUS: COMPLETE
```

only after all mandatory production artifacts have been completed and export has finished successfully.

Before export is finished, Runtime SHALL continue from the next required production artifact.

---

# 4. Continuation Command Resolution

## 4.1 `next` Resolution Algorithm

For every continuation command, Runtime SHALL apply this algorithm:

```text
read CASE_SESSION_STATE

if STATUS == COMPLETE:
    report CASE already complete
    stop

if MODE == CREATIVE:
    continue creative planning or PSP artifact

if MODE == CREATIVE and PSP == APPROVED:
    set MODE = PRODUCTION
    set PHASE = SPG
    continue SPG

if MODE == PRODUCTION:
    continue next production artifact by PHASE

if PHASE == EXPORT and EXPORT_STATUS == FINISHED:
    set STATUS = COMPLETE
    report CASE complete
else:
    keep STATUS = ACTIVE
```

Runtime SHALL prefer state-driven continuation over conversational guesswork.

---

# 5. Locking Behavior After Production Handoff

After the PSP Approval Transition:

- story structure SHALL be treated as locked;
- chapter sequence SHALL be treated as locked;
- approved creative decisions SHALL be treated as locked;
- production artifacts SHALL inherit from approved PSP state;
- `next` SHALL advance production, not creative planning.

Runtime SHALL NOT alter approved story logic during SPG, MIP, VPG, QC, or Export unless the user explicitly requests a revision.

---

# 6. Conformance

A conforming Runtime implementation SHALL:

- persist explicit CASE Session State when a CASE starts;
- read CASE Session State before every continuation command;
- transition from Creative Mode to Production Mode only after PSP completion and approval;
- prevent production `next` commands from returning to chapter/story generation;
- keep CASE status active until export has finished;
- mark CASE complete only after successful export completion.

Failure to satisfy these rules constitutes Runtime behavior failure for CASE continuation.

---

# End of Addendum
