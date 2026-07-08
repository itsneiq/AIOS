# AIOS Repository v1.2

Single Source of Truth (Derived Specification)

Version: 1.2

Status: RELEASE

Classification: DERIVED SPECIFICATION

---

## Authority

This specification derives its authority from the following Canonical Specifications:

- AIOS Core v4.3 SSOT
- AIOS Runtime v1.2
- AIOS Production v4.4

These Canonical Specifications remain the authoritative definition of AIOS.

This document SHALL NOT redefine any Canonical Specification.

Whenever a concept already exists within a Canonical Specification, this document SHALL reference it rather than redefine it.

---

## Purpose

AIOS Repository specifies the canonical organization of AIOS artifacts.

Its responsibilities are limited to repository organization, storage, version organization, release organization, and archival management.

Repository behavior SHALL remain independent from Runtime execution and Production execution.

---

## Scope

This specification defines:

- Repository layout
- Directory structure
- Repository objects
- Storage rules
- Naming convention
- Version organization
- Release organization
- Knowledge package organization
- Archive organization
- Repository validation

This specification SHALL NOT define Runtime behavior, Production workflow, governance, architecture, execution lifecycle, or AI behavior.

---

## Normative References

This specification SHALL be interpreted together with:

- AIOS Core v4.3 SSOT
- AIOS Runtime v1.2
- AIOS Production v4.4

Where conflicts exist, the Canonical Specification SHALL prevail.

---

End of Front Matter

---

AIOS Repository v1.2 SSOT

Front Matter

1. Scope

2. Repository Layout

3. Directory Structure

4. Repository Objects

5. Storage Rules

6. Naming Convention

7. Version Organization

8. Release Organization

9. Knowledge Package Organization

10. Archive Organization

11. Repository Validation

12. References

Appendix A
Repository Tree

Appendix B
Directory Examples

Appendix C
Naming Examples

Appendix D
Validation Checklist

Appendix E
Glossary

Final Lock Statement

---

# 1. Scope

## 1.1 Objective

The AIOS Repository provides the canonical storage organization for AIOS artifacts.

Repository responsibilities are limited to artifact organization and storage.

Repository SHALL NOT define execution behavior.

---

## 1.2 Repository Responsibilities

The Repository SHALL organize:

- specifications
- templates
- production assets
- releases
- knowledge packages
- archives

Repository SHALL preserve deterministic organization.

---

## 1.3 Repository Boundaries

Repository SHALL NOT define:

- AIOS architecture
- Runtime execution
- Production execution
- AI reasoning
- Prompt generation
- Quality Control
- Export behavior

Those responsibilities belong to their respective Canonical Specifications.

---

## 1.4 Repository Compliance

A repository implementation complies with this specification when it:

- preserves repository organization
- preserves repository integrity
- preserves deterministic storage
- preserves released artifacts

---

End of Chapter

---

# 2. Repository Layout

## 2.1 Canonical Layout

The Repository SHALL organize artifacts into canonical domains.

The canonical layout is:

AIOS/

├── Core/

├── Runtime/

├── Production/

├── Repository/

├── Prompt_Standards/

├── Templates/

├── QC/

├── Export/

├── Knowledge/

├── Workspace/

├── Releases/

└── Archive/

---

## 2.2 Layout Stability

The canonical layout SHALL remain stable across compatible releases.

Structural changes SHALL be introduced through an approved Repository revision.

---

## 2.3 Domain Isolation

Each top-level directory SHALL contain artifacts belonging only to its assigned domain.

Artifacts SHALL NOT be duplicated across domains.

---

## 2.4 Repository Root

The repository SHALL have a single canonical root.

Nested repositories SHOULD NOT redefine repository organization.

---

End of Chapter

---

# 3. Directory Structure

## 3.1 Purpose

This chapter defines the canonical directory structure of the AIOS Repository.

The directory structure provides a deterministic organization for all AIOS artifacts.

The Repository SHALL organize artifacts only.

The Repository SHALL NOT define artifact behavior.

