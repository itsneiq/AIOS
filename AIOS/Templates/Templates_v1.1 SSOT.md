# Part I
# Template Manifest

---

# 1. Purpose

AIOS Templates v1.1 SSOT defines the official document templates used throughout the AIOS ecosystem.

This specification standardizes the structure, metadata, placeholders, formatting, and document layout for all production artifacts.

AIOS Templates SHALL NOT define architecture.

AIOS Templates SHALL NOT define runtime behavior.

AIOS Templates SHALL NOT define production logic.

Those responsibilities belong exclusively to:

- AIOS Core v4.3 SSOT
- AIOS Runtime v1.1 SSOT
- AIOS Production v4.3 SSOT

This document only specifies the canonical template formats used by those specifications.

---

# 2. Scope

This specification governs:

- Document templates
- Production templates
- Prompt templates
- Registry templates
- Validation templates
- Quality Control templates
- Export templates

This specification does not govern:

- Runtime execution
- System architecture
- Production workflow
- Governance policies
- Engine implementation

---

# 3. Objectives

The objectives of AIOS Templates are:

• Standardize every reusable template.

• Ensure consistency across all AIOS documents.

• Eliminate formatting ambiguity.

• Improve interoperability between AIOS modules.

• Enable deterministic document generation.

• Preserve compatibility across future releases.

---

# 4. Authority

AIOS Templates is a derived specification.

Authority hierarchy:

AIOS Core
    ↓
AIOS Runtime
    ↓
AIOS Production
    ↓
AIOS Templates

AIOS Templates SHALL comply with every upstream specification.

No template may override any upstream authority.

---

# 5. Normative References

AIOS Templates references the following documents:

- AIOS Core v4.3 SSOT
- AIOS Runtime v1.1 SSOT
- AIOS Production v4.3 SSOT
- AIOS Repository v1.1 SSOT
- AIOS Prompt Standards v1.2 SSOT

Definitions contained in those documents SHALL NOT be redefined here.

---

# 6. Design Principles

Every template SHALL be:

- deterministic
- reusable
- modular
- implementation-independent
- version-controlled
- machine-readable
- human-readable
- forward-compatible

---

# 7. Non-Goals

AIOS Templates SHALL NOT:

- introduce new architecture
- introduce new runtime behavior
- introduce production engines
- define business logic
- define validation algorithms
- define execution policies

Those topics belong to their respective SSOT documents.

---

# 8. Canonical Status

AIOS Templates v1.1 SSOT is the official template specification.

Any custom template is considered non-normative unless explicitly adopted by a future SSOT release.

End of Part I.

---

# Part II
# Template Governance

---

# 1. Purpose

Template Governance defines the rules for creating, maintaining, versioning, and approving all official AIOS templates.

Its purpose is to ensure that every template remains consistent, reusable, and fully aligned with the authoritative AIOS specifications.

---

# 2. Governance Authority

Template Governance is subordinate to the following specifications:

1. AIOS Core v4.3 SSOT
2. AIOS Runtime v1.1 SSOT
3. AIOS Production v4.3 SSOT

AIOS Templates SHALL NOT supersede or reinterpret any upstream specification.

When conflicts occur, precedence SHALL follow the official authority hierarchy.

---

# 3. Single Source of Truth (SSOT)

Every official template SHALL have exactly one canonical definition.

Duplicate template definitions are prohibited.

Modified copies, local variants, or unofficial adaptations SHALL NOT be considered normative.

---

# 4. Template Ownership

Each template SHALL have a clearly defined owning specification.

Examples:

| Template | Owning Specification |
|----------|----------------------|
| CASE Template | AIOS Production |
| Chapter Template | AIOS Production |
| Storyboard Template | AIOS Production |
| Prompt Template | AIOS Prompt Standards |
| QC Template | AIOS QC Manual |
| Export Template | AIOS Export Specification |
| Repository Template | AIOS Repository |

AIOS Templates acts as the canonical collection of these approved formats without redefining their functional behavior.

---

# 5. Template Lifecycle

Every official template SHALL progress through the following lifecycle:

Draft

↓

Review

↓

Validation

↓

Approval

↓

Release

↓

Maintenance

↓

Deprecation (if applicable)

Only templates in the **Release** state are considered normative.

---

# 6. Change Control

Template changes SHALL be controlled.

Every modification MUST include:

- version identifier
- revision date
- summary of changes
- compatibility assessment
- approval record

Untracked modifications are prohibited.

---

# 7. Backward Compatibility

Whenever practical, new template revisions SHOULD preserve compatibility with previous releases.

Breaking changes SHALL be explicitly documented.

Migration guidance SHALL accompany incompatible revisions.

---

# 8. Naming Governance

Official template names SHALL remain stable across releases.

Renaming is permitted only when:

- ambiguity exists,
- redundancy is removed,
- or architectural alignment requires the change.

Historical aliases SHALL be documented when applicable.

---

# 9. Structural Consistency

All templates SHALL use consistent structural conventions, including:

- heading hierarchy
- metadata placement
- placeholder syntax
- formatting rules
- numbering style

This ensures deterministic interpretation by both humans and AI systems.

---

# 10. Validation Requirement

Before publication, every template SHALL be verified to ensure:

- structural completeness,
- formatting consistency,
- placeholder integrity,
- reference validity,
- version correctness.

Validation procedures are defined in AIOS QC Manual.

---

# 11. Prohibited Actions

Templates SHALL NOT:

- redefine architecture,
- redefine runtime behavior,
- redefine production workflow,
- introduce undocumented modules,
- bypass governance,
- contradict upstream SSOT documents.

---

# 12. Compliance

A template is considered compliant only if it:

- conforms to this specification,
- references upstream SSOT documents correctly,
- maintains structural consistency,
- passes quality validation,
- receives formal approval.

Only compliant templates are eligible for inclusion in an official AIOS release.

---

End of Part II.

---

# Part III
# Template Architecture

---

# 1. Purpose

Template Architecture defines the organizational structure of all official AIOS templates.

It specifies how templates are categorized, composed, and related without redefining system architecture, runtime behavior, or production logic.

---

# 2. Architectural Principles

All AIOS templates SHALL follow these principles:

- Modular
- Deterministic
- Reusable
- Hierarchical
- Version-controlled
- Reference-driven
- Implementation-independent

Each template SHALL represent a single responsibility.

---

# 3. Template Hierarchy

The official template hierarchy is:

```

AIOS Templates
│
├── Project Templates
│ ├── CASE
│ ├── Chapter
│ ├── Scene (if applicable)
│ └── Production Report
│
├── Planning Templates
│ ├── Storyboard
│ ├── Production Storyboard Sheet
│ ├── Asset Registry
│ └── Production Plan
│
├── Prompt Templates
│ ├── Storyboard Generation Prompt
│ ├── Storyboard Image Prompt
│ ├── Master Image Prompt
│ ├── Video Prompt
│ ├── Audio Prompt
│ └── QC Prompt
│
├── Registry Templates
│ ├── Character Registry
│ ├── Product Registry
│ ├── Environment Registry
│ ├── Camera Registry
│ ├── Lighting Registry
│ ├── Style Registry
│ └── Asset Registry
│
├── Validation Templates
│ ├── Validation Report
│ ├── QC Report
│ └── Approval Report
│
└── Export Templates
├── Markdown
├── PDF
├── DOCX
└── JSON

```

---

# 4. Layered Organization

Templates are organized into independent layers.

```

Reference Layer
↓

Planning Layer
↓

Production Layer
↓

Validation Layer
↓

Export Layer

```

Each layer SHALL depend only on upstream specifications.

Templates SHALL NOT create cyclic dependencies.

---

# 5. Template Composition

Every template SHALL consist of standardized sections where applicable:

- Header
- Metadata
- Purpose
- Content Body
- References
- Validation Status
- Version Information

Additional sections MAY be added when required by the owning specification.

---

# 6. Dependency Model

Templates SHALL reference authoritative specifications rather than duplicate their contents.

Example:

```

CASE Template
↓

AIOS Production

NOT

CASE Template
↓

Embedded Production Rules

```

Normative content SHALL always remain in its owning SSOT.

---

# 7. Template Categories

Official categories include:

### Planning

- CASE
- Chapter
- Storyboard
- Production Planning

### Prompting

- Storyboard Prompt
- Image Prompt
- Video Prompt
- Audio Prompt

### Registry

- Character
- Product
- Camera
- Lighting
- Environment
- Style
- Asset

### Validation

- QC
- Validation
- Approval

### Export

- Markdown
- PDF
- DOCX
- JSON

---

# 8. Reusability

Templates SHALL be reusable across:

- projects
- production engines
- runtime sessions
- repositories
- future releases

Template reuse SHALL NOT require structural modification.

---

# 9. Extensibility

Future templates MAY extend existing template families provided that:

- compatibility is maintained,
- ownership is defined,
- upstream specifications remain unchanged,
- governance requirements are satisfied.

Extensions SHALL NOT invalidate existing templates.

---

# 10. Architectural Constraints

AIOS Templates SHALL NOT:

- define execution behavior,
- define runtime lifecycle,
- define production workflow,
- define engine algorithms,
- redefine terminology,
- introduce architectural concepts.

Those responsibilities remain with their respective SSOT documents.

---

# 11. Compliance

A template architecture implementation is compliant only if:

- category placement is correct,
- dependencies are valid,
- references are preserved,
- ownership is maintained,
- upstream authority is respected.

---

End of Part III.

---

# Part IV
# Template Naming Standard

---

# 1. Purpose

This section defines the official naming conventions for all AIOS templates.

Consistent naming ensures that templates are:

- uniquely identifiable,
- easily searchable,
- machine-readable,
- human-readable,
- compatible across all AIOS specifications.

This standard applies to every official template released under AIOS.

---

# 2. Naming Principles

Every template name SHALL be:

- unique
- descriptive
- stable across versions
- implementation-independent
- free of ambiguity

Template names SHALL describe the artifact, not the implementation.

---

# 3. Canonical Naming Format

The canonical naming format is:

<Artifact Name> Template

Examples:

- CASE Template
- Chapter Template
- Storyboard Template
- Production Storyboard Sheet Template
- Storyboard Generation Prompt Template
- Storyboard Image Prompt Template
- Master Image Prompt Template
- Video Prompt Template
- Audio Prompt Template
- QC Report Template
- Validation Report Template
- Asset Registry Template

---

# 4. File Naming Convention

Official filenames SHALL use the following convention:

AIOS_<Document>_v<Version>_SSOT.<extension>

Examples:

AIOS_Templates_v1.1_SSOT.md

AIOS_Templates_v1.1_SSOT.pdf

AIOS_QC_Manual_v1.1_SSOT.md

AIOS_Export_Specification_v1.1_SSOT.pdf

---

# 5. Internal Identifier Convention

Templates MAY define an internal identifier.

Recommended format:

TPL-XXXX

Examples:

TPL-CASE-001

TPL-CHAPTER-001

TPL-STORYBOARD-001

TPL-MIP-001

TPL-VPG-001

TPL-QC-001

Identifiers SHALL remain stable once published.

---

# 6. Placeholder Naming Convention

Placeholders SHALL use uppercase snake case enclosed in angle brackets.

Format:

<PLACEHOLDER_NAME>

Examples:

<CASE_ID>

<CASE_NAME>

<CHAPTER_NUMBER>

<BUSINESS_GOAL>

<TARGET_AUDIENCE>

<PRODUCT_NAME>

<VIDEO_DURATION>

<CAMERA_STYLE>

<LIGHTING_STYLE>

Negative examples:

{Case}

(case)

CaseName

<<Goal>>

---

# 7. Metadata Field Naming

Metadata fields SHALL use Title Case.

Examples:

Version

Status

Owner

Source

Authority

Created Date

Last Updated

Compatibility

Validation Status

Avoid inconsistent capitalization.

---

# 8. Heading Convention

Headings SHALL follow a consistent hierarchy.

Example:

# Part

## Section

### Subsection

#### Detail

Heading depth SHOULD NOT exceed four levels unless explicitly required.

---

# 9. Version Naming

Version identifiers SHALL use semantic numbering.

Examples:

v1.0

v1.1

v2.0

v4.3

Draft identifiers MAY use:

Draft

RC1

RC2

Beta

Final

Only released versions are normative.

---

# 10. Reserved Terms

The following names are reserved and SHALL NOT be reused for unrelated artifacts:

AIOS

Core

Runtime

Production

Repository

Prompt Standards

Templates

QC Manual

Export Specification

Baseline

SSOT

Manifest

Registry

Template

Validation

Approval

Governance

---

# 11. Deprecated Names

When a template is renamed, the previous name SHALL be documented in the compatibility matrix.

Deprecated names SHALL NOT be reused for new templates.

---

# 12. Compliance

A template naming implementation is compliant if:

- names are unique,
- filenames follow the standard,
- placeholders use canonical syntax,
- metadata fields are consistent,
- version identifiers are valid,
- reserved terms are respected.

---

End of Part IV.

---

# Part V
# Template Metadata Standard

---

# 1. Purpose

This section defines the canonical metadata structure for all official AIOS templates.

Metadata provides standardized descriptive information that enables:

- identification
- traceability
- version control
- validation
- compatibility
- governance
- repository indexing

Every official AIOS template SHALL use this metadata standard unless otherwise specified by its owning SSOT.

---

# 2. Metadata Principles

Metadata SHALL be:

- standardized
- deterministic
- machine-readable
- human-readable
- version-controlled
- implementation-independent

Metadata SHALL describe the artifact only.

Metadata SHALL NOT contain executable logic.

---

# 3. Canonical Metadata Layout

Every official template SHOULD begin with the following metadata block.

```text
Title:

Document ID:

Template ID:

Version:

Status:

Owner:

Authority:

Derived From:

Source Specification:

Repository Path:

Created Date:

Last Updated:

Compatibility:

Validation Status:

Approval Status:
```

Additional fields MAY be appended by the owning specification.

---

# 4. Required Metadata Fields

The following fields are mandatory for all official templates.

| Field | Requirement |
|---------|-------------|
| Title | REQUIRED |
| Version | REQUIRED |
| Status | REQUIRED |
| Authority | REQUIRED |
| Source Specification | REQUIRED |
| Validation Status | REQUIRED |

A template missing any required field SHALL be considered incomplete.

---

# 5. Optional Metadata Fields

The following fields are recommended where applicable.

- Document ID
- Template ID
- Owner
- Repository Path
- Created Date
- Last Updated
- Compatibility
- Approval Status
- Notes

Optional fields SHALL NOT alter template semantics.

---

# 6. Metadata Value Rules

Metadata values SHALL follow these conventions.

### Version

Examples:

v1.0

v1.1

v4.3

---

### Status

Allowed values include:

Draft

Review

Approved

Released

Deprecated

Archived

---

### Validation Status

Allowed values include:

Pending

Validated

Rejected

---

### Approval Status

Allowed values include:

Pending

Approved

