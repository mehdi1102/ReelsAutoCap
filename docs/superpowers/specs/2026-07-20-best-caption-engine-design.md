# Best Caption Engine Design

## Goal
Improve caption accuracy by adding an explicit Best Captions mode that can compare available engines while preserving exact user language choices.

## Product Rules
- A specific language selection is a hard constraint. If the user selects English, Roman Urdu, Urdu Script, Hindi, or another language, the caption pipeline must not switch to a different language.
- The `auto` language option is the only mode where the system may decide which language/script best fits the reel.
- Roman Urdu / Hinglish always means Latin/Roman script captions only. Urdu-Arabic script output must not become the final caption result.
- Users can still choose a specific transcription engine for speed, cost, or offline control.

## Caption Engine Design
- Add `best` as a transcription engine option.
- If `best` is selected and an API key is present, run Gemini, local Whisper, and Google free captions where available.
- If `best` is selected and no API key is present, run local Whisper and Google free captions only.
- Each engine result is cleaned, validated against language/script rules, and scored.
- The first implementation picks the strongest complete engine result and merges only clear non-overlapping missing speech from other engines.
- The API returns subtitles plus a lightweight `engineResults` summary with engines run, skipped, failed, selected, and warnings.

## Editor Design
- Add a Best Captions option to the method dropdown.
- Keep specific engine choices visible.
- Clarify that language Auto allows automatic language detection, while specific languages are respected exactly.
- Surface Best Captions warnings/status after generation without blocking editing.

## Testing
- Add regression tests for `best` engine eligibility with and without an API key.
- Add regression tests proving Roman Urdu rejects Urdu-script output from candidate engines.
- Add frontend contract tests for the new dropdown option and Auto language copy.