---

## 3.2 Canonical Directory Structure

The canonical repository structure is:

AIOS/

├── Core/

├── Runtime/

├── Production/

├── Repository/

├── Prompt_Standards/

├── Templates/

├── QC/

├── Export/

├── Knowledge/

├── Workspace/

├── Releases/

└── Archive/

Each top-level directory SHALL have a single domain responsibility.

---

## 3.3 Top-Level Directories

The following directories are reserved:

Core/

Runtime/

Production/

Repository/

Prompt_Standards/

Templates/

QC/

Export/

Knowledge/

Workspace/

Releases/

Archive/

Reserved directory names SHALL NOT be repurposed.

---

## 3.4 Domain Separation

Artifacts SHALL reside only within the directory representing their primary domain.

Cross-domain duplication SHALL NOT occur.

Where a relationship exists between artifacts, the relationship SHALL be represented by reference rather than duplication.

---

## 3.5 Subdirectory Organization

Subdirectories MAY be introduced to improve organization.

Subdirectories SHALL remain consistent with the responsibility of their parent directory.

Subdirectories SHALL NOT redefine repository hierarchy.

---

## 3.6 Directory Integrity

Repository directories SHALL preserve:

- deterministic organization
- stable naming
- predictable navigation
- compatibility across releases

---

End of Chapter

---

# 4. Repository Objects

## 4.1 Purpose

This chapter defines the repository objects managed by the AIOS Repository.

Repository objects represent stored artifacts only.

Repository objects SHALL NOT define execution behavior.

---

## 4.2 Repository Object Types

Repository objects include:

- Specification
- Template
- Reference
- Knowledge Package
- Release Package
- Archive
- Metadata
- Supporting Asset

Future object types MAY be introduced through future Repository revisions.

---

## 4.3 Object Identity

Each repository object SHALL possess a unique identity.

Object identity SHALL remain stable throughout the lifetime of the object.

Identity SHALL NOT depend upon storage implementation.

---

## 4.4 Object Metadata

Repository metadata SHOULD include:

- object identifier
- object name
- version
- classification
- storage location
- owner specification
- publication status

Repository metadata SHALL support repository organization.

Metadata SHALL NOT redefine information owned by another Canonical Specification.

---

## 4.5 Object Relationships

Repository objects MAY reference other repository objects.

Relationships SHALL be represented through repository references.

Objects SHALL NOT embed duplicate authoritative content.

---

## 4.6 Object Ownership

Repository ownership refers only to storage responsibility.

Concept ownership remains defined by the originating Canonical Specification.

The Repository SHALL preserve ownership metadata.

The Repository SHALL NOT redefine ownership authority.

---

End of Chapter

---

# 5. Storage Rules

## 5.1 Purpose

This chapter defines the storage rules governing repository artifacts.

Storage rules SHALL preserve consistency across the Repository.

---

## 5.2 Canonical Storage

Every repository object SHALL have one canonical storage location.

Duplicate authoritative copies SHALL NOT exist.

Derived copies MAY exist when explicitly identified as derived artifacts.

---

## 5.3 Storage Stability

Repository locations SHALL remain stable across compatible releases.

Storage reorganization SHALL require an approved Repository revision.

---

## 5.4 Storage Isolation

Repository objects SHALL be stored within their assigned domain.

Repository domains SHALL remain logically isolated.

Cross-domain references SHALL be represented by reference rather than duplication.

---

## 5.5 Storage Consistency

Repository storage SHALL preserve:

- object integrity
- version integrity
- metadata integrity
- directory integrity

Storage SHALL remain deterministic.

---

## 5.6 Storage Independence

Repository storage SHALL remain independent of:

- operating system
- filesystem implementation
- deployment platform
- repository hosting platform

---

## 5.7 Repository Integrity

Repository implementations SHALL prevent:

- orphaned artifacts
- duplicate authoritative artifacts
- inconsistent metadata
- invalid directory placement

Repository integrity SHALL be verified through Repository Validation.

---

