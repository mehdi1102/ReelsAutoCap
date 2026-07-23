# Best Caption Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Best Captions engine mode that combines available providers while preserving selected language and Roman Urdu script rules.

**Architecture:** Implement backend orchestration in `app.py` without restructuring the app. Add small frontend contract changes in `static/index.html` and `static/app.js` so users can select Best Captions and understand language Auto.

**Tech Stack:** Flask, vanilla JavaScript, Python unittest, Node test runner.

## Global Constraints
- Specific language selections are hard constraints.
- Language `auto` is the only mode that may autodetect language/script.
- Roman Urdu / Hinglish final captions must use Latin/Roman script only.
- No new external dependencies.

---

### Task 1: Backend Best Captions Orchestrator

**Files:**
- Modify: `app.py`
- Test: `tests/test_transcription_regressions.py`

**Interfaces:**
- Produces: `transcribe_best_engine(audio_path, language, api_key=None, model='gemini-1.5-flash') -> dict`
- Produces: `validate_segments_for_language(segments, language) -> tuple[list, list]`
- Produces: `score_caption_result(segments, language) -> float`

- [ ] Write failing tests for Best Captions engine eligibility and Roman Urdu script rejection.
- [ ] Run `python -m unittest tests.test_transcription_regressions` and confirm failure.
- [ ] Implement orchestration, validation, scoring, and metadata.
- [ ] Run backend tests and confirm pass.

### Task 2: API Metadata Preservation

**Files:**
- Modify: `app.py`
- Test: `tests/test_transcription_regressions.py`

**Interfaces:**
- Produces API JSON shape `{ "subtitles": [...], "engineResults": {...} }` for best mode.
- Specific modes keep returning usable `subtitles`.

- [ ] Write failing endpoint test for `engine=best`.
- [ ] Run targeted unittest and confirm failure.
- [ ] Update `/api/transcribe` and long-video job path to unwrap best-mode results.
- [ ] Run backend tests and confirm pass.

### Task 3: Frontend Controls and Status

**Files:**
- Modify: `static/index.html`
- Modify: `static/app.js`
- Test: `tests/test_frontend_caption_contract.py`

**Interfaces:**
- Consumes API `engineResults` summary.
- Produces visible Best Captions dropdown option and Auto language explanatory copy.

- [ ] Write failing frontend contract tests for Best Captions and Auto language copy.
- [ ] Run frontend contract unittest and confirm failure.
- [ ] Add dropdown option and status handling.
- [ ] Run Python and Node tests and confirm pass.
