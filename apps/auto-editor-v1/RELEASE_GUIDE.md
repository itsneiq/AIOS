# AIOS Auto Editor — GitHub Release Guide

## What happens automatically

Every pull request and relevant push builds a Windows installer artifact for testing.

A public GitHub Release is created only when a version tag beginning with `v` is pushed, for example:

```text
v0.1.0
```

The release workflow then:

1. Checks out the tagged source code.
2. Installs Node.js dependencies.
3. Validates JavaScript syntax.
4. Builds the Windows NSIS installer.
5. Verifies at least one `.exe` exists.
6. Uploads temporary workflow artifacts.
7. Creates a GitHub Release with generated release notes.
8. Attaches the installer files to that release.

## First release: v0.1.0

After the release workflow PR is merged into `main`, create the first release tag from the latest `main` commit.

From GitHub:

1. Open the repository.
2. Open **Releases**.
3. Choose **Draft a new release**.
4. Choose **Create new tag**.
5. Enter `v0.1.0`.
6. Target branch: `main`.
7. Publish the release.

Publishing the tag starts the Windows installer workflow. The workflow will attach the generated installer to the release.

## Future versions

- Bug fix: `v0.1.1`
- New backward-compatible features: `v0.2.0`
- Stable major release: `v1.0.0`

Never reuse an existing release tag for different code. Create a new version tag instead.

## Download location

Users download the newest public version from the repository's **Releases** page or **Latest release** link.

## Current limitation

FFmpeg is not yet bundled with the installer. The target Windows computer must still have FFmpeg and FFprobe available in PATH.