End of Chapter

---

# 6. Naming Convention

## Purpose

This chapter defines the canonical naming convention for repository artifacts.

Repository naming applies only to repository organization.

Naming of Runtime objects, Production objects, and other Canonical Specifications remains governed by their originating specifications.

---

## General Rules

Repository names SHALL:

- be deterministic
- be human-readable
- be machine-readable
- remain platform-independent

---

## File Naming

The canonical file format is:

<Artifact>_v<Version>_<Classification>.<Extension>

Example:

AIOS_Core_v4.3_SSOT.md

---

## Directory Naming

Directory names SHOULD use:

Title_Case_With_Underscores

Examples:

Prompt_Standards/

Knowledge/

Releases/

---

## Version Naming

Version identifiers SHOULD follow semantic versioning.

Examples:

v1.0

v1.1

v4.3

---

## Reserved Names

The following names are reserved:

Core

Runtime

Production

Repository

Templates

QC

Export

Knowledge

Workspace

Releases

Archive

Reserved names SHALL NOT be reused for unrelated domains.

---

## Validation

Repository Validation SHALL verify compliance with this chapter.

---

End of Chapter

---

# 7. Version Organization

## Purpose

This chapter defines how versions of repository artifacts are organized.

Version semantics remain governed by the originating Canonical Specification.

The Repository defines only version organization.

---

## Version Preservation

Every released version SHALL be preserved.

Released versions SHALL NOT be overwritten.

Superseded versions SHALL remain accessible through the Archive domain.

---

## Version Separation

Different versions of the same artifact SHALL remain distinguishable.

Repository organization SHALL prevent ambiguity between versions.

---

## Canonical Version

For every artifact, exactly one version SHALL be designated as the current canonical release.

Previous versions SHALL remain historical records.

---

## Version Metadata

Repository metadata SHOULD include:

- Version Identifier
- Release Status
- Publication Date
- Classification

The Repository SHALL preserve version metadata.

---

## Validation

Repository Validation SHALL verify:

- version uniqueness
- version consistency
- canonical version designation
- metadata completeness

---

End of Chapter

---

# 8. Release Organization

## Purpose

This chapter defines how official AIOS releases are organized within the Repository.

Release procedures remain governed by AIOS Production and AIOS Export Specification.

The Repository defines only release storage.

---

## Release Package

Each official release SHALL be stored as a Release Package.

A Release Package SHOULD contain:

- Released Specifications
- Supporting Documentation
- Release Metadata
- Release Notes

---

## Release Directory

Official releases SHALL reside exclusively within:

Releases/

Release artifacts SHALL NOT be stored within Workspace.

---

## Release Integrity

Released packages SHALL remain immutable.

Corrections SHALL be published as a new release.

---

## Release Metadata

Each release SHOULD include:

- Release Identifier
- Version
- Release Date
- Status
- Compatibility Information

---

## Validation

Repository Validation SHALL verify:

- package completeness
- metadata presence
- directory compliance
- release integrity

---

End of Chapter

---

# 9. Knowledge Package Organization

## Purpose

This chapter defines repository organization for AIOS Knowledge Packages.

Knowledge construction remains outside the scope of this specification.

---

## Knowledge Domain

Knowledge Packages SHALL reside within:

Knowledge/

Knowledge Packages SHALL be derived from approved Canonical Specifications.

---

## Canonical Source

Knowledge Packages SHALL reference Canonical Specifications.

Knowledge Packages SHALL NOT become authoritative specifications.

The originating Canonical Specification SHALL remain the Single Source of Truth.

---

## Knowledge Structure

Knowledge Packages MAY contain:

- compiled documentation
- deployment resources
- indexes
- supporting metadata

Knowledge organization SHALL preserve traceability.

---

## Repository Responsibility

The Repository SHALL organize Knowledge Packages.

The Repository SHALL NOT define knowledge behavior.

---

## Validation

Repository Validation SHALL verify:

- canonical references
- directory placement
- metadata completeness

---

End of Chapter

