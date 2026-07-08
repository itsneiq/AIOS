# Changelog — Runtime Session State Lifecycle

**Date:** 2026-07-09

**Scope:** AIOS Runtime v1.2

---

## Summary

Added a Runtime addendum defining explicit CASE Session State, state-driven `next` behavior, Creative-to-Production phase transition, and export-based CASE completion.

---

## Changes

- Added `AIOS/Runtime/AIOS_Runtime_Session_State_Lifecycle_Addendum_v1.2.md`.
- Required Runtime to persist CASE Session State when a CASE starts.
- Required Runtime to read state before every continuation command.
- Defined the Creative Planning → PSP Generation → PSP Approval → Compiler Phase → Export transition flow.
- Locked transition from `MODE=CREATIVE` to `MODE=PRODUCTION` and `PHASE=SPG` after PSP approval.
- Prohibited `next` from returning to chapter/story generation after production handoff.
- Corrected CASE completion so `STATUS=COMPLETE` depends on finished export, not final chapter generation.

---

## Completion Rule

Invalid behavior:

```text
if Chapter == Last:
    CASE COMPLETE
```

Required behavior:

```text
if Export == Finished:
    CASE COMPLETE
else:
    continue next production artifact
```

---

# End of Changelog