Withdrawn

---

### Compatibility

Examples:

Compatible with AIOS Core v4.3

Compatible with AIOS Runtime v1.1

Compatible with AIOS Production v4.3

---

# 7. Authority Declaration

Each template SHALL explicitly declare its authority.

Example:

Authority:

AIOS Templates v1.1 SSOT

If the template is derived, the parent specification SHALL also be identified.

---

# 8. Source Specification

Every template SHALL identify the originating specification responsible for its functional behavior.

Examples:

AIOS Production v4.3 SSOT

AIOS Prompt Standards v1.2 SSOT

AIOS QC Manual v1.1 SSOT

AIOS Export Specification v1.1 SSOT

AIOS Templates SHALL NOT duplicate those specifications.

---

# 9. Repository Metadata

Repository information MAY be included.

Example:

Repository Path:

Templates/

Production/

CASE/

This field assists indexing but SHALL NOT define repository behavior.

---

# 10. Metadata Consistency

Metadata SHALL remain synchronized across:

- Markdown
- PDF
- DOCX
- JSON
- Repository index

Conflicting metadata across formats is prohibited.

---

# 11. Metadata Validation

Before release, metadata SHALL be verified for:

- completeness
- field correctness
- version accuracy
- authority declaration
- compatibility declaration
- status consistency

Validation procedures are governed by AIOS QC Manual.

---

# 12. Canonical Metadata Example

```text
Title:
CASE Template

Document ID:
DOC-TPL-001

Template ID:
TPL-CASE-001

Version:
v1.1

Status:
Released

Owner:
AIOS Templates

Authority:
AIOS Templates v1.1 SSOT

Derived From:
AIOS Production v4.3 SSOT

Source Specification:
AIOS Production v4.3 SSOT

Repository Path:
Templates/Production/CASE/

Created Date:
YYYY-MM-DD

Last Updated:
YYYY-MM-DD

Compatibility:
AIOS Core v4.3
AIOS Runtime v1.1
AIOS Production v4.3

Validation Status:
Validated

Approval Status:
Approved
```

---

# 13. Compliance

A template complies with this standard only if:

- required metadata fields are present,
- metadata values follow canonical conventions,
- authority is correctly declared,
- source specification is identified,
- version information is accurate,
- validation status is maintained.

---

End of Part V.

---

# Part VI
# CASE Template

---

# 1. Purpose

The CASE Template defines the canonical document structure for an AIOS production case.

A CASE serves as the highest-level production container within a project. It organizes production metadata, objectives, planning references, and links to downstream production artifacts.

This section specifies only the template structure.

Production workflow, execution behavior, lifecycle, and validation logic are defined by AIOS Production v4.3 SSOT.

---

# 2. Ownership

Owning Specification:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical document format.

---

# 3. Template Structure

Every CASE Template SHOULD follow the structure below.

```text
CASE Header
    ↓
Metadata
    ↓
Business Context
    ↓
Production Scope
    ↓
Objectives
    ↓
References
    ↓
Constraints
    ↓
Success Criteria
    ↓
Chapter Index
    ↓
Asset References
    ↓
Validation Status
    ↓
Version Information
```

---

# 4. Canonical CASE Template

```text
# CASE

## Metadata

CASE ID:
<CASE_ID>

CASE Name:
<CASE_NAME>

Version:
<VERSION>

Status:
<STATUS>

Owner:
<OWNER>

Authority:
AIOS Production v4.3 SSOT

---

## Business Goal

<BUSINESS_GOAL>

---

## Platform

<PLATFORM>

---

## Product

<PRODUCT_NAME>

---

## Target Audience

<TARGET_AUDIENCE>

---

## Production Objective

<PRODUCTION_OBJECTIVE>

---

## References

<REFERENCE_LIST>

---

## Constraints

<CONSTRAINTS>

---

## Success Criteria

<SUCCESS_CRITERIA>

---

## Chapter Index

<CHAPTER_LIST>

---

## Asset References

<ASSET_REFERENCE_LIST>

---

## Validation Status

<VALIDATION_STATUS>

---

## Notes

<NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 5. Required Fields

The following placeholders are mandatory.

- <CASE_ID>
- <CASE_NAME>
- <BUSINESS_GOAL>
- <PLATFORM>
- <PRODUCT_NAME>
- <TARGET_AUDIENCE>
- <SUCCESS_CRITERIA>
- <VERSION>
- <STATUS>

A CASE SHALL NOT omit any required field.

---

# 6. Optional Fields

Optional placeholders MAY include:

- <OWNER>
- <REFERENCE_LIST>
- <ASSET_REFERENCE_LIST>
- <NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT alter the template structure.

---

# 7. Placeholder Rules

All placeholders SHALL follow the canonical syntax defined in Part IV.

Example:

<CASE_ID>

<PRODUCT_NAME>

<CHAPTER_LIST>

Custom placeholder formats are prohibited.

---

# 8. Chapter References

The CASE Template SHALL reference Chapter Templates.

Example:

Chapter 1

↓

Chapter Template

Chapter 2

↓

Chapter Template

The CASE Template SHALL NOT embed complete chapter definitions.

---

# 9. Asset References

The CASE Template MAY reference:

- Character Registry
- Product Registry
- Camera Registry
- Lighting Registry
- Environment Registry
- Style Registry
- Asset Registry

Referenced assets remain authoritative in their own documents.

---

# 10. Validation

Before approval, a CASE document SHOULD verify:

- required fields completed,
- metadata valid,
- chapter references present,
- asset references valid,
- version information current.

Validation procedures are defined in AIOS QC Manual.

---

# 11. Compliance

A CASE Template is compliant only if:

- canonical structure is preserved,
- required placeholders are present,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Production,
- no production logic is redefined.

---

End of Part VI.

---

# Part VII
# Chapter Template

---

# 1. Purpose

The Chapter Template defines the canonical document structure for an AIOS production chapter.

A Chapter is the primary production unit within a CASE.

This specification defines only the document template.

Chapter execution, production lifecycle, orchestration, and validation logic are governed exclusively by AIOS Production v4.3 SSOT.

---

# 2. Ownership

Owning Specification:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical chapter document format.

---

# 3. Relationship

The hierarchy is:

CASE
    ↓
Chapter
    ↓
Production Artifacts

Each Chapter belongs to exactly one CASE.

---

# 4. Canonical Chapter Structure

```text
Chapter Header
    ↓
Metadata
    ↓
Creative Brief
    ↓
Production References
    ↓
Asset References
    ↓
Output References
    ↓
Validation Status
    ↓
Version Information
```

---

# 5. Canonical Chapter Template

```text
# Chapter

## Metadata

Chapter Number:
<CHAPTER_NUMBER>

Chapter Title:
<CHAPTER_TITLE>

CASE ID:
<CASE_ID>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Production v4.3 SSOT

---

## Creative Objective

<CREATIVE_OBJECTIVE>

---

## Target Emotion

<TARGET_EMOTION>

---

## Story Summary

<STORY_SUMMARY>

---

## Production References

Storyboard Template:
<STORYBOARD_REFERENCE>

Production Storyboard Sheet:
<PSS_REFERENCE>

Master Image Prompt:
<MASTER_IMAGE_PROMPT_REFERENCE>

Video Prompt:
<VIDEO_PROMPT_REFERENCE>

Audio Prompt:
<AUDIO_PROMPT_REFERENCE>

---

## Asset References

<Character Registry>

<Product Registry>

<Environment Registry>

<Camera Registry>

<Lighting Registry>

<Style Registry>

<Asset Registry>

---

## Deliverables

<DELIVERABLE_LIST>

---

## Validation Status

<VALIDATION_STATUS>

---

## Notes

<NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <CHAPTER_NUMBER>
- <CHAPTER_TITLE>
- <CASE_ID>
- <CREATIVE_OBJECTIVE>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <TARGET_EMOTION>
- <STORY_SUMMARY>
- <NOTES>
- <DELIVERABLE_LIST>
- <COMPATIBILITY>

Optional fields SHALL NOT modify the canonical structure.

---

# 8. Artifact References

A Chapter MAY reference the following production artifacts:

- Storyboard
- Production Storyboard Sheet
- Storyboard Generation Prompt
- Storyboard Image Prompt
- Master Image Prompt
- Video Prompt
- Audio Prompt
- QC Report

The Chapter SHALL reference these artifacts without embedding or redefining their specifications.

---

# 9. Asset References

The Chapter MAY reference approved assets including:

- Character Registry
- Product Registry
- Environment Registry
- Camera Registry
- Lighting Registry
- Style Registry
- Asset Registry

Referenced assets remain authoritative in their owning specifications.

---

# 10. Placeholder Rules

All placeholders SHALL comply with the naming conventions defined in Part IV.

Examples:

<CHAPTER_NUMBER>

<CREATIVE_OBJECTIVE>

<VIDEO_PROMPT_REFERENCE>

---

# 11. Validation

Before approval, a Chapter SHOULD verify:

- metadata completeness,
- required placeholders,
- artifact references,
- asset references,
- version information.

Validation procedures are defined in AIOS QC Manual.

---

# 12. Compliance

A Chapter Template is compliant only if:

- canonical structure is preserved,
- required fields are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Production,
- no production workflow is redefined.

---

End of Part VII.

---

# Part VIII
# Storyboard Template

---

# 1. Purpose

The Storyboard Template defines the canonical document structure for an AIOS Storyboard.

A Storyboard is a planning artifact used to visualize the intended progression of a Chapter before production begins.

This specification defines only the document template.

Storyboard planning methodology, production workflow, sequencing, and execution behavior are governed exclusively by AIOS Production v4.3 SSOT.

---

# 2. Ownership

Owning Specification:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical storyboard document format.

---

# 3. Relationship

The relationship is:

CASE
    ↓
Chapter
    ↓
Storyboard
    ↓
Production Artifacts

Each Storyboard belongs to exactly one Chapter.

---

# 4. Canonical Storyboard Structure

```text
Storyboard Header
    ↓
Metadata
    ↓
Storyboard Overview
    ↓
Storyboard Panels
    ↓
Transition Notes
    ↓
Production Notes
    ↓
Asset References
    ↓
Validation Status
    ↓
Version Information
```

---

# 5. Canonical Storyboard Template

```text
# Storyboard

## Metadata

Storyboard ID:
<STORYBOARD_ID>

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Production v4.3 SSOT

---

## Storyboard Objective

<STORYBOARD_OBJECTIVE>

---

## Storyboard Summary

<STORYBOARD_SUMMARY>

---

## Storyboard Panels

Panel 01
<Action>

<Visual>

<Camera>

<Duration>

<Notes>

---

Panel 02

<Action>

<Visual>

<Camera>

<Duration>

<Notes>

---

...

---

## Transition Notes

<TRANSITION_NOTES>

---

## Production Notes

<PRODUCTION_NOTES>

---

## Asset References

<Character Registry>

<Product Registry>

<Environment Registry>

<Camera Registry>

<Lighting Registry>

<Style Registry>

---

## Validation Status

<VALIDATION_STATUS>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <STORYBOARD_ID>
- <CASE_ID>
- <CHAPTER_NUMBER>
- <STORYBOARD_OBJECTIVE>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <STORYBOARD_SUMMARY>
- <TRANSITION_NOTES>
- <PRODUCTION_NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT modify the canonical structure.

---

# 8. Storyboard Panel Rules

Each storyboard panel SHOULD include:

- Action
- Visual
- Camera
- Duration
- Notes

Additional panel attributes MAY be added by the owning specification.

The Storyboard Template SHALL NOT define cinematic methodology or production sequencing.

---

# 9. Asset References

A Storyboard MAY reference:

- Character Registry
- Product Registry
- Environment Registry
- Camera Registry
- Lighting Registry
- Style Registry

Assets remain authoritative in their respective specifications.

---

# 10. Placeholder Rules

All placeholders SHALL follow the canonical syntax defined in Part IV.

Examples:

<STORYBOARD_ID>

<TRANSITION_NOTES>

<PRODUCTION_NOTES>

---

# 11. Validation

Before approval, a Storyboard SHOULD verify:

- metadata completeness,
- required placeholders,
- panel completeness,
- asset references,
- version information.

Validation procedures are defined in AIOS QC Manual.

---

# 12. Compliance

A Storyboard Template is compliant only if:

- canonical structure is preserved,
- required placeholders are present,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Production,
- no storyboard methodology or production workflow is redefined.

---

End of Part VIII.

---

# Part IX
# Production Storyboard Sheet Template

---

# 1. Purpose

The Production Storyboard Sheet Template defines the canonical document structure for a Production Storyboard Sheet (PSS).

A Production Storyboard Sheet is a structured planning artifact that translates an approved Storyboard into production-ready specifications.

This specification defines only the template format.

Storyboard planning methodology, production sequencing, execution behavior, and production lifecycle are governed exclusively by AIOS Production v4.3 SSOT.

---

# 2. Ownership

Owning Specification:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical document template.

---

# 3. Relationship

The document hierarchy is:

CASE
    ↓
Chapter
    ↓
Storyboard
    ↓
Production Storyboard Sheet
    ↓
Production Artifacts

Each Production Storyboard Sheet SHALL belong to exactly one Chapter.

---

# 4. Canonical Structure

```text
Production Storyboard Sheet Header
        ↓
Metadata
        ↓
Chapter Information
        ↓
Creative Summary
        ↓
Visual Specification
        ↓
Production Breakdown
        ↓
Reference Assets
        ↓
Production Notes
        ↓
Validation Status
        ↓
Version Information
```

---

# 5. Canonical Production Storyboard Sheet Template

```text
# Production Storyboard Sheet

## Metadata

PSS ID:
<PSS_ID>

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Production v4.3 SSOT

---

## Chapter Information

Chapter Title:
<CHAPTER_TITLE>

Creative Objective:
<CREATIVE_OBJECTIVE>

Target Emotion:
<TARGET_EMOTION>

---

## Creative Summary

<CREATIVE_SUMMARY>

---

## Visual Specification

Visual Concept:
<VISUAL_CONCEPT>

Environment:
<ENVIRONMENT>

Character:
<CHARACTER_REFERENCE>

Product:
<PRODUCT_REFERENCE>

Camera:
<CAMERA_REFERENCE>

Lighting:
<LIGHTING_REFERENCE>

Style:
<STYLE_REFERENCE>

---

## Production Breakdown

Scene References:
<SCENE_REFERENCE_LIST>

Storyboard References:
<STORYBOARD_REFERENCE>

Estimated Duration:
<ESTIMATED_DURATION>

Deliverables:
<DELIVERABLE_LIST>

---

## Reference Assets

<Character Registry>

<Product Registry>

<Environment Registry>

<Camera Registry>

<Lighting Registry>

<Style Registry>

<Asset Registry>

---

## Production Notes

<PRODUCTION_NOTES>

---

## Validation Status

