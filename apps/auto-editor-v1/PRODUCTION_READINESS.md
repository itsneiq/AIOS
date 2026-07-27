# AIOS Auto Editor — Production Readiness Checklist

## Required Windows setup

- Windows 10 or newer
- FFmpeg and FFprobe available in PATH
- At least 5 GB free disk space for test exports

## Smoke test

1. Run `setup-desktop-windows.bat`.
2. Run `start-desktop-windows.bat`.
3. Confirm system status shows **Sistem siap**.
4. Choose an input folder containing at least one supported video.
5. Choose an output folder.
6. Click **Scan** and confirm the queue is populated.
7. Click **Start Production**.
8. Confirm controls lock while rendering.
9. Confirm queue and overall progress update.
10. Confirm the output video can be opened from the queue.
11. Close and reopen AIOS; settings and queue must remain available.

## Cancellation test

1. Start a render with a video longer than 30 seconds.
2. Click **Stop** while rendering.
3. Confirm the app returns to an idle state.
4. Confirm unfinished items remain available for another run.

## Input matrix

Test at least one file from each relevant condition:

- MP4 vertical video
- MP4 horizontal video
- MOV video
- Video without audio
- 4K source video
- Filename containing spaces
- Empty input folder
- Missing output folder

## Installer test

1. Run `build-installer-windows.bat`.
2. Install the generated setup file from `dist/`.
3. Launch from the desktop shortcut.
4. Repeat the smoke test without opening Command Prompt.

## Acceptance gate

The desktop foundation is ready for the Python/FastAPI AI engine only after:

- No state-write errors occur in the installed build.
- Stop returns the interface to idle state.
- Output files open successfully.
- Settings survive an application restart.
- Empty or invalid folders show understandable errors instead of crashing.
