# AIOS Prompt Standards v1.3 — Prompt Intelligence Addendum

Status: Draft implementation addendum
Scope: Issues #1–#6
Authority: Derived from AIOS Core, Runtime, Production, and Prompt Standards. This addendum SHALL NOT redefine Core, Runtime, or Production.

---

## 1. Reference-Driven Prompting

Reference-driven prompting defines how AIOS prompts SHALL use external or user-provided references as grounded input.

### Rules

- References SHALL be treated as input evidence, not architectural authority.
- References SHALL NOT override AIOS Core, Runtime, Production, Prompt Standards, QC, or Export rules.
- A prompt SHALL preserve the observable facts of the supplied reference when the task depends on that reference.
- A prompt SHALL distinguish between reference facts, inferred interpretation, and creative extension.
- Missing or unclear reference details SHALL be surfaced instead of invented.
- When a reference conflicts with a locked asset or SSOT rule, the locked asset or SSOT rule SHALL take precedence.

### Reference Priority

1. AIOS Core authority.
2. Runtime and Production authority.
3. Prompt Standards and Templates.
4. Locked registries and asset records.
5. User-provided reference material.
6. User task instruction.
7. Model inference.

References MAY guide style, framing, layout, pacing, composition, or fidelity when those elements are not already locked by a higher-authority source.

---

## 2. Knowledge-Aware Prompting

Knowledge-aware prompting defines how AIOS prompts SHALL consume official knowledge documents, repository files, and SSOT materials.

### Rules

- Prompts SHALL use the highest-authority available knowledge source.
- Knowledge files SHALL be cited or referenced by document name when relevant to traceability.
- A prompt SHALL NOT silently merge conflicting knowledge sources.
- If knowledge is stale, incomplete, or inconsistent, the prompt SHALL either ask for clarification or proceed with a stated assumption only when allowed by Runtime.
- Knowledge-aware prompts SHALL preserve document ownership boundaries.

### Conflict Handling

When knowledge sources conflict, prompts SHALL resolve in this order:

1. AIOS Core.
2. AIOS Runtime.
3. AIOS Production.
4. AIOS Prompt Standards.
5. AIOS Templates.
6. AIOS Repository.
7. AIOS QC Manual.
8. AIOS Export Specification.
9. Case-specific or session-specific materials.

Lower-authority knowledge MAY supplement but SHALL NOT redefine higher-authority knowledge.

---

## 3. Registry-Driven Prompting

Registry-driven prompting defines how prompts SHALL consume structured AIOS registries.

### Supported Registries

- Character Registry.
- Product Registry.
- World Registry.
- Camera Registry.
- Lighting Registry.
- Audio Registry.
- Props Registry.
- Style Registry.
- Environment Registry.
- Chapter Registry.

### Rules

- Registry values marked as locked SHALL be preserved exactly.
- Prompts SHALL NOT mutate identity, geometry, dimensions, color, wardrobe, environment, camera, lighting, or continuity locks unless explicitly authorized by the relevant workflow.
- Missing registry data SHALL be marked as unset, pending, or director-defined according to Runtime and Production rules.
- Registry data SHALL be compiled before user-facing prompt output.
- Prompt output SHALL include only the registry details required for the target artifact.

---

## 4. Prompt Compilation

Prompt compilation is the process of converting AIOS source inputs into an executable prompt for a target generation or reasoning task.

### Compilation Inputs

Prompt compilation SHALL consider these inputs in order:

1. System and safety constraints.
2. AIOS Core authority.
3. Runtime behavior.
4. Production workflow rules.
5. Prompt Standards.
6. Templates.
7. Repository and case state.
8. Locked registries.
9. Reference materials.
10. User task instruction.
11. Output format requirement.

### Compilation Output

A compiled prompt SHALL include:

- task objective;
- required context;
- locked constraints;
- reference usage instruction;
- output format;
- validation or QC requirements;
- negative constraints where applicable.

### Conflict Rule

If two compilation inputs conflict, the higher-priority input SHALL prevail. The prompt SHALL NOT hide material conflicts when they affect output correctness.

---

## 5. Asset Consistency Rules

Asset consistency rules protect locked production assets across prompt outputs.

### Locked Asset Rule

When an asset is locked, prompts SHALL preserve:

- character identity and appearance;
- product geometry, dimensions, logo, materials, and colors;
- wardrobe and styling when locked;
- environment and world continuity;
- camera and lighting intent;
- prop placement and continuity;
- chapter timeline and dependency state.

### Prohibited Mutations

Prompts SHALL NOT:

- redesign a locked product;
- rename or replace a locked character;
- change locked wardrobe, colors, or proportions;
- add unapproved product features;
- remove required logos or identifiers;
- alter locked setting, mood, or continuity;
- infer missing locked values without marking them as assumptions.

### Missing Data

If required asset data is missing, the prompt SHALL use one of these states:

- `UNSET` — value is not available.
- `PENDING_LOCK` — value must be defined before final generation.
- `DIRECTOR_DEFINED` — Runtime or Director may define the value within allowed authority.

---

## 6. Prompt Resolution Order

The canonical prompt resolution order SHALL be:

1. Platform and model safety rules.
2. System instruction.
3. AIOS Core.
4. AIOS Runtime.
5. AIOS Production.
6. AIOS Prompt Standards.
7. AIOS Templates.
8. AIOS Repository state.
9. QC and Export requirements.
10. Locked asset registries.
11. Reference materials.
12. User instruction.
13. Model inference.
14. Formatting and delivery constraints.

Higher-authority layers SHALL NOT be overridden by lower-authority layers. Lower layers MAY refine, specialize, or instantiate higher layers only when no conflict exists.

---

## Issue Mapping

- Closes #1
- Closes #2
- Closes #3
- Closes #4
- Closes #5
- Closes #6