<VALIDATION_STATUS>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <PSS_ID>
- <CASE_ID>
- <CHAPTER_NUMBER>
- <CHAPTER_TITLE>
- <CREATIVE_OBJECTIVE>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <TARGET_EMOTION>
- <CREATIVE_SUMMARY>
- <PRODUCTION_NOTES>
- <DELIVERABLE_LIST>
- <COMPATIBILITY>

Optional fields SHALL NOT alter the canonical structure.

---

# 8. Reference Rules

The Production Storyboard Sheet MAY reference:

- Storyboard
- Character Registry
- Product Registry
- Environment Registry
- Camera Registry
- Lighting Registry
- Style Registry
- Asset Registry

Referenced artifacts remain authoritative in their owning specifications.

---

# 9. Placeholder Rules

All placeholders SHALL follow the naming conventions defined in Part IV.

Examples:

<PSS_ID>

<VISUAL_CONCEPT>

<ESTIMATED_DURATION>

<PRODUCTION_NOTES>

---

# 10. Validation

Before approval, a Production Storyboard Sheet SHOULD verify:

- metadata completeness,
- required placeholders,
- reference integrity,
- asset references,
- version information.

Validation procedures are governed by AIOS QC Manual.

---

# 11. Compliance

A Production Storyboard Sheet Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Production,
- no production workflow or execution logic is redefined.

---

End of Part IX.

---

# Part X
# Storyboard Generation Prompt Template

---

# 1. Purpose

The Storyboard Generation Prompt Template defines the canonical template used to generate a Storyboard for an AIOS Chapter.

This document standardizes the prompt structure only.

Prompt engineering methodology, production orchestration, creative reasoning, and execution behavior are governed by:

- AIOS Prompt Standards v1.2 SSOT
- AIOS Production v4.3 SSOT

AIOS Templates defines only the reusable template format.

---

# 2. Ownership

Primary Owning Specification:

AIOS Prompt Standards v1.2 SSOT

Referenced By:

AIOS Production v4.3 SSOT

AIOS Templates provides the canonical prompt template.

---

# 3. Relationship

The prompt relationship is:

CASE
    ↓
Chapter
    ↓
Storyboard Generation Prompt
    ↓
Storyboard

The prompt SHALL generate exactly one Storyboard for one Chapter.

---

# 4. Canonical Structure

```text
Prompt Header
        ↓
Metadata
        ↓
Chapter Context
        ↓
Creative Context
        ↓
Production Constraints
        ↓
Reference Assets
        ↓
Expected Output
        ↓
Validation Notes
        ↓
Version Information
```

---

# 5. Canonical Storyboard Generation Prompt Template

```text
# Storyboard Generation Prompt

## Metadata

Prompt ID:
<PROMPT_ID>

Prompt Type:
Storyboard Generation

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Prompt Standards v1.2 SSOT

---

## Chapter Context

Chapter Title:
<CHAPTER_TITLE>

Creative Objective:
<CREATIVE_OBJECTIVE>

Story Summary:
<STORY_SUMMARY>

Target Emotion:
<TARGET_EMOTION>

---

## Creative Context

Visual Style:
<VISUAL_STYLE>

Narrative Direction:
<NARRATIVE_DIRECTION>

Tone:
<TONE>

---

## Production Constraints

<CONSTRAINTS>

---

## Reference Assets

<Character Registry>

<Product Registry>

<Environment Registry>

<Camera Registry>

<Lighting Registry>

<Style Registry>

<Asset Registry>

---

## Expected Output

Generate one Storyboard for this Chapter using the supplied references and constraints.

---

## Validation Notes

<VALIDATION_NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <PROMPT_ID>
- <CASE_ID>
- <CHAPTER_NUMBER>
- <CHAPTER_TITLE>
- <CREATIVE_OBJECTIVE>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <TARGET_EMOTION>
- <STORY_SUMMARY>
- <VISUAL_STYLE>
- <NARRATIVE_DIRECTION>
- <VALIDATION_NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT alter the canonical structure.

---

# 8. Reference Rules

The prompt MAY reference:

- Character Registry
- Product Registry
- Environment Registry
- Camera Registry
- Lighting Registry
- Style Registry
- Asset Registry

Referenced artifacts remain authoritative in their owning specifications.

---

# 9. Placeholder Rules

All placeholders SHALL comply with Part IV.

Examples:

<PROMPT_ID>

<CREATIVE_OBJECTIVE>

<VISUAL_STYLE>

<VALIDATION_NOTES>

Custom placeholder formats are prohibited.

---

# 10. Output Definition

This template defines the expected output only.

It SHALL NOT define:

- creative decision-making,
- prompt optimization algorithms,
- storyboard generation methodology,
- production sequencing,
- runtime behavior.

Those responsibilities belong to the appropriate upstream SSOT documents.

---

# 11. Validation

Before approval, a Storyboard Generation Prompt SHOULD verify:

- metadata completeness,
- required placeholders,
- reference integrity,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual.

---

# 12. Compliance

A Storyboard Generation Prompt Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Prompt Standards,
- no prompt engineering methodology or production logic is redefined.

---

End of Part X.

---

# Part XI
# Storyboard Image Prompt Template

---

# 1. Purpose

The Storyboard Image Prompt Template defines the canonical document structure for a Storyboard Image Prompt.

A Storyboard Image Prompt is used to generate a visual representation of an approved Production Storyboard Sheet.

This specification defines only the reusable template format.

Storyboard image methodology, visual prompt engineering, image generation workflow, and execution behavior are governed by:

- AIOS Prompt Standards v1.2 SSOT
- AIOS Production v4.3 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS Prompt Standards v1.2 SSOT

Referenced By:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical template.

---

# 3. Relationship

The artifact relationship is:

CASE
    ↓
Chapter
    ↓
Production Storyboard Sheet
    ↓
Storyboard Image Prompt
    ↓
Storyboard Image

One Storyboard Image Prompt SHALL correspond to exactly one Production Storyboard Sheet.

---

# 4. Canonical Structure

```text
Prompt Header
        ↓
Metadata
        ↓
Production Context
        ↓
Visual Context
        ↓
Reference Assets
        ↓
Rendering Constraints
        ↓
Expected Output
        ↓
Validation Notes
        ↓
Version Information
```

---

# 5. Canonical Storyboard Image Prompt Template

```text
# Storyboard Image Prompt

## Metadata

Prompt ID:
<PROMPT_ID>

Prompt Type:
Storyboard Image Prompt

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Prompt Standards v1.2 SSOT

---

## Production Context

Production Storyboard Sheet:
<PSS_REFERENCE>

Creative Objective:
<CREATIVE_OBJECTIVE>

Storyboard Summary:
<STORYBOARD_SUMMARY>

---

## Visual Context

Visual Style:
<VISUAL_STYLE>

Composition:
<COMPOSITION>

Camera Style:
<CAMERA_STYLE>

Lighting Style:
<LIGHTING_STYLE>

Color Palette:
<COLOR_PALETTE>

---

## Reference Assets

<Character Registry>

<Product Registry>

<Environment Registry>

<Camera Registry>

<Lighting Registry>

<Style Registry>

<Asset Registry>

---

## Rendering Constraints

<RENDERING_CONSTRAINTS>

---

## Expected Output

Generate one Storyboard Image representing the referenced Production Storyboard Sheet.

---

## Validation Notes

<VALIDATION_NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <PROMPT_ID>
- <CASE_ID>
- <CHAPTER_NUMBER>
- <PSS_REFERENCE>
- <CREATIVE_OBJECTIVE>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <STORYBOARD_SUMMARY>
- <VISUAL_STYLE>
- <COMPOSITION>
- <CAMERA_STYLE>
- <LIGHTING_STYLE>
- <COLOR_PALETTE>
- <RENDERING_CONSTRAINTS>
- <VALIDATION_NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT modify the canonical structure.

---

# 8. Reference Rules

The prompt MAY reference:

- Production Storyboard Sheet
- Character Registry
- Product Registry
- Environment Registry
- Camera Registry
- Lighting Registry
- Style Registry
- Asset Registry

Referenced artifacts remain authoritative in their owning specifications.

---

# 9. Placeholder Rules

All placeholders SHALL comply with Part IV.

Examples:

<PSS_REFERENCE>

<VISUAL_STYLE>

<COMPOSITION>

<COLOR_PALETTE>

<RENDERING_CONSTRAINTS>

---

# 10. Output Definition

This template defines the expected output format only.

It SHALL NOT define:

- image generation algorithms,
- visual reasoning,
- prompt optimization,
- rendering workflow,
- production sequencing.

These responsibilities belong to the appropriate upstream SSOT documents.

---

# 11. Validation

Before approval, a Storyboard Image Prompt SHOULD verify:

- metadata completeness,
- required placeholders,
- reference integrity,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual.

---

# 12. Compliance

A Storyboard Image Prompt Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Prompt Standards,
- no prompt engineering methodology or production logic is redefined.

---

End of Part XI.

---

# Part XII
# Master Image Prompt Template

---

# 1. Purpose

The Master Image Prompt Template defines the canonical document structure for a Master Image Prompt.

A Master Image Prompt is used to generate the canonical production image for a Chapter.

This specification defines only the reusable template format.

Prompt engineering methodology, image generation strategy, production sequencing, and execution behavior are governed exclusively by:

- AIOS Prompt Standards v1.2 SSOT
- AIOS Production v4.3 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS Prompt Standards v1.2 SSOT

Referenced By:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical template.

---

# 3. Relationship

The artifact relationship is:

CASE
    ↓
Chapter
    ↓
Production Storyboard Sheet
    ↓
Master Image Prompt
    ↓
Master Image

Each Master Image Prompt SHALL correspond to exactly one Chapter.

---

# 4. Canonical Structure

```text
Prompt Header
        ↓
Metadata
        ↓
Production Context
        ↓
Visual Specification
        ↓
Reference Assets
        ↓
Generation Constraints
        ↓
Expected Output
        ↓
Validation Notes
        ↓
Version Information
```

---

# 5. Canonical Master Image Prompt Template

```text
# Master Image Prompt

## Metadata

Prompt ID:
<PROMPT_ID>

Prompt Type:
Master Image Prompt

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Prompt Standards v1.2 SSOT

---

## Production Context

Production Storyboard Sheet:
<PSS_REFERENCE>

Creative Objective:
<CREATIVE_OBJECTIVE>

Target Emotion:
<TARGET_EMOTION>

---

## Visual Specification

Subject:
<SUBJECT>

Scene:
<SCENE_DESCRIPTION>

Composition:
<COMPOSITION>

Camera Style:
<CAMERA_STYLE>

Lighting Style:
<LIGHTING_STYLE>

Color Palette:
<COLOR_PALETTE>

Visual Style:
<VISUAL_STYLE>

---

## Reference Assets

<Character Registry>

<Product Registry>

<Environment Registry>

<Camera Registry>

<Lighting Registry>

<Style Registry>

<Asset Registry>

---

## Generation Constraints

<GENERATION_CONSTRAINTS>

---

## Expected Output

Generate one Master Image for the referenced Chapter using the supplied assets and constraints.

---

## Validation Notes

<VALIDATION_NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <PROMPT_ID>
- <CASE_ID>
- <CHAPTER_NUMBER>
- <PSS_REFERENCE>
- <CREATIVE_OBJECTIVE>
- <SUBJECT>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <TARGET_EMOTION>
- <SCENE_DESCRIPTION>
- <COMPOSITION>
- <CAMERA_STYLE>
- <LIGHTING_STYLE>
- <COLOR_PALETTE>
- <VISUAL_STYLE>
- <GENERATION_CONSTRAINTS>
- <VALIDATION_NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT alter the canonical structure.

---

# 8. Reference Rules

The prompt MAY reference:

- Production Storyboard Sheet
- Character Registry
- Product Registry
- Environment Registry
- Camera Registry
- Lighting Registry
- Style Registry
- Asset Registry

Referenced artifacts remain authoritative in their owning specifications.

---

# 9. Placeholder Rules

All placeholders SHALL follow the naming conventions defined in Part IV.

Examples:

<PROMPT_ID>

<SUBJECT>

<SCENE_DESCRIPTION>

<VISUAL_STYLE>

<GENERATION_CONSTRAINTS>

---

# 10. Output Definition

This template defines the expected output format only.

It SHALL NOT define:

- image generation algorithms,
- creative reasoning,
- rendering techniques,
- production workflow,
- runtime behavior.

These responsibilities belong to the appropriate upstream SSOT documents.

---

# 11. Validation

Before approval, a Master Image Prompt SHOULD verify:

- metadata completeness,
- required placeholders,
- reference integrity,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual.

---

# 12. Compliance

A Master Image Prompt Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Prompt Standards,
- no prompt engineering methodology or production workflow is redefined.

---

End of Part XII.

---

# Part XIII
# Video Prompt Template

---

# 1. Purpose

The Video Prompt Template defines the canonical document structure for a Video Prompt.

A Video Prompt is used to generate the production video for a single Chapter.

This specification defines only the reusable template format.

Video prompt engineering methodology, motion planning, temporal reasoning, production sequencing, and execution behavior are governed exclusively by:

- AIOS Prompt Standards v1.2 SSOT
- AIOS Production v4.3 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS Prompt Standards v1.2 SSOT

Referenced By:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical template.

---

# 3. Relationship

The artifact relationship is:

```text
CASE
    ↓
Chapter
    ↓
Master Image
    ↓
Video Prompt
    ↓
Generated Video
```

Each Video Prompt SHALL correspond to exactly one Chapter.

---

# 4. Canonical Structure

```text
Prompt Header
        ↓
Metadata
        ↓
Production Context
        ↓
Motion Specification
        ↓
Reference Assets
        ↓
Generation Constraints
        ↓
Expected Output
        ↓
Validation Notes
        ↓
Version Information
```

---

# 5. Canonical Video Prompt Template

```text
# Video Prompt

## Metadata

Prompt ID:
<PROMPT_ID>

Prompt Type:
Video Prompt

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Prompt Standards v1.2 SSOT

---

## Production Context

Master Image:
<MASTER_IMAGE_REFERENCE>

Creative Objective:
<CREATIVE_OBJECTIVE>

Target Emotion:
<TARGET_EMOTION>

---

## Motion Specification

Primary Action:
<PRIMARY_ACTION>

Secondary Actions:
<SECONDARY_ACTIONS>

Camera Motion:
<CAMERA_MOTION>

Subject Motion:
<SUBJECT_MOTION>

Environment Motion:
<ENVIRONMENT_MOTION>

Transition:
<TRANSITION>

Duration:
<DURATION>

Visual Style:
<VISUAL_STYLE>

---

## Reference Assets

<Character Registry>

<Product Registry>

<Environment Registry>

<Camera Registry>

<Lighting Registry>

<Style Registry>

<Asset Registry>

---

## Generation Constraints

<GENERATION_CONSTRAINTS>

---

## Expected Output

Generate one production-ready video for the referenced Chapter using the supplied references and constraints.

---

## Validation Notes

