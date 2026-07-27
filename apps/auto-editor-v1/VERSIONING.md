# AIOS Auto Editor Versioning

AIOS Auto Editor follows Semantic Versioning:

- Patch: `v0.1.1` for backward-compatible bug fixes.
- Minor: `v0.2.0` for backward-compatible features.
- Major: `v1.0.0` for a stable public release or breaking changes.

The version in `package.json` and the Git tag must match.

Example first release:

```text
package.json: 0.1.0
Git tag:      v0.1.0
```

Release checklist:

1. Update the package version.
2. Merge the release changes into `main`.
3. Create the matching `vX.Y.Z` tag from `main`.
4. Confirm the Windows installer workflow succeeds.
5. Test the installer attached to the GitHub Release.
