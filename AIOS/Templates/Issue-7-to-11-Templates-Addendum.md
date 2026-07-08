# AIOS Templates v1.2 — Production Template Addendum

Status: Draft implementation addendum
Scope: Issues #7–#11
Authority: Derived from AIOS Core, Runtime, Production, and Templates. This addendum SHALL NOT redefine Core, Runtime, or Production.

---

## 1. Production Preparation Template

```md
# Production Preparation

## Preparation Metadata

- CASE ID:
- Production Owner:
- Platform:
- Business Goal:
- Target Audience:
- Engine Target:
- Status: PENDING_PREPARATION | READY | BLOCKED

## Required Inputs

- Product Reference:
- Character / Model Reference:
- Environment Reference:
- Style Reference:
- Audio Reference:
- Constraints:
- Success Criteria:

## Readiness Checklist

- [ ] Business goal is defined.
- [ ] Platform is defined.
- [ ] Product reference is available or marked UNSET.
- [ ] Required registries are created.
- [ ] Locked assets are identified.
- [ ] Missing data is marked PENDING_LOCK or DIRECTOR_DEFINED.
- [ ] QC requirements are known.
- [ ] Output format is defined.

## Gate Decision

- Gate Status: PASS | FAIL | HOLD
- Blocking Issues:
- Director Notes:
```

---

## 2. Master Asset Registry Template

```md
# Master Asset Registry

## Registry Metadata

- Registry ID:
- CASE ID:
- Version:
- Status: DRAFT | LOCKED | DEPRECATED

## Character Registry

- Character ID:
- Role:
- Identity Lock:
- Face / Body / Wardrobe Lock:
- Allowed Variations:
- Prohibited Mutations:

## Product Registry

- Product ID:
- Product Name:
- Category:
- Geometry Lock:
- Dimension Lock:
- Material / Color Lock:
- Logo / Branding Lock:
- Prohibited Mutations:

## World Registry

- World ID:
- Setting:
- Mood:
- Continuity Notes:

## Camera Registry

- Camera Style:
- Aspect Ratio:
- Lens / Shot Type:
- Movement:

## Lighting Registry

- Lighting Type:
- Direction:
- Mood:
- Continuity Notes:

## Audio Registry

- Audio Reference:
- Dialogue:
- SFX:
- Music Direction:

## Props Registry

- Prop ID:
- Placement:
- Lock State:

## Style Registry

- Visual Style:
- Color Palette:
- Negative Style Constraints:

## Environment Registry

- Location:
- Set Dressing:
- Background Constraints:

## Chapter Registry

- Chapter ID:
- Duration:
- Objective:
- Dependency Notes:
```

---

## 3. Storyboard Template Update

```md
# Production Storyboard Template

## Chapter Information

- CASE ID:
- Chapter ID:
- Chapter Title:
- Duration:
- Objective:
- Target Emotion:

## Storyboard Generation Prompt

- Purpose:
- Layout Specification:
- Storyboard Content Specification:
- Visual Style Specification:

## Production Storyboard Sheet

- Visual Concept:
- World Setting:
- Character / Model:
- Product:
- Mood:
- Lighting:
- Camera Style:
- Audio Reference:
- Transition Out:

## Shot Breakdown

| Timecode | Visual | Action | Camera | Audio | Notes |
|----------|--------|--------|--------|-------|-------|
| 0.0–2.0s |        |        |        |       |       |
| 2.0–5.0s |        |        |        |       |       |
| 5.0–10.0s |       |        |        |       |       |

## Continuity Notes

- Character Lock:
- Product Lock:
- Environment Lock:
- Wardrobe Lock:
- Color Palette:
- Negative Constraints:
```

---

## 4. Chapter Template Update

```md
# Chapter Template

## Chapter Brief

- CASE ID:
- Chapter ID:
- Title:
- Duration: maximum 10 seconds unless overridden by an authorized specification.
- Objective:
- Story Beat:
- Target Emotion:

## Creative Objective

- Hook:
- Message:
- Viewer Curiosity Trigger:
- CTA Direction:

## Production Artifacts

1. Storyboard Generation Prompt
2. Production Storyboard Sheet
3. Storyboard Image Prompt
4. Storyboard Image
5. Master Image Prompt
6. Master Image
7. Video Prompt
8. Generated Video
9. QC Report
10. Approval State

## Atomic Chapter Rule

One Chapter = One Master Image = One Video Prompt = One AI Video = One QC Cycle.

## QC

- QC Status: PASS | FAIL | REVISION_REQUIRED
- Blocking Issues:
- Approval Notes:
```

---

## 5. CASE Template Update

```md
# CASE Template

## CASE Intake

- CASE ID:
- Business Goal:
- Platform:
- Product:
- Target Audience:
- Reference:
- Constraints:
- Success Criteria:
- Notes:

## CASE Metadata

- Status: DRAFT | ACTIVE | LOCKED | COMPLETED | ARCHIVED
- Owner:
- Version:
- Created:
- Updated:

## Registry Index

- Character Registry:
- Product Registry:
- World Registry:
- Camera Registry:
- Lighting Registry:
- Audio Registry:
- Props Registry:
- Style Registry:
- Environment Registry:
- Chapter Registry:

## Chapter Plan

| Chapter | Title | Duration | Objective | Status |
|---------|-------|----------|-----------|--------|
| 1 |       |          |           |        |

## Production Tracking

- Current Chapter:
- Current Artifact:
- QC Status:
- Approval Status:
- Release Status:

## Change Log

| Date | Change | Reason | Approved By |
|------|--------|--------|-------------|
```

---

## Issue Mapping

- Closes #7
- Closes #8
- Closes #9
- Closes #10
- Closes #11