<VALIDATION_NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <PROMPT_ID>
- <CASE_ID>
- <CHAPTER_NUMBER>
- <MASTER_IMAGE_REFERENCE>
- <CREATIVE_OBJECTIVE>
- <PRIMARY_ACTION>
- <DURATION>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <TARGET_EMOTION>
- <SECONDARY_ACTIONS>
- <CAMERA_MOTION>
- <SUBJECT_MOTION>
- <ENVIRONMENT_MOTION>
- <TRANSITION>
- <VISUAL_STYLE>
- <GENERATION_CONSTRAINTS>
- <VALIDATION_NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT alter the canonical structure.

---

# 8. Reference Rules

The prompt MAY reference:

- Master Image
- Character Registry
- Product Registry
- Environment Registry
- Camera Registry
- Lighting Registry
- Style Registry
- Asset Registry

Referenced artifacts remain authoritative in their owning specifications.

---

# 9. Placeholder Rules

All placeholders SHALL comply with Part IV.

Examples:

<PROMPT_ID>

<MASTER_IMAGE_REFERENCE>

<PRIMARY_ACTION>

<CAMERA_MOTION>

<SUBJECT_MOTION>

<DURATION>

---

# 10. Output Definition

This template defines the expected output format only.

It SHALL NOT define:

- video generation algorithms,
- animation methodology,
- motion intelligence,
- production workflow,
- runtime behavior.

These responsibilities belong to the appropriate upstream SSOT documents.

---

# 11. Validation

Before approval, a Video Prompt SHOULD verify:

- metadata completeness,
- required placeholders,
- reference integrity,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual.

---

# 12. Compliance

A Video Prompt Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Prompt Standards,
- no prompt engineering methodology or production workflow is redefined.

---

End of Part XIII.

---

# Part XIV
# Audio Prompt Template

---

# 1. Purpose

The Audio Prompt Template defines the canonical document structure for an Audio Prompt.

An Audio Prompt is used to generate or specify the audio component associated with a single Chapter.

This specification defines only the reusable template format.

Audio prompt engineering, sound design methodology, synchronization, production sequencing, and execution behavior are governed exclusively by:

- AIOS Prompt Standards v1.2 SSOT
- AIOS Production v4.3 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS Prompt Standards v1.2 SSOT

Referenced By:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical template.

---

# 3. Relationship

The artifact relationship is:

```text
CASE
    ↓
Chapter
    ↓
Video Prompt
    ↓
Audio Prompt
    ↓
Audio Output
```

Each Audio Prompt SHALL correspond to exactly one Chapter.

---

# 4. Canonical Structure

```text
Prompt Header
        ↓
Metadata
        ↓
Production Context
        ↓
Audio Specification
        ↓
Reference Assets
        ↓
Generation Constraints
        ↓
Expected Output
        ↓
Validation Notes
        ↓
Version Information
```

---

# 5. Canonical Audio Prompt Template

```text
# Audio Prompt

## Metadata

Prompt ID:
<PROMPT_ID>

Prompt Type:
Audio Prompt

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Prompt Standards v1.2 SSOT

---

## Production Context

Video Prompt:
<VIDEO_PROMPT_REFERENCE>

Creative Objective:
<CREATIVE_OBJECTIVE>

Target Emotion:
<TARGET_EMOTION>

---

## Audio Specification

Audio Style:
<AUDIO_STYLE>

Music Direction:
<MUSIC_DIRECTION>

Sound Effects:
<SOUND_EFFECTS>

Ambient Sound:
<AMBIENT_SOUND>

Voice Direction:
<VOICE_DIRECTION>

Synchronization Notes:
<SYNC_NOTES>

Duration:
<DURATION>

---

## Reference Assets

<Audio Registry>

<Character Registry>

<Product Registry>

<Environment Registry>

<Style Registry>

---

## Generation Constraints

<GENERATION_CONSTRAINTS>

---

## Expected Output

Generate one production-ready audio specification or audio asset for the referenced Chapter using the supplied references and constraints.

---

## Validation Notes

<VALIDATION_NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <PROMPT_ID>
- <CASE_ID>
- <CHAPTER_NUMBER>
- <VIDEO_PROMPT_REFERENCE>
- <CREATIVE_OBJECTIVE>
- <AUDIO_STYLE>
- <DURATION>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <TARGET_EMOTION>
- <MUSIC_DIRECTION>
- <SOUND_EFFECTS>
- <AMBIENT_SOUND>
- <VOICE_DIRECTION>
- <SYNC_NOTES>
- <GENERATION_CONSTRAINTS>
- <VALIDATION_NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT alter the canonical structure.

---

# 8. Reference Rules

The prompt MAY reference:

- Video Prompt
- Audio Registry
- Character Registry
- Product Registry
- Environment Registry
- Style Registry

Referenced artifacts remain authoritative in their owning specifications.

---

# 9. Placeholder Rules

All placeholders SHALL comply with Part IV.

Examples:

<PROMPT_ID>

<AUDIO_STYLE>

<MUSIC_DIRECTION>

<SOUND_EFFECTS>

<AMBIENT_SOUND>

<SYNC_NOTES>

---

# 10. Output Definition

This template defines the expected output format only.

It SHALL NOT define:

- audio generation algorithms,
- sound design methodology,
- synchronization logic,
- production workflow,
- runtime behavior.

These responsibilities belong to the appropriate upstream SSOT documents.

---

# 11. Validation

Before approval, an Audio Prompt SHOULD verify:

- metadata completeness,
- required placeholders,
- reference integrity,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual.

---

# 12. Compliance

An Audio Prompt Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Prompt Standards,
- no prompt engineering methodology or production workflow is redefined.

---

End of Part XIV.

---

# Part XV
# QC Report Template

---

# 1. Purpose

The QC Report Template defines the canonical document structure for an AIOS Quality Control (QC) Report.

A QC Report records the outcome of quality verification for a production artifact.

This specification defines only the reusable template format.

Quality assurance methodology, validation criteria, scoring models, approval policies, and execution procedures are governed exclusively by:

- AIOS QC Manual v1.1 SSOT
- AIOS Production v4.3 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS QC Manual v1.1 SSOT

Referenced By:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical template.

---

# 3. Relationship

The artifact relationship is:

```text
CASE
    ↓
Chapter
    ↓
Production Artifact
    ↓
QC Report
```

A QC Report SHALL evaluate exactly one production artifact.

---

# 4. Canonical Structure

```text
Report Header
        ↓
Metadata
        ↓
Artifact Information
        ↓
QC Summary
        ↓
Validation Results
        ↓
Findings
        ↓
Decision
        ↓
Reviewer Notes
        ↓
Version Information
```

---

# 5. Canonical QC Report Template

```text
# QC Report

## Metadata

QC Report ID:
<QC_REPORT_ID>

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Artifact Type:
<ARTIFACT_TYPE>

Artifact Reference:
<ARTIFACT_REFERENCE>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS QC Manual v1.1 SSOT

---

## Artifact Information

Artifact Name:
<ARTIFACT_NAME>

Artifact Version:
<ARTIFACT_VERSION>

Review Date:
<REVIEW_DATE>

Reviewer:
<REVIEWER>

---

## QC Summary

Overall Result:
<OVERALL_RESULT>

Overall Score:
<OVERALL_SCORE>

---

## Validation Results

Validation Checklist:
<VALIDATION_CHECKLIST>

Detected Issues:
<DETECTED_ISSUES>

---

## Findings

<FINDINGS>

---

## Decision

<APPROVAL_DECISION>

---

## Reviewer Notes

<REVIEWER_NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <QC_REPORT_ID>
- <CASE_ID>
- <ARTIFACT_TYPE>
- <ARTIFACT_REFERENCE>
- <OVERALL_RESULT>
- <APPROVAL_DECISION>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <OVERALL_SCORE>
- <VALIDATION_CHECKLIST>
- <DETECTED_ISSUES>
- <FINDINGS>
- <REVIEWER_NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT alter the canonical structure.

---

# 8. Reference Rules

A QC Report MAY reference:

- CASE
- Chapter
- Storyboard
- Production Storyboard Sheet
- Storyboard Image
- Master Image
- Video
- Audio
- Any production artifact defined by AIOS Production

Referenced artifacts remain authoritative in their owning specifications.

---

# 9. Placeholder Rules

All placeholders SHALL comply with Part IV.

Examples:

<QC_REPORT_ID>

<ARTIFACT_REFERENCE>

<OVERALL_RESULT>

<APPROVAL_DECISION>

<REVIEWER_NOTES>

---

# 10. Output Definition

This template defines the report format only.

It SHALL NOT define:

- QC methodology,
- scoring models,
- validation algorithms,
- approval criteria,
- production workflow.

These responsibilities belong to AIOS QC Manual and AIOS Production.

---

# 11. Validation

Before release, a QC Report SHOULD verify:

- metadata completeness,
- required placeholders,
- artifact references,
- reviewer information,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual.

---

# 12. Compliance

A QC Report Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS QC Manual,
- no QC methodology or production logic is redefined.

---

End of Part XV.

---

# Part XVI
# Validation Report Template

---

# 1. Purpose

The Validation Report Template defines the canonical document structure for an AIOS Validation Report.

A Validation Report records the outcome of formal validation performed on a document, template, production artifact, registry, or other AIOS deliverable before approval or release.

This specification defines only the reusable template format.

Validation methodology, validation rules, acceptance criteria, approval policies, and execution procedures are governed exclusively by:

- AIOS QC Manual v1.1 SSOT
- AIOS Production v4.3 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS QC Manual v1.1 SSOT

Referenced By:

AIOS Production v4.3 SSOT

AIOS Templates provides only the canonical template.

---

# 3. Relationship

The artifact relationship is:

```text
AIOS Artifact
        ↓
Validation
        ↓
Validation Report
```

Each Validation Report SHALL correspond to exactly one validation activity.

---

# 4. Canonical Structure

```text
Report Header
        ↓
Metadata
        ↓
Validation Scope
        ↓
Validation Summary
        ↓
Validation Results
        ↓
Nonconformities
        ↓
Corrective Actions
        ↓
Final Decision
        ↓
Reviewer Notes
        ↓
Version Information
```

---

# 5. Canonical Validation Report Template

```text
# Validation Report

## Metadata

Validation Report ID:
<VALIDATION_REPORT_ID>

Artifact Type:
<ARTIFACT_TYPE>

Artifact Reference:
<ARTIFACT_REFERENCE>

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS QC Manual v1.1 SSOT

---

## Validation Scope

Validation Type:
<VALIDATION_TYPE>

Validation Objective:
<VALIDATION_OBJECTIVE>

Validation Date:
<VALIDATION_DATE>

Validator:
<VALIDATOR>

---

## Validation Summary

Overall Result:
<OVERALL_RESULT>

Validation Status:
<VALIDATION_STATUS>

---

## Validation Results

Validation Checklist:
<VALIDATION_CHECKLIST>

Passed Items:
<PASSED_ITEMS>

Failed Items:
<FAILED_ITEMS>

---

## Nonconformities

<NONCONFORMITIES>

---

## Corrective Actions

<CORRECTIVE_ACTIONS>

---

## Final Decision

<FINAL_DECISION>

---

## Reviewer Notes

<REVIEWER_NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 6. Required Fields

The following placeholders are mandatory:

- <VALIDATION_REPORT_ID>
- <ARTIFACT_TYPE>
- <ARTIFACT_REFERENCE>
- <VALIDATION_TYPE>
- <OVERALL_RESULT>
- <FINAL_DECISION>
- <VERSION>
- <STATUS>

---

# 7. Optional Fields

Optional placeholders MAY include:

- <CASE_ID>
- <CHAPTER_NUMBER>
- <VALIDATION_CHECKLIST>
- <PASSED_ITEMS>
- <FAILED_ITEMS>
- <NONCONFORMITIES>
- <CORRECTIVE_ACTIONS>
- <REVIEWER_NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT modify the canonical structure.

---

# 8. Reference Rules

A Validation Report MAY reference:

- Documents
- Templates
- Registries
- Production Artifacts
- QC Reports
- Export Packages
- Repository Entries

Referenced artifacts remain authoritative in their respective specifications.

---

# 9. Placeholder Rules

All placeholders SHALL follow the naming conventions defined in Part IV.

Examples:

<VALIDATION_REPORT_ID>

<VALIDATION_TYPE>

<NONCONFORMITIES>

<CORRECTIVE_ACTIONS>

<FINAL_DECISION>

---

# 10. Output Definition

This template defines the report format only.

It SHALL NOT define:

- validation methodology,
- validation algorithms,
- acceptance criteria,
- approval policies,
- production workflow.

These responsibilities belong to AIOS QC Manual and AIOS Production.

---

# 11. Validation

Before approval, a Validation Report SHOULD verify:

- metadata completeness,
- required placeholders,
- artifact references,
- validator information,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual.

---

# 12. Compliance

A Validation Report Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS QC Manual,
- no validation methodology or production workflow is redefined.

---

End of Part XVI.

---

# Part XVII
# Asset Registry Templates

---

# 1. Purpose

The Asset Registry Template defines the canonical document structure for all AIOS asset registries.

An Asset Registry records metadata and references for reusable production assets.

This specification defines only the reusable template format.

Asset lifecycle, asset governance, asset validation, dependency management, and runtime behavior are governed exclusively by:

- AIOS Production v4.3 SSOT
- AIOS Repository v1.1 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS Production v4.3 SSOT

Referenced By:

AIOS Repository v1.1 SSOT

AIOS Templates provides only the canonical template.

---

# 3. Supported Registry Types

This template MAY be used for:

- Character Registry
- Product Registry
- Environment Registry
- Camera Registry
- Lighting Registry
- Style Registry
- Audio Registry
- Props Registry
- Asset Registry

Additional registry types MAY be introduced by future specifications.

---

# 4. Relationship

```text
Asset
      ↓
Asset Registry
      ↓
Production Reference
```

The Asset Registry SHALL describe assets.

It SHALL NOT contain production logic.

---

# 5. Canonical Structure

```text
Registry Header
        ↓
Metadata
        ↓
Registry Information
        ↓
Asset Information
        ↓
References
        ↓
Validation Status
        ↓
Notes
        ↓
Version Information
```

---

# 6. Canonical Asset Registry Template

```text
# Asset Registry

## Metadata

Registry ID:
<REGISTRY_ID>

Registry Type:
<REGISTRY_TYPE>

Asset ID:
<ASSET_ID>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Production v4.3 SSOT

---

## Registry Information

Registry Name:
<REGISTRY_NAME>

Registry Description:
<REGISTRY_DESCRIPTION>

---

## Asset Information

Asset Name:
<ASSET_NAME>

Asset Category:
<ASSET_CATEGORY>

Asset Description:
<ASSET_DESCRIPTION>

Asset Version:
<ASSET_VERSION>

Asset Status:
<ASSET_STATUS>

---

## References