---

# 10. Archive Organization

## Purpose

This chapter defines repository organization for archived artifacts.

Archive policies remain governed by the originating Canonical Specification where applicable.

---

## Archive Domain

Archived artifacts SHALL reside within:

Archive/

---

## Archive Eligibility

Artifacts MAY be archived when:

- superseded by a newer release
- formally retired
- replaced through approved revision

---

## Archive Integrity

Archived artifacts SHALL preserve:

- original identity
- original version
- original metadata

Archived artifacts SHALL NOT be modified.

---

## Archive Accessibility

Archived artifacts SHOULD remain discoverable for:

- auditing
- historical reference
- compatibility analysis

---

## Validation

Repository Validation SHALL verify:

- archive placement
- metadata preservation
- identity preservation

---

End of Chapter

---

# 11. Repository Validation

## Purpose

This chapter defines the validation requirements for repository organization.

Repository Validation verifies repository compliance only.

Runtime validation remains governed by AIOS Runtime.

Production validation remains governed by AIOS Production.

---

## Validation Scope

Repository Validation SHALL verify:

- repository layout
- directory structure
- storage organization
- naming convention
- version organization
- release organization
- archive organization
- repository metadata

Repository Validation SHALL NOT validate Runtime execution or Production workflow.

---

## Validation Categories

Repository Validation consists of:

- Layout Validation
- Directory Validation
- Naming Validation
- Version Validation
- Release Validation
- Archive Validation
- Metadata Validation
- Reference Validation

---

## Layout Validation

Layout Validation SHALL verify:

- canonical repository root
- required top-level directories
- prohibited top-level directories
- repository structure compliance

---

## Directory Validation

Directory Validation SHALL verify:

- directory placement
- domain separation
- reserved directory names
- directory integrity

---

## Naming Validation

Naming Validation SHALL verify:

- filename compliance
- directory naming compliance
- reserved names
- version identifier format

---

## Version Validation

Version Validation SHALL verify:

- version uniqueness
- canonical release designation
- release consistency
- archive consistency

---

## Release Validation

Release Validation SHALL verify:

- release package organization
- release metadata
- release completeness
- release integrity

---

## Archive Validation

Archive Validation SHALL verify:

- archive placement
- archive metadata
- archive identity
- archive integrity

---

## Metadata Validation

Metadata Validation SHALL verify:

- required metadata fields
- metadata consistency
- object identity
- repository references

---

## Reference Validation

Repository references SHALL:

- resolve correctly
- reference canonical artifacts
- avoid duplicate authoritative sources

Broken references SHALL fail validation.

---

## Validation Result

Validation SHALL produce one of the following states:

PASS

WARNING

FAIL

A FAIL result indicates repository non-compliance.

---

## Compliance

A repository implementation conforms to this specification when all mandatory validation requirements PASS.

---

End of Chapter

---

# 12. References

## Purpose

This chapter defines the normative references used by the AIOS Repository.

Repository SHALL derive concepts from Canonical Specifications.

Repository SHALL NOT redefine those concepts.

---

## Canonical References

The following specifications are normative:

- AIOS Core v4.3 SSOT
- AIOS Runtime v1.2
- AIOS Production v4.4

---

## Derived References

The following specifications are related supporting documents:

- AIOS Prompt Standards v1.3
- AIOS Templates v1.2
- AIOS QC Manual v1.2
- AIOS Export Specification v1.2

These documents SHALL NOT override the Canonical Specifications.

---

## Cross-Reference Policy

Where a concept is defined by a Canonical Specification:

- the Repository SHALL reference it;
- the Repository SHALL NOT duplicate it;
- the Repository MAY describe its repository-specific application.

---

## Conflict Resolution

If a conflict exists between this specification and a Canonical Specification:

1. AIOS Core SHALL prevail.
2. AIOS Runtime SHALL prevail within runtime scope.
3. AIOS Production SHALL prevail within production scope.
4. This Repository Specification SHALL be updated accordingly.

---

End of Chapter

