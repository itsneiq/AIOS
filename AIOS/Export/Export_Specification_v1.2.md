# AIOS Export Specification v1.1 SSOT

**Status:** Single Source of Truth (SSOT)

**Version:** 1.1

**Classification:** Derived Specification

**Authority:** AIOS Core v4.3 SSOT

---

# Front Matter

## Document Purpose

This document defines the official export standards for AIOS artifacts.

It specifies how production outputs shall be packaged, validated, named, and released.

This document SHALL NOT redefine any architecture from AIOS Core, Runtime, or Production.

Whenever architectural behavior is required, this specification SHALL reference the authoritative SSOT.

---

# Part I — Purpose

## Objectives

The Export Specification standardizes:

- Export formats
- Packaging
- Directory structure
- Naming conventions
- Metadata
- Validation
- Release outputs

Its objective is to ensure every exported AIOS package is deterministic, reproducible, and version-compatible.

---

# Part II — Normative References

This specification derives its authority from:

- AIOS Core v4.3 SSOT
- AIOS Runtime v1.1 SSOT
- AIOS Production v4.3 SSOT
- AIOS Repository v1.1 SSOT
- AIOS Prompt Standards v1.2 SSOT
- AIOS Templates v1.1 SSOT
- AIOS QC Manual v1.1 SSOT

Whenever conflicts occur, the authoritative order SHALL follow AIOS Core.

---

# Part III — Export Architecture

Export SHALL occur only after production artifacts have successfully passed Quality Control.

```
Repository
        │
        ▼
 Validation
        │
        ▼
 Packaging
        │
        ▼
 Export
        │
        ▼
 Release
```

Export SHALL NOT modify production artifacts.

Export SHALL be read-only.

---

# Part IV — Export Standards

## Supported Outputs

- Markdown (.md)
- PDF (.pdf)
- Knowledge Package
- Release Bundle

Every export SHALL preserve:

- content
- hierarchy
- identifiers
- version information

No export format may alter semantic meaning.

---

# Part V — Packaging Specification

A release package SHOULD contain:

```
Release/

Core/

Runtime/

Production/

Repository/

Templates/

QC/

Export/

Knowledge/

README.md

CHANGELOG.md
```

Each package SHALL be self-contained.

---

# Part VI — File Naming & Directory Standard

Recommended naming:

```
AIOS_Core_v4.3_SSOT.md

AIOS_Runtime_v1.1_SSOT.md

AIOS_Production_v4.3_SSOT.md
```

General convention:

```
<Name>_v<Version>_SSOT.ext
```

Directory hierarchy SHALL remain stable across releases.

---

# Part VII — Metadata Specification

Each exported document SHALL contain:

- Title
- Version
- Status
- Authority
- Classification
- Last Updated

Optional metadata:

- Release ID
- Author
- Build Timestamp

---

# Part VIII — Output Format Specification

## Markdown

Markdown SHALL preserve:

- headings
- numbering
- code blocks
- diagrams
- tables

No renderer-specific syntax SHALL be required.

### PDF

PDF SHALL preserve:

- pagination
- headings
- diagrams
- tables
- typography

Generated PDF SHALL match the Markdown source semantically.

### Knowledge Package

Knowledge packages SHALL contain only approved SSOT documents.

Temporary files SHALL NOT be included.

Patch files SHALL NOT be included.

---

# Part IX — Validation & Integrity

Before release, every export SHALL pass:

- File completeness
- Metadata validation
- Reference validation
- Version validation
- Naming validation
- Packaging validation

Any failed validation SHALL prevent release.

---

# Part X — Version Compatibility

Every exported artifact SHALL declare its compatible AIOS version.

Example:

```
Core v4.3

Runtime v1.1

Production v4.3

Repository v1.1
```

Mixed incompatible versions SHALL NOT be packaged together.

---

# Appendix A — Export Examples

Example:

```
Release_v1.1/

AIOS_Core_v4.3_SSOT.pdf

AIOS_Runtime_v1.1_SSOT.pdf

AIOS_Production_v4.3_SSOT.pdf

AIOS_Repository_v1.1_SSOT.pdf

README.md
```

---

# Appendix B — Release Checklist

Before publishing:

- Core locked
- Runtime locked
- Production locked
- Repository validated
- Templates validated
- QC completed
- Export validated
- Version verified
- PDF generated
- Markdown generated
- Knowledge package verified

Release MAY proceed only after all checklist items are complete.

---

# Final Lock Statement

AIOS Export Specification v1.1 SSOT defines the official export behavior for AIOS documentation and production artifacts.

It SHALL NOT redefine AIOS Core, Runtime, or Production.

All export implementations SHALL conform to this specification.

END OF SPECIFICATION