Parent Registry:
<PARENT_REGISTRY>

Related Assets:
<RELATED_ASSETS>

Repository Reference:
<REPOSITORY_REFERENCE>

---

## Validation Status

<VALIDATION_STATUS>

---

## Notes

<NOTES>

---

## Version Information

Version:
<VERSION>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 7. Required Fields

The following placeholders are mandatory:

- <REGISTRY_ID>
- <REGISTRY_TYPE>
- <ASSET_ID>
- <ASSET_NAME>
- <VERSION>
- <STATUS>

---

# 8. Optional Fields

Optional placeholders MAY include:

- <REGISTRY_DESCRIPTION>
- <ASSET_CATEGORY>
- <ASSET_DESCRIPTION>
- <RELATED_ASSETS>
- <NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT modify the canonical structure.

---

# 9. Reference Rules

An Asset Registry MAY reference:

- Parent Registry
- Related Assets
- Repository Entries
- Shared Assets
- External References approved by AIOS Production

Referenced assets remain authoritative in their own specifications.

---

# 10. Placeholder Rules

All placeholders SHALL comply with Part IV.

Examples:

<REGISTRY_ID>

<ASSET_ID>

<ASSET_NAME>

<RELATED_ASSETS>

<REPOSITORY_REFERENCE>

---

# 11. Output Definition

This template defines the registry document format only.

It SHALL NOT define:

- asset lifecycle,
- dependency management,
- registry algorithms,
- production workflow,
- runtime behavior.

These responsibilities belong to AIOS Production and AIOS Repository.

---

# 12. Validation

Before approval, an Asset Registry SHOULD verify:

- metadata completeness,
- required placeholders,
- asset identifiers,
- repository references,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual.

---

# 13. Compliance

An Asset Registry Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Production,
- no asset management behavior is redefined.

---

End of Part XVII.

---

# Part XVIII
# Generic Production Report Template

---

# 1. Purpose

The Generic Production Report Template defines the canonical document structure for all AIOS production reports.

A Production Report documents the outcome, status, traceability, and metadata of a production activity.

This specification defines only the reusable document template.

Production lifecycle, orchestration, execution behavior, and reporting policies are governed exclusively by:

- AIOS Production v4.3 SSOT
- AIOS Runtime v1.1 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS Production v4.3 SSOT

Referenced By:

- AIOS Repository v1.1 SSOT
- AIOS QC Manual v1.1 SSOT

AIOS Templates provides only the canonical report template.

---

# 3. Supported Report Types

This template SHALL support the following report types:

- Production
- CASE
- Chapter
- Generation
- Execution
- Delivery
- Completion

Future report types MAY be introduced without modifying this template.

---

# 4. Relationship

```text
Production Activity
        ↓
Generic Production Report
        ↓
Repository
```

The report documents production activities.

It SHALL NOT define production behavior.

---

# 5. Canonical Structure

```text
Report Header
        ↓
Metadata
        ↓
Report Information
        ↓
Production Information
        ↓
Execution Summary
        ↓
Produced Artifacts
        ↓
Referenced Assets
        ↓
Validation Status
        ↓
Notes
        ↓
Version Information
```

---

# 6. Canonical Generic Production Report Template

```text
# Generic Production Report

## Metadata

Report ID:
<REPORT_ID>

Report Type:
<REPORT_TYPE>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Production v4.3 SSOT

---

## Report Information

Report Name:
<REPORT_NAME>

Report Description:
<REPORT_DESCRIPTION>

Repository Path:
<REPOSITORY_PATH>

---

## Production Information

CASE ID:
<CASE_ID>

Chapter Number:
<CHAPTER_NUMBER>

Production Name:
<PRODUCTION_NAME>

Production Objective:
<PRODUCTION_OBJECTIVE>

Production Date:
<PRODUCTION_DATE>

Operator:
<OPERATOR>

---

## Execution Summary

Execution Status:
<EXECUTION_STATUS>

Execution Result:
<EXECUTION_RESULT>

Execution Summary:
<EXECUTION_SUMMARY>

---

## Produced Artifacts

Generated Artifacts:
<GENERATED_ARTIFACTS>

Output References:
<OUTPUT_REFERENCES>

---

## Referenced Assets

Asset Registries:
<ASSET_REGISTRIES>

Referenced Documents:
<REFERENCED_DOCUMENTS>

---

## Validation Status

Validation Status:
<VALIDATION_STATUS>

Approval Status:
<APPROVAL_STATUS>

---

## Notes

<NOTES>

---

## Version Information

Version:
<VERSION>

Created Date:
<CREATED_DATE>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 7. Required Fields

The following placeholders are mandatory:

- <REPORT_ID>
- <REPORT_TYPE>
- <PRODUCTION_NAME>
- <EXECUTION_STATUS>
- <VERSION>
- <STATUS>

A report SHALL NOT omit any required field.

---

# 8. Optional Fields

Optional placeholders MAY include:

- <REPORT_DESCRIPTION>
- <REPOSITORY_PATH>
- <CASE_ID>
- <CHAPTER_NUMBER>
- <PRODUCTION_OBJECTIVE>
- <PRODUCTION_DATE>
- <OPERATOR>
- <EXECUTION_RESULT>
- <EXECUTION_SUMMARY>
- <GENERATED_ARTIFACTS>
- <OUTPUT_REFERENCES>
- <ASSET_REGISTRIES>
- <REFERENCED_DOCUMENTS>
- <VALIDATION_STATUS>
- <APPROVAL_STATUS>
- <NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT modify the canonical structure.

---

# 9. Report Type Values

The Report Type field SHALL use one of the following values:

- Production
- CASE
- Chapter
- Generation
- Execution
- Delivery
- Completion

Additional values MAY be introduced by future AIOS releases.

---

# 10. Reference Rules

A Generic Production Report MAY reference:

- CASE
- Chapter
- Storyboard
- Production Storyboard Sheet
- Prompt Documents
- Generated Assets
- Asset Registries
- QC Reports
- Validation Reports

Referenced artifacts remain authoritative in their respective specifications.

---

# 11. Placeholder Rules

All placeholders SHALL comply with Part IV.

Examples:

<REPORT_ID>

<REPORT_TYPE>

<EXECUTION_STATUS>

<GENERATED_ARTIFACTS>

<OUTPUT_REFERENCES>

---

# 12. Output Definition

This template defines the report document format only.

It SHALL NOT define:

- production workflow,
- execution algorithms,
- runtime behavior,
- validation methodology,
- reporting policies.

Those responsibilities belong to the appropriate upstream SSOT documents.

---

# 13. Validation

Before approval, a Generic Production Report SHOULD verify:

- metadata completeness,
- required placeholders,
- production references,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 14. Compliance

A Generic Production Report Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Production,
- no production behavior or runtime logic is redefined.

---

End of Part XVIII.

---

# Part XIX
# Generic Export Template

---

# 1. Purpose

The Generic Export Template defines the canonical document structure for all AIOS export artifacts.

An Export Artifact represents a packaged output generated from an approved AIOS document or production artifact.

This specification defines only the reusable document template.

Export behavior, serialization, formatting rules, and packaging procedures are governed exclusively by:

- AIOS Export Specification v1.1 SSOT
- AIOS Production v4.3 SSOT

---

# 2. Ownership

Primary Owning Specification:

AIOS Export Specification v1.1 SSOT

Referenced By:

- AIOS Production v4.3 SSOT
- AIOS Repository v1.1 SSOT

AIOS Templates provides only the canonical export template.

---

# 3. Supported Export Formats

This template SHALL support the following export formats:

- Markdown
- PDF
- DOCX
- JSON
- HTML
- XML

Additional export formats MAY be introduced by future AIOS releases without modifying this template.

---

# 4. Relationship

```text
AIOS Artifact
        ↓
Export Process
        ↓
Generic Export Artifact
```

The export artifact represents a serialized form of an approved source artifact.

It SHALL NOT define export behavior.

---

# 5. Canonical Structure

```text
Export Header
        ↓
Metadata
        ↓
Source Information
        ↓
Export Information
        ↓
Export Options
        ↓
Output References
        ↓
Validation Status
        ↓
Notes
        ↓
Version Information
```

---

# 6. Canonical Generic Export Template

```text
# Generic Export

## Metadata

Export ID:
<EXPORT_ID>

Export Format:
<EXPORT_FORMAT>

Version:
<VERSION>

Status:
<STATUS>

Authority:
AIOS Export Specification v1.1 SSOT

---

## Source Information

Source Type:
<SOURCE_TYPE>

Source Name:
<SOURCE_NAME>

Source Reference:
<SOURCE_REFERENCE>

Repository Path:
<REPOSITORY_PATH>

---

## Export Information

Export Name:
<EXPORT_NAME>

Export Description:
<EXPORT_DESCRIPTION>

Destination:
<DESTINATION>

Export Date:
<EXPORT_DATE>

Operator:
<OPERATOR>

---

## Export Options

Packaging Profile:
<PACKAGING_PROFILE>

Compression:
<COMPRESSION>

Encoding:
<ENCODING>

---

## Output References

Generated Files:
<GENERATED_FILES>

Output Location:
<OUTPUT_LOCATION>

---

## Validation Status

Validation Status:
<VALIDATION_STATUS>

Approval Status:
<APPROVAL_STATUS>

---

## Notes

<NOTES>

---

## Version Information

Version:
<VERSION>

Created Date:
<CREATED_DATE>

Last Updated:
<LAST_UPDATED>

Compatibility:
<COMPATIBILITY>
```

---

# 7. Required Fields

The following placeholders are mandatory:

- <EXPORT_ID>
- <EXPORT_FORMAT>
- <SOURCE_REFERENCE>
- <EXPORT_NAME>
- <VERSION>
- <STATUS>

An Export Template SHALL NOT omit any required field.

---

# 8. Optional Fields

Optional placeholders MAY include:

- <EXPORT_DESCRIPTION>
- <DESTINATION>
- <PACKAGING_PROFILE>
- <COMPRESSION>
- <ENCODING>
- <GENERATED_FILES>
- <OUTPUT_LOCATION>
- <VALIDATION_STATUS>
- <APPROVAL_STATUS>
- <NOTES>
- <COMPATIBILITY>

Optional fields SHALL NOT modify the canonical structure.

---

# 9. Export Format Values

The Export Format field SHALL use one of the following values:

- Markdown
- PDF
- DOCX
- JSON
- HTML
- XML

Additional formats MAY be introduced by future AIOS releases.

---

# 10. Reference Rules

A Generic Export MAY reference:

- AIOS Documents
- Production Artifacts
- QC Reports
- Validation Reports
- Repository Entries

Referenced artifacts remain authoritative in their respective specifications.

---

# 11. Placeholder Rules

All placeholders SHALL comply with Part IV.

Examples:

<EXPORT_ID>

<EXPORT_FORMAT>

<SOURCE_REFERENCE>

<GENERATED_FILES>

<OUTPUT_LOCATION>

---

# 12. Output Definition

This template defines the export document format only.

It SHALL NOT define:

- export algorithms,
- serialization rules,
- packaging procedures,
- repository behavior,
- runtime behavior.

Those responsibilities belong to AIOS Export Specification v1.1 SSOT.

---

# 13. Validation

Before approval, a Generic Export SHOULD verify:

- metadata completeness,
- required placeholders,
- source references,
- output references,
- version information,
- authority declaration.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 14. Compliance

A Generic Export Template is compliant only if:

- canonical structure is preserved,
- required placeholders are completed,
- metadata follows Part V,
- naming follows Part IV,
- authority references AIOS Export Specification,
- no export behavior or serialization logic is redefined.

---

End of Part XIX.

---

# Part XX
# Template Versioning

---

# 1. Purpose

Template Versioning defines the official version management policy for all AIOS templates.

Its purpose is to ensure that every template remains:

- identifiable,
- traceable,
- reproducible,
- compatible,
- and maintainable throughout its lifecycle.

This specification defines version management only.

It SHALL NOT define template behavior or production logic.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

Referenced By:

- AIOS Repository v1.1 SSOT
- AIOS QC Manual v1.1 SSOT

---

# 3. Versioning Principles

Every official AIOS template SHALL:

- have exactly one version identifier,
- maintain a complete revision history,
- preserve release traceability,
- declare compatibility with upstream specifications.

Version identifiers SHALL remain immutable after release.

---

# 4. Version Format

The canonical version format is:

```text
v<Major>.<Minor>
```

Examples:

```text
v1.0
v1.1
v2.0
v4.3
```

Patch identifiers SHALL NOT be used in official SSOT documents.

Editorial corrections SHALL be incorporated into the next approved release.

---

# 5. Version Lifecycle

Every template SHALL progress through the following lifecycle:

```text
Draft
    ↓
Review
    ↓
Validated
    ↓
Approved
    ↓
Released
    ↓
Deprecated (if applicable)
    ↓
Archived (if applicable)
```

Only templates in the **Released** state are normative.

---

# 6. Major Version Changes

A major version SHALL be issued when:

- canonical structure changes,
- compatibility is intentionally broken,
- template architecture changes,
- mandatory metadata changes,
- required placeholders change.

Examples:

```text
v1.x → v2.0
v2.x → v3.0
```

---

# 7. Minor Version Changes

A minor version SHALL be issued when:

- optional fields are added,
- documentation is expanded,
- examples are updated,
- formatting improvements are introduced,
- backward-compatible enhancements are made.

Examples:

```text
v1.0 → v1.1
v4.2 → v4.3
```

---

# 8. Compatibility Declaration

Every released template SHALL declare compatibility with applicable upstream specifications.

Example:

```text
Compatible with:

AIOS Core v4.3 SSOT

AIOS Runtime v1.1 SSOT

AIOS Production v4.3 SSOT
```

Compatibility SHALL be explicit.

---

# 9. Revision History

Each template SHOULD maintain a revision history.

Recommended format:

```text
Version

Release Date

Summary