# Appendix A — Canonical Repository Tree

This appendix illustrates the canonical repository organization.

```
AIOS/
│
├── Core/
│   └── AIOS_Core_v4.3_SSOT.md
│
├── Runtime/
│   └── AIOS_Runtime_v1.2.md
│
├── Production/
│   └── AIOS_Production_v4.4.md
│
├── Repository/
│   └── AIOS_Repository_v1.2.md
│
├── Prompt_Standards/
│   └── AIOS_Prompt_Standards_v1.3.md
│
├── Templates/
│   └── AIOS_Templates_v1.2.md
│
├── QC/
│   └── AIOS_QC_Manual_v1.2.md
│
├── Export/
│   └── AIOS_Export_Specification_v1.2.md
│
├── Knowledge/
│
├── Workspace/
│
├── Releases/
│
└── Archive/
```

The canonical repository structure SHALL remain deterministic.

End of Appendix A.

---

# Appendix B — Directory Examples

This appendix provides non-normative examples of repository organization.

## Example 1

```
Knowledge/

├── AIOS_Baseline_v1.0/

├── GPT_Knowledge/

└── Release_Package/
```

---

## Example 2

```
Releases/

├── v1.0/

├── v1.1/

└── v2.0/
```

---

## Example 3

```
Archive/

├── Core/

├── Runtime/

├── Production/

└── Repository/
```

These examples are illustrative only.

End of Appendix B.

---

# Appendix C — Naming Examples

The following examples comply with the Repository Naming Convention.

## Specifications

```
AIOS_Core_v4.3_SSOT.md

AIOS_Runtime_v1.2.md

AIOS_Production_v4.4.md

AIOS_Repository_v1.2.md
```

---

## Supporting Specifications

```
AIOS_Prompt_Standards_v1.3.md

AIOS_Templates_v1.2.md

AIOS_QC_Manual_v1.2.md

AIOS_Export_Specification_v1.2.md
```

---

## Release Packages

```
AIOS_Baseline_v1.0_RELEASE.zip

AIOS_Baseline_v1.1_RELEASE.zip
```

---

## Knowledge Packages

```
AIOS_Knowledge_v1.0.zip

AIOS_GPT_Knowledge_v1.0.zip
```

End of Appendix C.

---

# Appendix D — Repository Validation Checklist

Repository Validation SHALL verify the following items.

| Category | Validation |
|----------|------------|
| Repository Root | PASS |
| Directory Structure | PASS |
| Reserved Directories | PASS |
| Naming Convention | PASS |
| Version Organization | PASS |
| Release Organization | PASS |
| Knowledge Organization | PASS |
| Archive Organization | PASS |
| Metadata Completeness | PASS |
| Cross References | PASS |
| Canonical References | PASS |

A repository implementation SHALL satisfy every mandatory validation item.

End of Appendix D.

---

# Appendix E — Glossary

## Canonical Specification

An authoritative AIOS specification.

---

## Derived Specification

A specification that derives its authority from Canonical Specifications.

---

## Repository

The canonical storage organization for AIOS artifacts.

---

## Repository Object

Any artifact managed by the Repository.

---

## Release Package

A published collection of approved AIOS artifacts.

---

## Knowledge Package

A deployment package derived from approved AIOS specifications.

---

## Archive

The storage domain containing superseded or historical artifacts.

---

## Workspace

The storage domain containing active development artifacts.

---

## Canonical Reference

A reference to the authoritative specification defining a concept.

End of Appendix E.

---

# Final Lock Statement

AIOS Repository v1.2 SSOT is a Derived Specification.

This document defines only the canonical organization of AIOS repository artifacts.

This document SHALL NOT redefine:

- AIOS Core
- AIOS Runtime
- AIOS Production

This document SHALL reference Canonical Specifications whenever a concept already exists.

This document SHALL remain limited to repository organization.

Future revisions SHALL preserve compatibility with the Canonical Specifications unless those specifications explicitly require otherwise.

END OF SPECIFICATION

---
