# AIOS Windows Release Checklist

Use this checklist for every release candidate and stable Windows release.

## Automated validation

- [ ] `npm ci`
- [ ] `npm run check`
- [ ] `npm run qa:release`
- [ ] `npm run dist`
- [ ] Windows QA workflow is green
- [ ] Installer artifact is available from GitHub Actions

## Installer smoke test

- [ ] Install on a clean Windows user account
- [ ] Installation directory can be changed
- [ ] Desktop shortcut is created
- [ ] Start Menu shortcut is created
- [ ] Application launches without a terminal window
- [ ] Upgrade over the previous version preserves user data
- [ ] Uninstall removes application files without deleting user projects unexpectedly

## Editor smoke test

- [ ] Create a new project
- [ ] Import MP4 and MOV media
- [ ] Trim, split, move, copy, paste, undo, and redo clips
- [ ] Save and reopen a project
- [ ] Recover an autosaved session after forced termination
- [ ] Relink offline media without changing media IDs
- [ ] Verify large-project warning and timeline responsiveness

## Export smoke test

- [ ] Export 9:16, 16:9, and 1:1 videos
- [ ] Export at 30 FPS and 60 FPS
- [ ] Export Fast, Balanced, and High quality presets
- [ ] Cancel an active export
- [ ] Retry the previous export manifest
- [ ] Open the rendered result
- [ ] Open the FFmpeg diagnostics log
- [ ] Confirm partial output and temporary files are cleaned after failure

## Release metadata

- [ ] Version updated in `package.json`
- [ ] Release notes completed
- [ ] Installer filename contains the expected version
- [ ] Installer checksum recorded
- [ ] Known limitations documented
- [ ] Release candidate approved before publishing stable
