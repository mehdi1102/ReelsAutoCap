# Caption Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make generated captions respect the selected language, avoid false music captions, keep captions inside the visible video frame, and make editor actions verifiably functional.

**Architecture:** Keep Flask responsible for transcription policy and timeline sanitation. Put the pure displayed-video geometry calculation in a focused browser utility so it can be tested without a video element; the editor uses that result for overlay placement, sizing, and dragging.

**Tech Stack:** Python 3, Flask, SpeechRecognition, vanilla JavaScript, Node built-in test runner.

## Global Constraints

- The selected language is an explicit user choice and must not fall back to Urdu results.
- Standard captions must not infer music merely from failed speech recognition.
- Caption positions must be calculated against the actual visible `object-fit: contain` video area.
- Preserve existing user worktree changes and do not require a cloud API for regression tests.

---

### Task 1: Lock transcription language and music behavior

**Files:**
- Create: `tests/test_transcription_regressions.py`
- Modify: `app.py`

**Interfaces:**
- Consumes: `recognition_language_candidates(language) -> list[str]`, `transcribe_free_engine(audio_bytes, language) -> list[dict]`.
- Produces: language-specific Google recognition candidates and only speech segments for unrecognised Standard-mode audio.

- [ ] **Step 1: Write failing tests**

```python
def test_explicit_language_only_uses_that_recognizer_locale():
    assert app.recognition_language_candidates('en-US') == ['en-US']
    assert app.recognition_language_candidates('es-ES') == ['es-ES']

def test_loud_unrecognised_speech_does_not_become_music(monkeypatch):
    monkeypatch.setattr(app, 'recognize_sample_variants', raise_unknown_value)
    subtitles = app.transcribe_free_engine(build_loud_wav(), 'en-US')
    assert subtitles == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m unittest tests.test_transcription_regressions -v`
Expected: explicit language test receives fallback locales; loud unrecognised audio creates a music segment.

- [ ] **Step 3: Write the minimal implementation**

```python
def recognition_language_candidates(language):
    lang = (language or 'en-US').strip()
    if wants_roman_urdu(lang):
        return ['en-US', 'hi-IN', 'ur-PK']
    if lang == 'auto':
        return ['en-US']
    return [lang]
```

Remove the `music_caption_segment(...)` branch in `transcribe_free_engine`'s `UnknownValueError` handler.

- [ ] **Step 4: Run the transcription regression suite**

Run: `python -m unittest tests.test_transcription_regressions -v`
Expected: all tests pass.

### Task 2: Test visible-frame geometry and overlay controls

**Files:**
- Create: `static/caption-geometry.js`
- Create: `tests/caption_geometry.test.js`
- Modify: `static/index.html`
- Modify: `static/app.js`
- Modify: `static/style.css`

**Interfaces:**
- Consumes: `CaptionGeometry.getContainedFrame(wrapperWidth, wrapperHeight, videoWidth, videoHeight)`.
- Produces: `{ left, top, width, height }` displayed-video bounds used by overlay, safe guide, drag conversion, and caption fitting.

- [ ] **Step 1: Write failing geometry test**

```js
assert.deepEqual(
  CaptionGeometry.getContainedFrame(1080, 608, 1080, 1920),
  { left: 369, top: 0, width: 342, height: 608 }
);
```

- [ ] **Step 2: Run it to verify failure**

Run: `node --test tests/caption_geometry.test.js`
Expected: module or function is missing.

- [ ] **Step 3: Implement geometry utility and use it**

```js
function getContainedFrame(wrapperWidth, wrapperHeight, videoWidth, videoHeight) {
  const scale = Math.min(wrapperWidth / videoWidth, wrapperHeight / videoHeight);
  const width = videoWidth * scale;
  const height = videoHeight * scale;
  return { left: (wrapperWidth - width) / 2, top: (wrapperHeight - height) / 2, width, height };
}
```

Update the overlay and safe-zone boundaries from this frame; translate custom drag coordinates through the same frame. Refresh bounds after layout selection, media metadata, resize, and before caption fit.

- [ ] **Step 4: Run browser-side unit test**

Run: `node --test tests/caption_geometry.test.js`
Expected: all tests pass.

### Task 3: Restore functional editor actions and default language

**Files:**
- Modify: `static/index.html`
- Modify: `static/app.js`
- Create: `tests/caption_editor_actions.test.js`

**Interfaces:**
- Consumes: normalized caption segments and `CaptionGeometry`.
- Produces: tested Smart Polish, Split Long, and Auto Place actions; default `en-US` selection while retaining an explicit Roman Urdu mode.

- [ ] **Step 1: Write failing action-level tests**

```js
test('split long produces time ordered readable segments', () => {
  const result = splitLongCaptionSegments([{ start: 0, end: 4, text: 'one two three four five six seven eight nine' }]);
  assert.equal(result.length, 2);
  assert.ok(result[0].end <= result[1].start);
});
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `node --test tests/caption_editor_actions.test.js`
Expected: test cannot access a standalone implementation.

- [ ] **Step 3: Extract pure caption action helpers and wire UI controls**

Ensure every action always restores its enabled state in `finally`, updates cards/timeline/overlay, and shows an error toast instead of silently failing. Make English (`en-US`) the fresh-install default and preserve an existing explicit language choice.

- [ ] **Step 4: Run tests**

Run: `node --test tests/caption_editor_actions.test.js`
Expected: all tests pass.

### Task 4: Full verification

**Files:**
- Verify: `app.py`, `static/index.html`, `static/app.js`, `static/style.css`, `tests/`

- [ ] **Step 1: Run all regression checks**

Run: `python -m unittest discover -s tests -p 'test_*.py' -v`
Run: `node --test tests/*.test.js`
Run: `python -m py_compile app.py`
Run: `node --check static/app.js`
Run: `git diff --check`

- [ ] **Step 2: Run the local server smoke check**

Run: `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5000/ | Select-Object -ExpandProperty StatusCode`
Expected: `200`.