Approved By
```

The revision history SHALL describe changes without redefining the template itself.

---

# 10. Version Synchronization

Template versions SHOULD remain synchronized with related AIOS releases whenever practical.

Example:

| Specification | Version |
|--------------|---------|
| AIOS Core | v4.3 |
| AIOS Runtime | v1.1 |
| AIOS Production | v4.3 |
| AIOS Templates | v1.1 |

Version numbers are independent and SHALL NOT imply identical release cycles.

---

# 11. Deprecated Versions

Deprecated templates:

- SHALL remain archived,
- SHALL NOT receive new functionality,
- MAY remain available for historical reference,
- SHALL indicate their replacement version when applicable.

---

# 12. Validation

Before release, version information SHOULD verify:

- version format,
- release status,
- compatibility declaration,
- revision history,
- authority declaration.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 13. Compliance

A template versioning implementation is compliant only if:

- canonical version format is used,
- lifecycle is followed,
- compatibility is declared,
- revision history is maintained,
- released versions remain immutable.

---

End of Part XX.

---

# Part XXI
# Template Compatibility Matrix

---

# 1. Purpose

The Template Compatibility Matrix defines the compatibility relationships between AIOS Templates and the authoritative AIOS specifications.

Its purpose is to:

- identify supported specification versions,
- prevent incompatible template usage,
- ensure deterministic interoperability,
- preserve release consistency across the AIOS ecosystem.

This section defines compatibility only.

It SHALL NOT define template behavior, production workflow, runtime execution, or system architecture.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

Referenced By:

- AIOS Core v4.3 SSOT
- AIOS Runtime v1.1 SSOT
- AIOS Production v4.3 SSOT
- AIOS Repository v1.1 SSOT
- AIOS Prompt Standards v1.2 SSOT
- AIOS QC Manual v1.1 SSOT
- AIOS Export Specification v1.1 SSOT

---

# 3. Compatibility Principles

Compatibility SHALL be:

- explicit,
- version-specific,
- deterministic,
- traceable.

Template compatibility SHALL NOT be inferred.

Every supported relationship SHALL be documented.

---

# 4. Compatibility Matrix

| AIOS Specification | Supported Version | Compatibility Status | Notes |
|--------------------|------------------|----------------------|-------|
| AIOS Core | v4.3 | Compatible | Canonical architecture authority |
| AIOS Runtime | v1.1 | Compatible | Runtime implementation authority |
| AIOS Production | v4.3 | Compatible | Production workflow authority |
| AIOS Repository | v1.1 | Compatible | Repository organization authority |
| AIOS Prompt Standards | v1.2 | Compatible | Prompt template authority |
| AIOS QC Manual | v1.1 | Compatible | Validation authority |
| AIOS Export Specification | v1.1 | Compatible | Export authority |
| AIOS Baseline | v1.0 | Compatible | Cross-document reference authority |

---

# 5. Compatibility Rules

Templates SHALL reference only compatible specifications.

Templates SHALL NOT rely on unsupported specification versions.

Compatibility SHALL be evaluated at the specification level rather than the document instance level.

---

# 6. Breaking Compatibility

Compatibility is considered broken when:

- required metadata changes,
- canonical template structure changes,
- placeholder syntax changes,
- authority ownership changes,
- mandatory references change.

Breaking compatibility SHALL require a documented version update.

---

# 7. Forward Compatibility

Templates SHOULD remain forward-compatible whenever practical.

Future compatible specifications MAY extend templates without invalidating existing released templates.

Forward compatibility SHALL NOT redefine existing template semantics.

---

# 8. Backward Compatibility

Backward compatibility SHOULD be preserved whenever practical.

If backward compatibility cannot be maintained:

- the incompatibility SHALL be documented,
- migration guidance SHALL be provided,
- deprecated versions SHALL remain archived.

---

# 9. Compatibility Validation

Compatibility verification SHOULD include:

- supported specification versions,
- authority references,
- metadata consistency,
- placeholder consistency,
- cross-reference integrity.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 10. Compliance

A compatibility declaration is compliant only if:

- supported versions are explicitly identified,
- authority references are correct,
- unsupported versions are excluded,
- compatibility status is documented,
- validation requirements are satisfied.

---

End of Part XXI.

---

# Part XXII
# Template Reference Matrix

---

# 1. Purpose

The Template Reference Matrix defines the authoritative ownership and reference relationships for every official AIOS template.

Its purpose is to:

- identify the owning specification for each template,
- eliminate ambiguity,
- prevent duplicated definitions,
- preserve the Single Source of Truth (SSOT),
- ensure consistent cross-document references.

This section defines ownership and references only.

It SHALL NOT define template behavior, production workflow, runtime execution, or system architecture.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

Referenced By:

- AIOS Core v4.3 SSOT
- AIOS Runtime v1.1 SSOT
- AIOS Production v4.3 SSOT
- AIOS Repository v1.1 SSOT
- AIOS Prompt Standards v1.2 SSOT
- AIOS QC Manual v1.1 SSOT
- AIOS Export Specification v1.1 SSOT

---

# 3. Reference Principles

Every official template SHALL have:

- exactly one authoritative owner,
- one canonical definition,
- one approved template structure.

A template SHALL NOT be defined in multiple specifications.

Other specifications SHALL reference the template instead of redefining it.

---

# 4. Template Ownership Matrix

| Template | Primary Owner | Referenced By |
|-----------|---------------|---------------|
| CASE Template | AIOS Production | AIOS Templates |
| Chapter Template | AIOS Production | AIOS Templates |
| Storyboard Template | AIOS Production | AIOS Templates |
| Production Storyboard Sheet Template | AIOS Production | AIOS Templates |
| Storyboard Generation Prompt Template | AIOS Prompt Standards | AIOS Templates |
| Storyboard Image Prompt Template | AIOS Prompt Standards | AIOS Templates |
| Master Image Prompt Template | AIOS Prompt Standards | AIOS Templates |
| Video Prompt Template | AIOS Prompt Standards | AIOS Templates |
| Audio Prompt Template | AIOS Prompt Standards | AIOS Templates |
| Generic Asset Registry Template | AIOS Production | AIOS Templates |
| QC Report Template | AIOS QC Manual | AIOS Templates |
| Validation Report Template | AIOS QC Manual | AIOS Templates |
| Generic Production Report Template | AIOS Production | AIOS Templates |
| Generic Export Template | AIOS Export Specification | AIOS Templates |

---

# 5. Cross-Reference Rules

Templates SHALL reference authoritative specifications.

Templates SHALL NOT duplicate:

- architecture,
- runtime behavior,
- production workflow,
- validation methodology,
- export procedures.

Cross-references SHALL be maintained whenever the owning specification changes.

---

# 6. Ownership Changes

If ownership changes in a future release:

- the new owner SHALL be documented,
- compatibility SHALL be evaluated,
- migration guidance SHALL be provided,
- historical ownership SHALL remain traceable.

Ownership changes SHALL require an approved release.

---

# 7. Duplicate Prevention

Duplicate template definitions are prohibited.

When a template already exists:

- it SHALL be referenced,
- it SHALL NOT be copied,
- it SHALL NOT be redefined.

This rule preserves the Single Source of Truth.

---

# 8. Reference Validation

Reference validation SHOULD verify:

- owner correctness,
- reference integrity,
- document availability,
- version compatibility,
- authority consistency.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 9. Compliance

A Template Reference Matrix is compliant only if:

- every template has exactly one owner,
- ownership is correctly declared,
- references are valid,
- duplicate definitions are absent,
- authority relationships remain consistent.

---

End of Part XXII.

---

# Part XXIII
# Implementation Guidelines

---

# 1. Purpose

Implementation Guidelines define the normative rules for using official AIOS templates.

Their purpose is to ensure that templates are implemented consistently across all AIOS specifications, repositories, runtime implementations, and production environments.

This section defines implementation guidance only.

It SHALL NOT define system architecture, runtime behavior, production workflow, validation methodology, or export procedures.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

Referenced By:

- AIOS Production v4.3 SSOT
- AIOS Repository v1.1 SSOT
- AIOS Prompt Standards v1.2 SSOT
- AIOS QC Manual v1.1 SSOT
- AIOS Export Specification v1.1 SSOT

---

# 3. General Principles

Every official AIOS implementation SHALL:

- use the canonical template,
- preserve the canonical structure,
- preserve required metadata,
- preserve required placeholders,
- preserve authority declarations,
- preserve version information.

Implementations SHALL remain deterministic.

---

# 4. Template Integrity

Implementations SHALL NOT:

- remove mandatory sections,
- rename mandatory placeholders,
- reorder mandatory structural elements,
- redefine template semantics,
- change ownership declarations.

Editorial formatting MAY differ provided that canonical meaning is preserved.

---

# 5. Placeholder Implementation

Every placeholder SHALL be replaced with an appropriate value before release unless the template is intentionally distributed as a reusable template.

Placeholder syntax SHALL follow Part IV.

Example:

```text
<CASE_ID>
<VERSION>
<STATUS>
```

Custom placeholder syntax is prohibited.

---

# 6. Metadata Implementation

Metadata SHALL be preserved during:

- document creation,
- document editing,
- repository storage,
- export,
- archival.

Metadata SHALL remain synchronized across all published formats.

---

# 7. Cross-Reference Implementation

Referenced specifications SHALL be cited rather than duplicated.

Implementations SHALL NOT embed upstream definitions into downstream templates.

Whenever an authoritative specification changes, implementations SHOULD update their references accordingly.

---

# 8. Extensibility

Implementations MAY extend templates by adding implementation-specific sections.

Extensions SHALL:

- preserve canonical sections,
- remain clearly distinguishable,
- avoid modifying required fields,
- avoid changing template semantics.

Canonical sections SHALL always remain authoritative.

---

# 9. Repository Integration

Templates SHOULD integrate consistently with AIOS Repository.

Repository implementations SHOULD preserve:

- filenames,
- identifiers,
- metadata,
- version information,
- authority declarations.

Repository organization is governed by AIOS Repository v1.1 SSOT.

---

# 10. Export Integration

Templates SHOULD remain compatible with all supported export formats.

Export implementations SHALL preserve:

- metadata,
- placeholder substitutions,
- document hierarchy,
- version information.

Export behavior is governed by AIOS Export Specification v1.1 SSOT.

---

# 11. Validation

Before publication, implementations SHOULD verify:

- template completeness,
- metadata integrity,
- placeholder replacement,
- authority declaration,
- compatibility declaration,
- cross-reference validity.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 12. Prohibited Modifications

Implementations SHALL NOT:

- redefine architecture,
- redefine runtime behavior,
- redefine production workflow,
- redefine validation methodology,
- redefine export procedures,
- redefine authoritative terminology.

Such changes SHALL be made only within the owning SSOT.

---

# 13. Compliance

An implementation is compliant only if it:

- preserves canonical structure,
- preserves required metadata,
- preserves ownership declarations,
- maintains reference integrity,
- passes validation,
- complies with all applicable upstream specifications.

---

End of Part XXIII.

---

# Part XXIV
# Migration Guide

---

# 1. Purpose

The Migration Guide defines the normative principles for transitioning between versions of official AIOS templates.

Its purpose is to:

- preserve interoperability,
- maintain compatibility,
- minimize migration risk,
- ensure consistent adoption of new template versions.

This section defines migration guidance only.

It SHALL NOT define template behavior, production workflow, runtime execution, validation methodology, or export procedures.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

Referenced By:

- AIOS Repository v1.1 SSOT
- AIOS Production v4.3 SSOT
- AIOS QC Manual v1.1 SSOT

---

# 3. Migration Principles

Template migration SHALL be:

- planned,
- traceable,
- deterministic,
- reversible where practical,
- documented.

Migration SHALL preserve the integrity of canonical templates.

---

# 4. Migration Triggers

Migration MAY be required when:

- a new template version is released,
- compatibility requirements change,
- metadata requirements change,
- placeholder requirements change,
- authoritative ownership changes,
- deprecated templates are replaced.

---

# 5. Migration Process

The recommended migration process is:

```text
Identify Current Version
            ↓
Determine Target Version
            ↓
Review Compatibility
            ↓
Update Template Structure
            ↓
Update Metadata
            ↓
Update Placeholders
            ↓
Validate
            ↓
Approve
            ↓
