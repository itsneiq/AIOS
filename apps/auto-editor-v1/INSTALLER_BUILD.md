# AIOS Auto Editor — Windows Installer Build

## Automated build through GitHub Actions

The repository includes the workflow:

`.github/workflows/auto-editor-windows-installer.yml`

It runs when:

- Auto Editor files are changed in a pull request.
- Auto Editor files are pushed to `main`.
- The workflow is started manually from the GitHub Actions page.

## Downloading the installer

1. Open the repository on GitHub.
2. Open **Actions**.
3. Select **AIOS Auto Editor Windows Installer**.
4. Open a successful workflow run.
5. Download the artifact named **AIOS-Auto-Editor-Windows-Installer**.
6. Extract the ZIP and run the generated `.exe` setup file.

Artifacts are retained for 14 days.

## Local build

From `apps/auto-editor-v1/`:

```bat
setup-desktop-windows.bat
build-installer-windows.bat
```

The local installer output is written to `apps/auto-editor-v1/dist/`.

## Current requirement

The installer packages the AIOS desktop application, but FFmpeg must still be available in the Windows PATH. The application reports **FFmpeg belum ada** when this requirement is missing.

Bundling FFmpeg directly into the installer is a separate milestone because binary source, license notices, download size, and update strategy must be locked first.
