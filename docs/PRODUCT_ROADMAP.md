# AIOS Product Roadmap

This document defines the product-development direction for AIOS Auto Editor after the Windows desktop runtime and batch production foundation became operational.

## Current Foundation — Completed

- Windows desktop application with Electron packaging and NSIS installer.
- Local batch video production server.
- Media scanning, production queue, and progress tracking.
- FFmpeg-based vertical video rendering.
- Hook, benefit, and CTA subtitle generation.
- Basic Windows voice-over fallback.
- Optional background music.
- Autosave and session recovery.
- Guided media relinking.
- Export recovery and diagnostics.
- Large-project performance guard.
- Windows QA, packaging validation, and release-readiness workflow.

Validated baseline:

`Install → Launch → Scan → Produce → Render → Export`

## Product Principle

AIOS must evolve from a batch editor into an end-to-end affiliate content production system.

Priority order:

1. Publishable output quality.
2. Marketing intelligence.
3. Automated smart editing.
4. Affiliate campaign automation.
5. Multi-platform creative-studio workflows.

## Sprint 2 — AI Intelligence

Goal: improve the intelligence and publishability of every generated video.

### AI Voice Engine v2

Highest priority based on Windows UAT. Windows System Speech remains only as an offline fallback.

Planned providers:

- Edge Neural TTS as recommended default.
- Windows System Speech as offline fallback.
- OpenAI TTS as optional provider.
- ElevenLabs as optional premium provider.

Planned controls:

- Provider and Indonesian voice selection.
- Voice preview.
- Speaking-rate control.
- Natural, cheerful, energetic, soft, luxury, sales, and UGC styles.
- Secure provider configuration.
- Graceful fallback behavior.

Acceptance criteria:

- Indonesian output sounds natural enough for affiliate content.
- Provider failure does not block rendering when fallback is enabled.
- Voice settings persist per project or template.

### Marketing Analyzer

- Identify product category and buyer intent.
- Generate differentiated marketing angles.
- Produce hooks, benefits, objections, and CTAs.
- Avoid repeated copy across a batch.
- Support TikTok, Shopee, Meta, and YouTube Shorts writing styles.

### AI Script Engine

- Generate multiple script variants per product.
- Control tone, length, audience, and sales intensity.
- Produce hook, body, benefit, CTA, caption, and hashtags.
- Support manual editing and locked text fields.
- Store winning and rejected variants.

### Subtitle Planner

- Time subtitles against voice-over or source audio.
- Split sentences into readable phrases.
- Emphasize keywords, prices, benefits, and CTAs.
- Protect platform safe zones.
- Provide subtitle presets by platform and content type.

### Motion Planner

- Plan zoom, crop, pan, emphasis, and transitions by story function.
- Avoid excessive or repeated motion.
- Produce deterministic rendering instructions.

## Sprint 3 — Smart Editing

Goal: convert AI planning into repeatable editing behavior.

### Template Engine

- TikTok, Shopee Video, Meta Reels, YouTube Shorts, and Xiaohongshu-style templates.
- Template-controlled layout, subtitle style, motion, audio mix, CTA timing, and export settings.
- User-created templates.
- Versioned schema with backward compatibility.

### Auto Zoom and Reframing

- Dynamic zoom based on subject or product position.
- Smart 9:16 reframing.
- Face and product safe-area protection.
- Smooth-motion limits.

### Product Detection

- Detect the primary product region.
- Preserve product visibility during crop and zoom.
- Support product detail emphasis.

### Logo and Text Detection

- Protect logos and important source text from cropping.
- Avoid overlay collisions.
- Support optional highlight or masking rules.

### Motion Library

- Zoom, pan, punch-in, reveal, highlight, arrow, and focus effects.
- Presets grouped by purpose.
- Effect-intensity limits.

### Beat Sync and Sound Design

- Optional cut and motion alignment to music beats.
- Lightweight sound effects.
- Automatic voice-over ducking.
- Consistent loudness targets.

## Sprint 4 — Affiliate Automation

Goal: scale production from individual videos to structured campaigns.

### Spreadsheet Import

- Import product rows from CSV or Excel.
- Map product name, link, price, assets, audience, angle, and campaign fields.
- Validate incomplete rows before production.

### Product Analyzer

- Accept product links and supplied assets.
- Extract usable facts, benefits, pricing context, and review themes.
- Generate marketing angles and content plans.
- Preserve source attribution and avoid invented claims.

### Multi-Hook and Multi-CTA Production

- Generate controlled creative variants.
- Combine hooks, benefits, CTAs, voices, and templates without uncontrolled duplication.
- Track variant lineage in output metadata.

### Batch 100+

- Reliable queued production for 100 or more videos.
- Pause, resume, retry, and partial rerun.
- Resource throttling and disk-space checks.
- Persistent production manifests and diagnostics.

### Analytics and Learning

- Record creative configuration and output identifiers.
- Import performance metrics.
- Compare hooks, CTAs, templates, voices, and product angles.
- Store winning and failing patterns.

## Sprint 5 — AI Creative Studio

Goal: provide one workspace for planning and producing affiliate campaigns across platforms.

### Creative Brief Workspace

- Product, audience, platform, objective, constraints, and references.
- Recommended creative directions with approval checkpoints.

### Platform Creative Generator

- TikTok UGC.
- Shopee product video.
- Meta direct-response creative.
- YouTube Shorts formats.
- Xiaohongshu-inspired lifestyle creative.

### Campaign Variant Builder

- Generate coordinated variants without losing product identity.
- Balance quality, cost, and production speed.
- Package outputs by campaign and platform.

### Asset and Template Management

- Product asset registry.
- Character and voice profiles.
- Brand kits.
- Approved templates and reusable creative rules.

### End-to-End Target Workflow

`Product Input → Product Analysis → Marketing Angles → Script Variants → Voice → Smart Edit → Batch Render → Export Package → Performance Learning`

## Delivery Rules

- Each major feature is delivered through a focused pull request.
- Runtime and export stability must not regress.
- Every provider integration requires failure handling and explicit configuration.
- Product claims must remain grounded in supplied or verified information.
- New rendering behavior should have deterministic tests where practical.
- Windows installer UAT remains a release gate.
- Windows speech becomes fallback-only after Neural TTS is available.

## Immediate Next Milestone

Begin Sprint 2 with AI Voice Engine v2.

Recommended implementation order:

1. Edge Neural TTS provider and Indonesian voice selection.
2. Voice preview and persisted settings.
3. Natural speaking-rate and style controls.
4. Windows voice fallback.
5. Provider abstraction for OpenAI and ElevenLabs.
6. Voice-engine regression tests and packaged Windows UAT.