Release
```

Every migration SHOULD be documented.

---

# 6. Backward Compatibility

Whenever practical:

- existing documents SHOULD remain readable,
- historical templates SHOULD remain archived,
- legacy references SHOULD remain traceable.

Backward compatibility SHALL NOT override canonical requirements.

---

# 7. Breaking Changes

Breaking changes include, but are not limited to:

- mandatory structural modifications,
- required metadata changes,
- placeholder syntax changes,
- authority ownership changes,
- incompatible reference changes.

Breaking changes SHALL require a documented migration path.

---

# 8. Migration Records

Migration records SHOULD include:

- source version,
- target version,
- migration date,
- migration summary,
- compatibility assessment,
- approval information.

Migration records improve auditability and traceability.

---

# 9. Validation

After migration, templates SHOULD verify:

- canonical structure,
- metadata completeness,
- placeholder correctness,
- authority declaration,
- reference integrity,
- compatibility declaration.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 10. Deprecation Handling

Deprecated templates SHALL:

- remain archived,
- remain identifiable,
- indicate their replacement,
- no longer receive normative updates.

Historical availability SHALL NOT imply continued normative status.

---

# 11. Repository Synchronization

Following successful migration:

- repository entries SHOULD be synchronized,
- obsolete references SHOULD be updated,
- compatibility information SHOULD be refreshed,
- archived versions SHOULD remain accessible.

Repository organization is governed by AIOS Repository v1.1 SSOT.

---

# 12. Compliance

A migration is compliant only if:

- the canonical template is preserved,
- required metadata is updated,
- compatibility is documented,
- migration records are maintained,
- validation is completed,
- approval is recorded.

---

End of Part XXIV.

---

# Part XXV
# Normative References

---

# 1. Purpose

This section identifies the authoritative specifications referenced by AIOS Templates v1.1 SSOT.

Normative references define requirements that are essential for the correct interpretation and implementation of this specification.

AIOS Templates SHALL reference these specifications rather than redefining their contents.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

---

# 3. Reference Principles

Normative references SHALL:

- identify the authoritative source,
- preserve the Single Source of Truth (SSOT),
- prevent duplicated definitions,
- maintain cross-document consistency,
- support deterministic implementation.

If a conflict exists between this document and a referenced specification, the referenced specification SHALL take precedence within its area of authority.

---

# 4. Primary Normative References

The following specifications are normative for AIOS Templates v1.1 SSOT.

| Specification | Version | Primary Responsibility |
|---------------|---------|------------------------|
| AIOS Core | v4.3 SSOT | Canonical architecture, governance, terminology, authority model |
| AIOS Runtime | v1.1 SSOT | Runtime implementation and execution behavior |
| AIOS Production | v4.3 SSOT | Production lifecycle, production artifacts, workflow |
| AIOS Repository | v1.1 SSOT | Repository organization and document storage |
| AIOS Prompt Standards | v1.2 SSOT | Prompt structure, syntax, and authoring standards |
| AIOS QC Manual | v1.1 SSOT | Validation methodology and quality assurance |
| AIOS Export Specification | v1.1 SSOT | Export formats, serialization, and packaging |
| AIOS Baseline | v1.0 | Cross-document relationships, dependency mapping, compatibility baseline |

---

# 5. Authority Boundaries

AIOS Templates SHALL NOT redefine content owned by another specification.

Authority boundaries are summarized below.

| Domain | Authoritative Specification |
|--------|-----------------------------|
| Architecture | AIOS Core |
| Runtime Behavior | AIOS Runtime |
| Production Workflow | AIOS Production |
| Repository Organization | AIOS Repository |
| Prompt Standards | AIOS Prompt Standards |
| Validation Methodology | AIOS QC Manual |
| Export Behavior | AIOS Export Specification |
| Template Structure | AIOS Templates |

---

# 6. Reference Integrity

Every cross-reference SHALL satisfy the following requirements:

- reference an approved specification,
- reference the appropriate version,
- reference the correct authority,
- preserve semantic consistency.

Broken or ambiguous references SHALL be corrected before release.

---

# 7. Version Alignment

AIOS Templates v1.1 SSOT is aligned with the following baseline.

| Specification | Supported Version |
|---------------|-------------------|
| AIOS Core | v4.3 SSOT |
| AIOS Runtime | v1.1 SSOT |
| AIOS Production | v4.3 SSOT |
| AIOS Repository | v1.1 SSOT |
| AIOS Prompt Standards | v1.2 SSOT |
| AIOS QC Manual | v1.1 SSOT |
| AIOS Export Specification | v1.1 SSOT |
| AIOS Baseline | v1.0 |

Compatibility beyond these versions SHALL be explicitly documented in future releases.

---

# 8. Reference Maintenance

Whenever a referenced specification is superseded:

- compatibility SHALL be reviewed,
- reference mappings SHALL be updated,
- migration guidance SHALL be provided when required,
- historical references SHALL remain traceable.

Reference updates SHALL occur only through an approved AIOS release.

---

# 9. Compliance

AIOS Templates complies with the AIOS documentation framework only if:

- all required normative references are identified,
- authority boundaries are preserved,
- no upstream specification is redefined,
- reference integrity is maintained,
- supported versions are documented.

---

End of Part XXV.

---

# Appendix A
# Complete Metadata Fields

---

# 1. Purpose

This appendix defines the canonical metadata fields used throughout AIOS Templates v1.1 SSOT.

It serves as the single reference for metadata definitions used by all official AIOS templates.

This appendix defines metadata fields only.

It SHALL NOT define template behavior, production workflow, runtime execution, validation methodology, or export procedures.

---

# 2. Metadata Principles

Metadata SHALL be:

- standardized,
- deterministic,
- implementation-independent,
- machine-readable,
- human-readable,
- version-controlled.

Every metadata field SHALL have one unambiguous meaning.

---

# 3. Core Metadata Fields

The following fields are universally applicable.

| Field | Required | Description |
|--------|----------|-------------|
| Title | Yes | Human-readable document title |
| Document ID | Optional | Unique document identifier |
| Template ID | Optional | Unique template identifier |
| Version | Yes | Canonical version identifier |
| Status | Yes | Current lifecycle status |
| Authority | Yes | Primary owning specification |
| Source Specification | Yes | Functional owning specification |
| Created Date | Optional | Original creation date |
| Last Updated | Optional | Most recent revision date |
| Compatibility | Optional | Supported specification versions |
| Validation Status | Yes | Validation state |
| Approval Status | Optional | Approval state |

---

# 4. Production Metadata Fields

The following fields are commonly used by production-related templates.

| Field |
|--------|
| CASE ID |
| CASE Name |
| Chapter Number |
| Chapter Title |
| Production Name |
| Production Objective |
| Storyboard ID |
| Prompt ID |
| Report ID |
| Registry ID |
| Asset ID |

---

# 5. Asset Metadata Fields

Typical asset metadata includes:

| Field |
|--------|
| Asset Name |
| Asset Category |
| Asset Version |
| Asset Status |
| Owner |
| Source |
| Tags |
| Repository Path |

---

# 6. Validation Metadata Fields

Typical validation metadata includes:

| Field |
|--------|
| Validation Status |
| Approval Status |
| Reviewer |
| Validation Date |
| Overall Result |
| Overall Score |

---

# 7. Export Metadata Fields

Typical export metadata includes:

| Field |
|--------|
| Export ID |
| Export Format |
| Source Reference |
| Output Location |
| Generated Files |
| Packaging Profile |
| Encoding |

---

# 8. Metadata Consistency

Metadata SHALL:

- use canonical field names,
- preserve semantic meaning,
- remain synchronized across supported formats,
- remain compatible with upstream specifications.

---

# 9. Compliance

Metadata is compliant only if:

- required fields are present,
- canonical field names are preserved,
- authority declarations are correct,
- version information is accurate.

---

End of Appendix A.

---

# Appendix B
# Placeholder Specification

---

# 1. Purpose

This appendix defines the canonical placeholder syntax used throughout AIOS Templates v1.1 SSOT.

Its purpose is to ensure consistent placeholder usage across all official AIOS templates.

This appendix defines placeholder conventions only.

It SHALL NOT define template behavior, production workflow, runtime execution, validation methodology, or export procedures.

---

# 2. Placeholder Principles

Placeholders SHALL be:

- standardized,
- deterministic,
- implementation-independent,
- human-readable,
- machine-readable,
- unambiguous.

Every placeholder SHALL represent exactly one logical value.

---

# 3. Canonical Placeholder Syntax

The canonical syntax is:

```text
<PLACEHOLDER_NAME>
```

Rules:

- enclosed in angle brackets (`< >`)
- uppercase letters
- words separated by underscores (`_`)
- no spaces
- no special characters other than underscores

Examples:

```text
<CASE_ID>

<CHAPTER_NUMBER>

<PRODUCT_NAME>

<VIDEO_DURATION>

<VALIDATION_STATUS>
```

---

# 4. Placeholder Categories

## 4.1 Identification

```text
<CASE_ID>

<CHAPTER_NUMBER>

<REPORT_ID>

<PROMPT_ID>

<REGISTRY_ID>

<ASSET_ID>

<DOCUMENT_ID>
```

---

## 4.2 Versioning

```text
<VERSION>

<STATUS>

<COMPATIBILITY>

<CREATED_DATE>

<LAST_UPDATED>
```

---

## 4.3 Production

```text
<PRODUCTION_NAME>

<PRODUCTION_OBJECTIVE>

<CREATIVE_OBJECTIVE>

<TARGET_EMOTION>

<STORY_SUMMARY>
```

---

## 4.4 Prompt

```text
<PROMPT_TYPE>

<VISUAL_STYLE>

<CAMERA_STYLE>

<LIGHTING_STYLE>

<AUDIO_STYLE>

<GENERATION_CONSTRAINTS>
```

---

## 4.5 Assets

```text
<ASSET_NAME>

<ASSET_CATEGORY>

<OWNER>

<SOURCE>

<TAGS>
```

---

## 4.6 Validation

```text
<VALIDATION_STATUS>

<APPROVAL_STATUS>

<OVERALL_RESULT>

<OVERALL_SCORE>

<VALIDATION_CHECKLIST>
```

---

## 4.7 Export

```text
<EXPORT_ID>

<EXPORT_FORMAT>

<OUTPUT_LOCATION>

<GENERATED_FILES>
```

---

# 5. Placeholder Naming Rules

Every placeholder SHALL:

- use uppercase letters,
- use underscores between words,
- describe exactly one value,
- remain semantically stable across versions.

Example:

```text
<MASTER_IMAGE_REFERENCE>
```

Preferred over:

```text
<IMAGE>

<MASTER>

<IMG_REF>
```

---

# 6. Reserved Placeholder Prefixes

The following prefixes are reserved:

| Prefix | Usage |
|---------|-------|
| CASE | CASE-related fields |
| CHAPTER | Chapter-related fields |
| STORYBOARD | Storyboard-related fields |
| PROMPT | Prompt-related fields |
| REPORT | Report-related fields |
| REGISTRY | Registry-related fields |
| ASSET | Asset-related fields |
| VALIDATION | Validation-related fields |
| EXPORT | Export-related fields |

Reserved prefixes SHALL NOT be used inconsistently.

---

# 7. Prohibited Placeholder Formats

The following formats are prohibited:

```text
{CASE_ID}

(CASE_ID)

[[CASE_ID]]

CASE_ID

case_id

CaseID

<<CASE_ID>>
```

Only the canonical syntax SHALL be used.

---

# 8. Placeholder Consistency

A placeholder SHALL retain the same meaning wherever it appears.

Example:

```text
<CASE_ID>
```

SHALL always represent the unique identifier of a CASE.

Its meaning SHALL NOT vary between templates.

---

# 9. Validation

Placeholder validation SHOULD verify:

- canonical syntax,
- correct naming,
- semantic consistency,
- uniqueness within context,
- compatibility with Part IV.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 10. Compliance

Placeholder usage is compliant only if:

- canonical syntax is used,
- naming rules are followed,
- prohibited formats are absent,
- semantic consistency is preserved.

---

End of Appendix B.

---

# Appendix C
# Formatting Rules

---

# 1. Purpose

This appendix defines the canonical formatting rules for all official AIOS templates.

Its purpose is to ensure that templates remain visually consistent, structurally predictable, and implementation-independent across all supported document formats.

This appendix defines formatting conventions only.

It SHALL NOT define template behavior, production workflow, runtime execution, validation methodology, or export procedures.

---

# 2. Formatting Principles

All official AIOS templates SHALL be:

- consistent,
- deterministic,
- readable,
- machine-processable,
- human-readable,
- implementation-independent.

Formatting SHALL improve readability without altering semantic meaning.

---

# 3. Heading Hierarchy

The canonical heading hierarchy SHALL be:

```text
# Part

## Section

### Subsection

#### Detail
```

Heading depth SHOULD NOT exceed four levels unless explicitly required by the owning specification.

---

# 4. Section Numbering

Normative sections SHOULD use sequential numbering.

Example:

```text
1. Purpose

2. Ownership

3. Structure

4. Validation

5. Compliance
```

Appendices MAY use independent numbering where appropriate.

---

# 5. Lists

Ordered lists SHALL be used when sequence is significant.

Example:

```text
1.
2.
3.
```

Unordered lists SHALL be used for unordered collections.

Example:

```text
- Item
- Item
- Item
```

List styles SHOULD remain consistent throughout the document.

---

# 6. Tables

Tables SHOULD be used for structured reference information.

Example:

| Field | Description |
|--------|-------------|
| Version | Template version |
| Status | Lifecycle status |

Tables SHALL NOT redefine normative content.

---

# 7. Code Blocks

Code blocks SHALL be used for:

- template layouts,
- placeholder examples,
- metadata examples,
- directory structures,
- structural illustrations.

Example:

```text
<CASE_ID>

<VERSION>

<STATUS>
```

Programming language syntax highlighting SHALL NOT be required unless documenting executable code.

---

# 8. Placeholder Presentation

Placeholders SHALL follow the canonical syntax defined in Appendix B.

Example:

```text
<CASE_ID>

<PROMPT_ID>

<EXPORT_FORMAT>
```

Placeholder formatting SHALL remain unchanged across document formats.

---

# 9. Emphasis

Emphasis SHOULD be used sparingly.

Recommended usage:

- **bold** for important terms,
- *italic* for explanatory emphasis.

Excessive formatting SHALL be avoided.

---

# 10. Whitespace

Whitespace SHOULD improve readability.

Implementations SHOULD:

- separate major sections,
- separate tables from surrounding text,
- separate code blocks from narrative text.

Whitespace SHALL NOT alter semantic interpretation.

---

# 11. Line Length

Reasonably short line lengths are recommended for readability.

Implementations MAY reflow text during export provided semantic meaning is preserved.

---

# 12. Cross References

Cross references SHOULD identify the referenced Part, Appendix, or authoritative specification.

Example:

```text
See Part IV.

See Appendix B.

See AIOS Production v4.3 SSOT.
```

References SHALL remain unambiguous.

---

# 13. File Naming

Official filenames SHALL follow the naming convention defined in Part IV.

Example:

```text
AIOS_Templates_v1.1_SSOT.md

AIOS_Templates_v1.1_SSOT.pdf
```

---

# 14. Multi-Format Consistency

Formatting SHALL remain semantically equivalent across:

- Markdown
- PDF
- DOCX
- JSON (where applicable)

Presentation MAY vary.

Document meaning SHALL remain identical.

---

# 15. Validation

Formatting validation SHOULD verify:

- heading hierarchy,
- numbering consistency,
- placeholder formatting,
- table formatting,
- code block integrity,
- cross-reference correctness.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 16. Compliance

Formatting is compliant only if:

- canonical hierarchy is preserved,
- numbering is consistent,
- placeholders follow Appendix B,
- filenames follow Part IV,
- semantic meaning remains unchanged across formats.

---

End of Appendix C.

---

# Appendix D
# Example Repository Structure

---

# 1. Purpose

This appendix provides a canonical example of how official AIOS templates MAY be organized within an AIOS Repository.

Its purpose is to illustrate a recommended repository layout for consistency across implementations.

This appendix is informative.

It SHALL NOT redefine repository architecture, storage policies, or repository behavior.

Those responsibilities belong exclusively to AIOS Repository v1.1 SSOT.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

Referenced Specification:

AIOS Repository v1.1 SSOT

---

# 3. Repository Principles

Repository organization SHOULD:

- be modular,
- be deterministic,
- separate template families,
- preserve version traceability,
- maintain clear ownership.

The example below is illustrative.

Equivalent structures MAY be used provided they remain compatible with AIOS Repository v1.1 SSOT.

---

# 4. Example Repository Structure

```text
Templates/
│
├── Production/
│   ├── CASE/
│   ├── Chapter/
│   ├── Storyboard/
│   ├── Production Storyboard Sheet/
│   └── Reports/
│
├── Prompt/
│   ├── Storyboard Generation/
│   ├── Storyboard Image/
│   ├── Master Image/
│   ├── Video/
│   └── Audio/
│
├── Registry/
│   └── Generic Asset Registry/
│
├── Validation/
│   ├── QC Report/
│   └── Validation Report/
│
├── Export/
│   └── Generic Export/
│
└── Shared/
    ├── Metadata/
    ├── Placeholders/
    └── Formatting/
```

---

# 5. Recommended Directory Organization

Template directories SHOULD group artifacts by functional responsibility.

Recommended families include:

- Production
- Prompt
- Registry
- Validation
- Export
- Shared

Additional directories MAY be introduced provided they do not conflict with the authoritative repository specification.

---

# 6. File Naming Examples

Examples:

```text
CASE_Template.md

Chapter_Template.md

Storyboard_Template.md

Master_Image_Prompt_Template.md

Generic_Asset_Registry_Template.md

Generic_Production_Report_Template.md

Generic_Export_Template.md
```

File naming SHALL remain consistent with Part IV.

---

# 7. Version Organization

Template versions MAY be organized using version directories.

Example:

```text
Templates/

└── v1.1/
```

Alternative version management strategies MAY be used if traceability is preserved.

---

# 8. Shared Resources

Shared resources MAY include:

- metadata definitions,
- placeholder references,
- formatting references,
- common assets.

Shared resources SHALL NOT redefine normative specifications.

---

# 9. Repository Independence

This appendix illustrates one recommended organization only.

Repository implementations MAY differ provided they remain compliant with:

- AIOS Repository v1.1 SSOT
- AIOS Templates v1.1 SSOT

---

# 10. Validation

Repository organization SHOULD verify:

- directory consistency,
- filename consistency,
- version traceability,
- reference integrity.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 11. Compliance

A repository organization is compliant only if:

- template ownership is preserved,
- directory organization remains deterministic,
- filenames follow Part IV,
- repository behavior remains governed by AIOS Repository v1.1 SSOT.

---

End of Appendix D.

---

# Appendix E
# Master Template Index

---

# 1. Purpose

This appendix provides the complete index of all official templates defined by AIOS Templates v1.1 SSOT.

Its purpose is to:

- identify every canonical template,
- identify the owning specification,
- provide a single lookup reference,
- simplify navigation,
- preserve the Single Source of Truth.

This appendix is a reference index only.

It SHALL NOT redefine any template or specification.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

---

# 3. Template Families

Official AIOS templates are organized into the following families:

- Production Templates
- Prompt Templates
- Validation Templates
- Registry Templates
- Report Templates
- Export Templates

Each family contains one or more canonical templates.

---

# 4. Master Template Index

| Template | Template Family | Primary Owning Specification | Defined In |
|-----------|-----------------|------------------------------|------------|
| CASE Template | Production | AIOS Production v4.3 SSOT | Part VI |
| Chapter Template | Production | AIOS Production v4.3 SSOT | Part VII |
| Storyboard Template | Production | AIOS Production v4.3 SSOT | Part VIII |
| Production Storyboard Sheet Template | Production | AIOS Production v4.3 SSOT | Part IX |
| Storyboard Generation Prompt Template | Prompt | AIOS Prompt Standards v1.2 SSOT | Part X |
| Storyboard Image Prompt Template | Prompt | AIOS Prompt Standards v1.2 SSOT | Part XI |
| Master Image Prompt Template | Prompt | AIOS Prompt Standards v1.2 SSOT | Part XII |
| Video Prompt Template | Prompt | AIOS Prompt Standards v1.2 SSOT | Part XIII |
| Audio Prompt Template | Prompt | AIOS Prompt Standards v1.2 SSOT | Part XIV |
| QC Report Template | Validation | AIOS QC Manual v1.1 SSOT | Part XV |
| Validation Report Template | Validation | AIOS QC Manual v1.1 SSOT | Part XVI |
| Generic Asset Registry Template | Registry | AIOS Production v4.3 SSOT | Part XVII |
| Generic Production Report Template | Report | AIOS Production v4.3 SSOT | Part XVIII |
| Generic Export Template | Export | AIOS Export Specification v1.1 SSOT | Part XIX |

---

# 5. Template Ownership Summary

| Owning Specification | Templates |
|----------------------|-----------|
| AIOS Production v4.3 SSOT | CASE, Chapter, Storyboard, Production Storyboard Sheet, Generic Asset Registry, Generic Production Report |
| AIOS Prompt Standards v1.2 SSOT | Storyboard Generation Prompt, Storyboard Image Prompt, Master Image Prompt, Video Prompt, Audio Prompt |
| AIOS QC Manual v1.1 SSOT | QC Report, Validation Report |
| AIOS Export Specification v1.1 SSOT | Generic Export |

AIOS Templates v1.1 SSOT standardizes the document structure for all templates listed above.

---

# 6. Template Relationships

The canonical production flow is:

```text
CASE
    ↓
Chapter
    ↓
Storyboard
    ↓
Production Storyboard Sheet
    ↓
Storyboard Generation Prompt
    ↓
Storyboard Image Prompt
    ↓
Master Image Prompt
    ↓
Video Prompt
    ↓
Audio Prompt
    ↓
QC Report
    ↓
Validation Report
    ↓
Production Report
    ↓
Export
```

This flow is informational.

Production behavior remains governed by AIOS Production v4.3 SSOT.

---

# 7. Template Status

All templates listed in this appendix are considered canonical for AIOS Templates v1.1 SSOT.

Future templates SHALL be introduced through an approved AIOS release.

---

# 8. Validation

The Master Template Index SHOULD verify:

- template completeness,
- ownership accuracy,
- Part references,
- specification references,
- version compatibility.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 9. Compliance

The Master Template Index is compliant only if:

- every official template is listed,
- ownership is correctly identified,
- references are accurate,
- duplicate entries are absent.

---

End of Appendix E.

---

# Appendix F
# Cross Reference Table

---

# 1. Purpose

This appendix defines the cross-reference relationships between AIOS Templates v1.1 SSOT and other authoritative AIOS specifications.

Its purpose is to:

- improve document navigation,
- preserve traceability,
- identify authoritative ownership,
- prevent duplicated definitions,
- reinforce the Single Source of Truth (SSOT).

This appendix is a reference aid only.

It SHALL NOT define architecture, runtime behavior, production workflow, validation methodology, or export procedures.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

---

# 3. Cross-Reference Principles

Cross-references SHALL:

- identify the authoritative specification,
- reference rather than duplicate,
- remain version-aware,
- preserve ownership boundaries,
- maintain semantic consistency.

Every normative reference SHALL point to the owning specification.

---

# 4. Specification Cross-Reference Matrix

| Subject | Authoritative Specification | Referenced In |
|---------|-----------------------------|---------------|
| Architecture | AIOS Core v4.3 SSOT | Parts I, III, XXV |
| Governance | AIOS Core v4.3 SSOT | Parts I, II |
| Authority Model | AIOS Core v4.3 SSOT | Parts I, XXV |
| Runtime Behavior | AIOS Runtime v1.1 SSOT | Parts I, XXV |
| Production Workflow | AIOS Production v4.3 SSOT | Parts VI–XIX |
| Repository Organization | AIOS Repository v1.1 SSOT | Appendix D, Part XXIII |
| Prompt Authoring | AIOS Prompt Standards v1.2 SSOT | Parts X–XIV |
| Validation Methodology | AIOS QC Manual v1.1 SSOT | Parts XV–XVI |
| Export Behavior | AIOS Export Specification v1.1 SSOT | Part XIX |
| Cross-Document Baseline | AIOS Baseline v1.0 | Parts XXI, XXV |

---

# 5. Template Cross-Reference Matrix

| Template | Owning Specification | Defined In |
|----------|----------------------|------------|
| CASE Template | AIOS Production | Part VI |
| Chapter Template | AIOS Production | Part VII |
| Storyboard Template | AIOS Production | Part VIII |
| Production Storyboard Sheet Template | AIOS Production | Part IX |
| Storyboard Generation Prompt Template | AIOS Prompt Standards | Part X |
| Storyboard Image Prompt Template | AIOS Prompt Standards | Part XI |
| Master Image Prompt Template | AIOS Prompt Standards | Part XII |
| Video Prompt Template | AIOS Prompt Standards | Part XIII |
| Audio Prompt Template | AIOS Prompt Standards | Part XIV |
| QC Report Template | AIOS QC Manual | Part XV |
| Validation Report Template | AIOS QC Manual | Part XVI |
| Generic Asset Registry Template | AIOS Production | Part XVII |
| Generic Production Report Template | AIOS Production | Part XVIII |
| Generic Export Template | AIOS Export Specification | Part XIX |

---

# 6. Reference Integrity

Every reference SHALL satisfy the following conditions:

- reference the correct specification,
- reference the correct version,
- reference the correct authority,
- preserve semantic meaning.

References SHALL NOT introduce conflicting definitions.

---

# 7. Reference Maintenance

When an authoritative specification changes:

- affected references SHOULD be reviewed,
- obsolete references SHOULD be updated,
- compatibility SHOULD be reassessed,
- historical traceability SHOULD be preserved.

Reference updates SHALL occur only through an approved AIOS release.

---

# 8. Validation

Cross-reference validation SHOULD verify:

- reference correctness,
- ownership consistency,
- version compatibility,
- semantic integrity,
- absence of duplicate definitions.

Validation procedures are governed by AIOS QC Manual v1.1 SSOT.

---

# 9. Compliance

A Cross Reference Table is compliant only if:

- every reference identifies the authoritative specification,
- ownership boundaries are preserved,
- references remain valid,
- duplicate definitions are avoided,
- semantic consistency is maintained.

---

End of Appendix F.

---

# Appendix G
# Glossary

---

# 1. Purpose

This appendix defines the canonical glossary used by AIOS Templates v1.1 SSOT.

Its purpose is to provide consistent terminology for template-related concepts without redefining terminology owned by other AIOS specifications.

This glossary is normative only for template-specific terminology.

Architecture, runtime, production, governance, validation, and export terminology SHALL remain defined by their respective authoritative specifications.

---

# 2. Ownership

Primary Owning Specification:

AIOS Templates v1.1 SSOT

Referenced Specifications:

- AIOS Core v4.3 SSOT
- AIOS Production v4.3 SSOT
- AIOS Prompt Standards v1.2 SSOT

---

# 3. General Terms

| Term | Definition |
|------|------------|
| Template | A reusable document structure used to standardize AIOS artifacts. |
| Canonical Template | The single approved template recognized by AIOS Templates v1.1 SSOT. |
| Template Family | A logical grouping of related templates sharing a common purpose. |
| Placeholder | A symbolic field to be replaced with implementation-specific values. |
| Metadata | Structured descriptive information associated with a template. |
| Template Instance | A completed document created from a template. |

---

# 4. Production Template Terms

| Term | Definition |
|------|------------|
| CASE Template | Canonical structure for a production CASE document. |
| Chapter Template | Canonical structure for a production Chapter document. |
| Storyboard Template | Canonical structure for a Storyboard document. |
| Production Storyboard Sheet | Canonical structure for production planning details. |

Definitions of production behavior remain governed by AIOS Production v4.3 SSOT.

---

# 5. Prompt Template Terms

| Term | Definition |
|------|------------|
| Storyboard Generation Prompt Template | Template for generating a Storyboard. |
| Storyboard Image Prompt Template | Template for generating a Storyboard Image. |
| Master Image Prompt Template | Template for generating a Master Image. |
| Video Prompt Template | Template for generating a production video prompt. |
| Audio Prompt Template | Template for generating an audio prompt. |

Prompt engineering methodology remains governed by AIOS Prompt Standards v1.2 SSOT.

---

# 6. Validation Template Terms

| Term | Definition |
|------|------------|
| QC Report Template | Template for recording quality control results. |
| Validation Report Template | Template for recording validation results. |

Validation methodology remains governed by AIOS QC Manual v1.1 SSOT.

---

# 7. Generic Template Terms

| Term | Definition |
|------|------------|
| Generic Asset Registry Template | Canonical template for all AIOS asset registries. |
| Generic Production Report Template | Canonical template for all AIOS production reports. |
| Generic Export Template | Canonical template for all AIOS export artifacts. |

---

# 8. Template Lifecycle Terms

| Term | Definition |
|------|------------|
| Draft | Initial working version. |
| Review | Under formal review. |
| Validated | Successfully passed validation. |
| Approved | Officially approved. |
| Released | Official normative version. |
| Deprecated | Superseded but retained for historical reference. |
| Archived | Retained without further maintenance. |

---

# 9. Reserved Terms

The following terms are reserved within AIOS Templates:

- Template
- Metadata
- Placeholder
- Registry
- Report
- Export
- Compatibility
- Version
- Authority
- Validation

Their meanings SHALL remain stable across releases.

---

# 10. Terminology Consistency

If a term is defined by another AIOS specification, that specification SHALL take precedence.

Examples:

| Domain | Authoritative Specification |
|--------|-----------------------------|
| Architecture | AIOS Core v4.3 SSOT |
| Runtime | AIOS Runtime v1.1 SSOT |
| Production | AIOS Production v4.3 SSOT |
| Prompt Standards | AIOS Prompt Standards v1.2 SSOT |
| Validation | AIOS QC Manual v1.1 SSOT |
| Export | AIOS Export Specification v1.1 SSOT |

AIOS Templates SHALL NOT redefine those terms.

---

# 11. Compliance

This glossary is compliant only if:

- template terminology is consistently defined,
- ownership boundaries are preserved,
- duplicate definitions are avoided,
- authoritative specifications remain the source of truth.

---

End of Appendix G.

---

# Appendix H
# Final Lock Statement

---

# 1. Purpose

This appendix formally declares AIOS Templates v1.1 SSOT as the canonical template specification within the AIOS documentation framework.

Upon approval and release, this document becomes the authoritative reference for all official AIOS template structures.

---

# 2. Canonical Status

AIOS Templates v1.1 SSOT is designated as the official Single Source of Truth (SSOT) for AIOS template definitions.

It defines:

- template governance,
- template architecture,
- template metadata,
- template naming,
- canonical template structures,
- template versioning,
- compatibility,
- implementation guidance.

It SHALL NOT define:

- system architecture,
- runtime behavior,
- production workflow,
- prompt engineering methodology,
- validation methodology,
- export behavior.

Those responsibilities remain exclusively with their respective authoritative specifications.

---

# 3. Authority Boundaries

The authoritative ownership of the AIOS documentation framework is summarized below.

| Domain | Authoritative Specification |
|--------|-----------------------------|
| Architecture | AIOS Core v4.3 SSOT |
| Runtime | AIOS Runtime v1.1 SSOT |
| Production | AIOS Production v4.3 SSOT |
| Repository | AIOS Repository v1.1 SSOT |
| Prompt Standards | AIOS Prompt Standards v1.2 SSOT |
| Templates | AIOS Templates v1.1 SSOT |
| Quality Control | AIOS QC Manual v1.1 SSOT |
| Export | AIOS Export Specification v1.1 SSOT |
| Cross-Document Governance | AIOS Baseline v1.0 |

AIOS Templates SHALL remain within these authority boundaries.

---

# 4. Change Control

After release, this specification SHALL be considered locked.

Changes SHALL occur only through an approved AIOS release process.

Approved changes SHALL:

- preserve backward traceability,
- include documented revision history,
- include compatibility assessment,
- include migration guidance where applicable.

Uncontrolled modifications are prohibited.

---

# 5. Version Integrity

The released version SHALL remain immutable.

Editorial improvements, structural changes, and compatibility updates SHALL be introduced only through a new approved version.

Existing released versions SHALL remain archived for historical reference.

---

# 6. Implementation Requirement

All AIOS implementations using official templates SHOULD reference this specification.

Implementations SHALL:

- preserve canonical template structures,
- preserve metadata,
- preserve placeholder syntax,
- preserve ownership declarations,
- preserve authority boundaries.

Implementation-specific extensions MAY be added provided they do not alter canonical sections.

---

# 7. Compliance Statement

A document is compliant with AIOS Templates v1.1 SSOT only if it:

- uses canonical template structures,
- follows template governance,
- preserves metadata standards,
- follows placeholder conventions,
- maintains authority boundaries,
- references upstream specifications correctly.

---

# 8. Final Declaration

AIOS Templates v1.1 SSOT is hereby declared complete.

This specification serves as the authoritative reference for all official AIOS templates until superseded by a future approved AIOS release.

No section of this document SHALL be modified outside the official AIOS governance and release process.

---

# End of Specification

AIOS Templates v1.1 SSOT

Single Source of Truth

END