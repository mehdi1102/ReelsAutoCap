import os
import json
import base64
import urllib.request
import urllib.error
import re
import math
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests

app = Flask(__name__, static_folder='static')
CORS(app)
TRANSCRIPTION_JOBS = {}
TRANSCRIPTION_JOBS_LOCK = threading.Lock()

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Serve the static files
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

import wave
import io
import struct
import speech_recognition as sr

MUSIC_MARKER = '\u266a \u266b \u266a'

EN_NUMBER_WORDS = {
    'zero': 0, 'oh': 0, 'o': 0,
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
    'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100,
}

UR_HI_NUMBER_WORDS = {
    'sifar': 0, 'zero': 0,
    'ek': 1, 'aik': 1, 'one': 1,
    'do': 2, 'dou': 2, 'two': 2,
    'teen': 3, 'tin': 3, 'three': 3,
    'char': 4, 'chaar': 4, 'four': 4,
    'panch': 5, 'paanch': 5, 'five': 5,
    'che': 6, 'chay': 6, 'chhe': 6, 'six': 6,
    'saat': 7, 'sat': 7, 'seven': 7,
    'aath': 8, 'ath': 8, 'eight': 8,
    'nau': 9, 'no': 9, 'nine': 9,
    'das': 10, 'dus': 10, 'ten': 10,
    'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14,
    'pandrah': 15, 'solah': 16, 'satrah': 17, 'atharah': 18,
    'unnees': 19, 'bees': 20, 'tees': 30, 'chalees': 40,
    'pachas': 50, 'saath': 60, 'sattar': 70, 'assi': 80, 'nabbe': 90,
}

def normalize_spoken_numbers(text, language='auto'):
    if not text:
        return text

    lang = (language or 'auto').lower()
    number_words = dict(EN_NUMBER_WORDS)
    if lang.startswith(('ur', 'hi', 'roman')) or 'hinglish' in lang:
        number_words.update(UR_HI_NUMBER_WORDS)

    pattern_words = sorted(number_words.keys(), key=len, reverse=True)
    phrase_pattern = re.compile(
        r'\b(?:' + '|'.join(re.escape(w) for w in pattern_words) + r')(?:[\s-]+(?:' +
        '|'.join(re.escape(w) for w in pattern_words) + r'))*\b',
        re.IGNORECASE
    )

    def parse_phrase(match):
        phrase = match.group(0)
        words = re.split(r'[\s-]+', phrase.lower().strip())
        values = [number_words.get(word) for word in words]
        if any(value is None for value in values):
            return phrase

        # Phone numbers, codes, OTPs and prices are often spoken digit-by-digit.
        if len(values) >= 2 and all(0 <= value <= 9 for value in values):
            return ''.join(str(value) for value in values)

        total = 0
        current = 0
        for word in words:
            if word == 'hundred':
                current = max(current, 1) * 100
            else:
                value = number_words[word]
                if value >= 20 and value % 10 == 0:
                    current += value
                elif value < 20:
                    current += value

        total += current
        if total > 0:
            return str(total)
        if len(values) == 1:
            return str(values[0])
        return phrase

    return phrase_pattern.sub(parse_phrase, text)

def wants_roman_urdu(language):
    lang = (language or 'auto').strip().lower()
    return lang in {'roman-ur-pk', 'roman-urdu', 'hinglish'} or lang.startswith('roman')

def contains_urdu_script(text):
    return bool(re.search(r'[\u0600-\u06ff]', str(text or '')))

def recognition_language_candidates(language):
    lang = (language or 'en-US').strip()
    if wants_roman_urdu(lang):
        # The standard recognizer cannot transliterate Urdu script reliably. Keeping this
        # Latin-script-only prevents a Roman Urdu request from silently returning Urdu text.
        return ['en-US']
    if lang == 'auto':
        return ['en-US']

    # A language selection is an explicit instruction, not a hint. Trying a different
    # locale here is what previously caused Spanish, English, and other selections to
    # come back as Urdu captions.
    return [lang]

def recognize_google_with_fallback(recognizer, audio, language):
    last_request_error = None
    best_candidate = None
    for lang_code in recognition_language_candidates(language):
        try:
            result = recognizer.recognize_google(audio, language=lang_code, show_all=True)
        except sr.RequestError as e:
            last_request_error = e
            continue

        if isinstance(result, dict):
            alternatives = result.get('alternative', [])
            if alternatives:
                def alt_score(alt):
                    transcript_value = str(alt.get('transcript', '')).strip()
                    confidence = float(alt.get('confidence', 0) or 0)
                    word_bonus = min(len(transcript_value.split()), 12) * 0.015
                    script_penalty = 0.45 if wants_roman_urdu(language) and contains_urdu_script(transcript_value) else 0
                    return confidence + word_bonus - script_penalty

                best_alt = max(alternatives, key=alt_score)
                transcript = best_alt.get('transcript', '').strip()
                if transcript:
                    candidate = {
                        'text': transcript,
                        'confidence': float(best_alt.get('confidence', 0) or 0),
                        'language': lang_code,
                        'score': alt_score(best_alt)
                    }
                    if not best_candidate or candidate['score'] > best_candidate['score']:
                        best_candidate = candidate
        elif isinstance(result, str) and result.strip():
            candidate = {
                'text': result.strip(),
                'confidence': 0,
                'language': lang_code,
                'score': (
                    min(len(result.strip().split()), 12) * 0.015 -
                    (0.45 if wants_roman_urdu(language) and contains_urdu_script(result) else 0)
                )
            }
            if not best_candidate or candidate['score'] > best_candidate['score']:
                best_candidate = candidate

    if best_candidate:
        return best_candidate

    if last_request_error:
        raise sr.RequestError(str(last_request_error))
    raise sr.UnknownValueError()

def music_caption_segment(start_sec, end_sec):
    return {
        'start': round(start_sec, 2),
        'end': round(end_sec, 2),
        'text': MUSIC_MARKER,
        'speaker': 'Music',
        'type': 'music'
    }

def clamp_pcm16(value):
    return max(-32768, min(32767, int(value)))

def build_wav_buffer(seg_samples, nchannels, sampwidth, framerate):
    seg_bytes = struct.pack(f"<{len(seg_samples)}h", *seg_samples)
    mem_file = io.BytesIO()
    seg_wav = wave.open(mem_file, 'wb')
    seg_wav.setnchannels(nchannels)
    seg_wav.setsampwidth(sampwidth)
    seg_wav.setframerate(framerate)
    seg_wav.writeframes(seg_bytes)
    seg_wav.close()
    mem_file.seek(0)
    return mem_file

def boosted_sample_variants(seg_samples, rms):
    variants = [seg_samples]
    if not seg_samples:
        return variants

    peak = max(abs(sample) for sample in seg_samples) or 1
    target_peak_gain = min(3.4, 26000 / peak)

    # Quiet or compressed speech often needs a lifted retry before recognition gives up.
    gains = []
    if rms < 900:
        gains.extend([1.8, 2.6, target_peak_gain])
    elif rms < 1800:
        gains.extend([1.45, target_peak_gain])
    elif target_peak_gain > 1.25:
        gains.append(target_peak_gain)

    for gain in dict.fromkeys(round(gain, 2) for gain in gains if gain > 1.05):
        variants.append(tuple(clamp_pcm16(sample * gain) for sample in seg_samples))
    return variants

def recognize_sample_variants(recognizer, seg_samples, nchannels, sampwidth, framerate, language, rms):
    last_error = None
    best_result = None
    for sample_variant in boosted_sample_variants(seg_samples, rms):
        mem_file = build_wav_buffer(sample_variant, nchannels, sampwidth, framerate)
        try:
            with sr.AudioFile(mem_file) as source:
                audio = recognizer.record(source)
            result = recognize_google_with_fallback(recognizer, audio, language)
            if result and result.get('text', '').strip():
                if not best_result or result.get('score', 0) > best_result.get('score', 0):
                    best_result = result
        except sr.UnknownValueError as e:
            last_error = e
            continue

    if best_result:
        best_result['text'] = best_result['text'].strip()
        return best_result

    raise last_error or sr.UnknownValueError()

def transcript_words(text):
    return re.findall(r"[\w']+", str(text or '').lower())

def is_probably_false_caption(text, confidence, duration, rms, avg_vol):
    words = transcript_words(text)
    if not words:
        return True

    joined = ' '.join(words)
    repeated_noise = len(words) >= 3 and len(set(words)) == 1
    too_long_for_window = duration < 0.55 and len(words) > 4
    very_low_confidence = confidence and confidence < 0.18
    unknown_confidence = confidence == 0
    loud_non_speech_risk = rms > max(avg_vol * 2.6, 1200)
    weak_short_guess = unknown_confidence and len(words) <= 2 and duration > 1.15 and loud_non_speech_risk
    junk_phrase = joined in {'thank you for watching', 'thanks for watching', 'subscribe', 'like and subscribe'}

    return repeated_noise or too_long_for_window or very_low_confidence or weak_short_guess or junk_phrase

def speech_segment(start_sec, end_sec, text, language, confidence=0, source_language=''):
    return {
        'start': round(start_sec, 2),
        'end': round(end_sec, 2),
        'text': normalize_spoken_numbers(text.strip(), language),
        'speaker': 'Speaker 1',
        'type': 'speech',
        'confidence': round(float(confidence or 0), 3),
        'sourceLanguage': source_language
    }
def ranges_overlap(start_a, end_a, start_b, end_b):
    return max(0, min(end_a, end_b) - max(start_a, start_b))

def timeline_gaps(duration, blocking_segments, min_gap=1.0):
    gaps = []
    cursor = 0.0
    for seg in sorted(blocking_segments, key=lambda item: item['start']):
        start = max(0.0, float(seg.get('start', 0)))
        end = min(duration, float(seg.get('end', start)))
        if start - cursor >= min_gap:
            gaps.append((cursor, start))
        cursor = max(cursor, end)

    if duration - cursor >= min_gap:
        gaps.append((cursor, duration))
    return gaps

def segment_similarity(a, b):
    words_a = set(re.findall(r'\w+', str(a or '').lower()))
    words_b = set(re.findall(r'\w+', str(b or '').lower()))
    if not words_a or not words_b:
        return 0
    return len(words_a & words_b) / max(len(words_a | words_b), 1)

def clean_subtitle_timeline(segments):
    cleaned = []
    for seg in sorted(segments, key=lambda item: (float(item.get('start', 0)), float(item.get('end', 0)))):
        text = str(seg.get('text', '')).strip()
        if not text:
            continue

        current = dict(seg)
        current['start'] = round(max(0, float(current.get('start', 0))), 2)
        current['end'] = round(max(current['start'] + 0.25, float(current.get('end', current['start'] + 1))), 2)

        duplicate_index = None
        for idx in range(max(0, len(cleaned) - 4), len(cleaned)):
            prev = cleaned[idx]
            overlap = ranges_overlap(prev['start'], prev['end'], current['start'], current['end'])
            if overlap <= 0:
                continue
            same_text = segment_similarity(prev.get('text', ''), current.get('text', '')) >= 0.62
            same_music = prev.get('type') == 'music' and current.get('type') == 'music'
            if same_text or same_music:
                duplicate_index = idx
                break

        if duplicate_index is not None:
            prev = cleaned[duplicate_index]
            if len(current.get('text', '')) > len(prev.get('text', '')):
                current['start'] = min(prev['start'], current['start'])
                current['end'] = max(prev['end'], current['end'])
                cleaned[duplicate_index] = current
            else:
                prev['start'] = min(prev['start'], current['start'])
                prev['end'] = max(prev['end'], current['end'])
            continue

        cleaned.append(current)

    return cleaned

def recover_missed_speech_gaps(subtitles, samples, framerate, nchannels, sampwidth, language, recognizer, avg_vol):
    duration = len(samples) / max(framerate, 1)
    speech_segments = [seg for seg in subtitles if seg.get('type') == 'speech']
    gaps = timeline_gaps(duration, speech_segments, min_gap=0.45)
    recovered = []
    low_energy_floor = max(avg_vol * 0.07, 45)

    for gap_start, gap_end in gaps:
        cursor = gap_start
        while cursor < gap_end:
            win_start = cursor
            win_end = min(gap_end, cursor + 3.2)
            if win_end - win_start < 0.45:
                break

            start_sample = max(0, int((win_start - 0.2) * framerate))
            end_sample = min(len(samples), int((win_end + 0.2) * framerate))
            seg_samples = samples[start_sample:end_sample]
            seg_rms = (sum(s*s for s in seg_samples) / max(len(seg_samples), 1)) ** 0.5

            if seg_rms > low_energy_floor:
                try:
                    result = recognize_sample_variants(recognizer, seg_samples, nchannels, sampwidth, framerate, language, seg_rms)
                    text = result.get('text', '').strip()
                    confidence = result.get('confidence', 0)
                    if text and not is_probably_false_caption(text, confidence, win_end - win_start, seg_rms, avg_vol):
                        recovered.append(speech_segment(
                            win_start,
                            win_end,
                            text,
                            language,
                            confidence,
                            result.get('language', '')
                        ))
                except sr.UnknownValueError:
                    pass

            cursor += 2.25

    if recovered:
        subtitles = [
            seg for seg in subtitles
            if not (
                seg.get('type') == 'music' and
                any(ranges_overlap(seg['start'], seg['end'], rec['start'], rec['end']) > 0.35 for rec in recovered)
            )
        ]
        subtitles.extend(recovered)

    return clean_subtitle_timeline(subtitles)

def transcribe_free_engine(audio_bytes, language):
    # Read the WAV file
    try:
        wav_file = wave.open(io.BytesIO(audio_bytes), 'rb')
    except Exception as e:
        raise Exception(f"Failed to read WAV header: {str(e)}")
        
    nchannels, sampwidth, framerate, nframes, comptype, compname = wav_file.getparams()
    raw_data = wav_file.readframes(nframes)
    wav_file.close()
    
    if sampwidth != 2:
        raise Exception("Audio must be 16-bit PCM WAV.")
        
    # Unpack samples as signed shorts
    num_samples = len(raw_data) // 2
    samples = struct.unpack(f"<{num_samples}h", raw_data[:num_samples*2])
    
    # Silence detection / slicing params
    window_duration = 0.1 # 100ms
    window_size = int(framerate * window_duration)
    
    # Dynamic threshold based on average amplitude. Keep it forgiving so quiet words are not skipped.
    avg_vol = sum(abs(s) for s in samples) / max(len(samples), 1)
    silence_threshold = max(avg_vol * 0.16, 90)
    
    min_silence_duration = 0.25
    min_silence_len = int(min_silence_duration / window_duration)
    
    num_windows = len(samples) // window_size
    window_energies = []
    for i in range(num_windows):
        start = i * window_size
        end = start + window_size
        win_samples = samples[start:end]
        rms = (sum(s*s for s in win_samples) / max(len(win_samples), 1)) ** 0.5
        window_energies.append(rms)
        
    # Slicing logic
    segments = []
    in_speech = False
    speech_start_win = 0
    silence_counter = 0
    
    for idx, energy in enumerate(window_energies):
        if energy > silence_threshold:
            if not in_speech:
                in_speech = True
                speech_start_win = idx
            silence_counter = 0
        else:
            if in_speech:
                silence_counter += 1
                if silence_counter >= min_silence_len:
                    speech_end_win = idx - silence_counter + 1
                    if speech_end_win > speech_start_win:
                        segments.append((speech_start_win, speech_end_win))
                    in_speech = False
                    
    if in_speech:
        segments.append((speech_start_win, num_windows))
        
    if not segments:
        segments.append((0, num_windows))
        
    # Enforce chunk size boundaries to keep subtitles short and easier for Google to recognize.
    max_segment_duration = 3.4
    max_segment_wins = int(max_segment_duration / window_duration)
    
    refined_segments = []
    overlap_wins = max(1, int(0.28 / window_duration))
    for start, end in segments:
        curr_start = start
        while end - curr_start > max_segment_wins:
            refined_segments.append((curr_start, curr_start + max_segment_wins))
            curr_start += max(1, max_segment_wins - overlap_wins)
        if end > curr_start:
            refined_segments.append((curr_start, end))
            
    # Transcribe each chunk
    r = sr.Recognizer()
    r.dynamic_energy_threshold = False
    r.energy_threshold = max(55, int(silence_threshold * 0.62))
    r.pause_threshold = 0.28
    r.non_speaking_duration = 0.2
    subtitles = []
    
    print(f"Slicing audio into {len(refined_segments)} segments for transcription...")
    
    for start_win, end_win in refined_segments:
        start_sec = start_win * window_duration
        end_sec = end_win * window_duration
        
        # Don't transcribe chunks shorter than 0.5 seconds
        if end_sec - start_sec < 0.5:
            continue
            
        pad_samples = int(framerate * 0.18)
        start_sample = max(0, (start_win * window_size) - pad_samples)
        end_sample = min(len(samples), (end_win * window_size) + pad_samples)
        seg_samples = samples[start_sample:end_sample]
        seg_rms = (sum(s*s for s in seg_samples) / max(len(seg_samples), 1)) ** 0.5
        
        try:
            result = recognize_sample_variants(r, seg_samples, nchannels, sampwidth, framerate, language, seg_rms)
            text = result.get('text', '').strip()
            confidence = result.get('confidence', 0)
            if text and not is_probably_false_caption(text, confidence, end_sec - start_sec, seg_rms, avg_vol):
                subtitles.append(speech_segment(
                    start_sec,
                    end_sec,
                    text,
                    language,
                    confidence,
                    result.get('language', '')
                ))
        except sr.UnknownValueError:
            pass
        except sr.RequestError as e:
            raise Exception(f"Standard captions service error: {str(e)}")

    subtitles = recover_missed_speech_gaps(
        subtitles,
        samples,
        framerate,
        nchannels,
        sampwidth,
        language,
        r,
        avg_vol
    )

    return subtitles

# --- Faster-Whisper Lazy Loader ---
WHISPER_MODEL = None
WHISPER_MODEL_LOCK = threading.Lock()

def get_whisper_model():
    global WHISPER_MODEL
    if WHISPER_MODEL is None:
        with WHISPER_MODEL_LOCK:
            if WHISPER_MODEL is None:
                # Detect CUDA availability
                try:
                    import torch
                    device = "cuda" if torch.cuda.is_available() else "cpu"
                except ImportError:
                    device = "cpu"
                
                compute_type = "float16" if device == "cuda" else "int8"
                model_size = os.environ.get("WHISPER_MODEL_SIZE", "base")
                
                print(f"Initializing WhisperModel '{model_size}' on '{device}' with '{compute_type}'...")
                try:
                    from faster_whisper import WhisperModel
                    WHISPER_MODEL = WhisperModel(model_size, device=device, compute_type=compute_type)
                except Exception as e:
                    print(f"CUDA initialization failed ({e}). Falling back to CPU/int8...")
                    from faster_whisper import WhisperModel
                    WHISPER_MODEL = WhisperModel(model_size, device="cpu", compute_type="int8")
    return WHISPER_MODEL

# --- Audio Preprocessing Normalization & Noise Filtering ---
def preprocess_audio(input_path, output_path):
    ffmpeg_path = get_ffmpeg_executable()
    if not ffmpeg_path:
        print("Warning: FFmpeg is missing. Copying raw audio track...")
        shutil.copyfile(input_path, output_path)
        return
        
    # Highpass filter (80Hz) to cut low hum, Lowpass filter (7600Hz) to cut hiss,
    # and Loudness/Dynamic normalization filter chain.
    command = [
        ffmpeg_path,
        '-y',
        '-hide_banner',
        '-loglevel', 'error',
        '-i', input_path,
        '-vn',
        '-ac', '1',
        '-ar', '16000',
        '-sample_fmt', 's16',
        '-af', 'highpass=f=80,lowpass=f=7600,dynaudnorm=f=150:g=15,loudnorm=I=-18:TP=-2:LRA=11',
        output_path
    ]
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

# --- Reels Subtitles Slicer ---
def group_words_into_segments(words, max_words=3, max_duration=2.0):
    if not words:
        return []
    
    segments = []
    current_words = []
    
    for w in words:
        word_text = w.get('word', '').strip()
        if not word_text:
            continue
        
        start = float(w.get('start', 0))
        end = float(w.get('end', 0))
        prob = float(w.get('probability', 1.0))
        
        if current_words:
            seg_start = current_words[0]['start']
            time_gap = start - current_words[-1]['end']
            
            # Split segment: max words, duration limits, or silence gaps (> 0.6 seconds)
            if len(current_words) >= max_words or (end - seg_start) > max_duration or time_gap > 0.6:
                text = " ".join([cw['word'] for cw in current_words])
                avg_prob = sum([cw['probability'] for cw in current_words]) / len(current_words)
                
                # Exclude extremely low confidence noise/music segments
                if avg_prob >= 0.35:
                    segments.append({
                        'start': round(seg_start, 2),
                        'end': round(current_words[-1]['end'], 2),
                        'text': text,
                        'speaker': 'Speaker 1',
                        'type': 'speech',
                        'confidence': round(avg_prob, 3),
                        'words': current_words
                    })
                current_words = []
        
        current_words.append({
            'word': word_text,
            'start': start,
            'end': end,
            'probability': prob
        })
        
    if current_words:
        seg_start = current_words[0]['start']
        text = " ".join([cw['word'] for cw in current_words])
        avg_prob = sum([cw['probability'] for cw in current_words]) / len(current_words)
        if avg_prob >= 0.35:
            segments.append({
                'start': round(seg_start, 2),
                'end': round(current_words[-1]['end'], 2),
                'text': text,
                'speaker': 'Speaker 1',
                'type': 'speech',
                'confidence': round(avg_prob, 3),
                'words': current_words
            })
            
    return segments

# --- Local Faster-Whisper Pipeline ---
def transcribe_local_whisper(audio_path, language):
    model = get_whisper_model()
    
    lang_code = None
    if language and language != 'auto':
        if language.startswith('roman'):
            lang_code = 'ur'
        else:
            lang_code = language.split('-')[0]
            
    prompt_text = "Transcribe the speech exactly."
    if language and language.startswith('roman'):
        prompt_text = "Transcribe the Roman Urdu / Hinglish speech exactly using Latin script/English letters, for example 'mein', 'tum', 'kya', 'acha'."
        
    print(f"Running local Faster-Whisper on {audio_path}...")
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_speech_duration_ms=250, min_silence_duration_ms=400),
        language=lang_code,
        initial_prompt=prompt_text
    )
    
    words = []
    for segment in segments:
        if segment.words:
            for w in segment.words:
                words.append({
                    'word': w.word,
                    'start': w.start,
                    'end': w.end,
                    'probability': w.probability
                })
                
    if words:
        return group_words_into_segments(words)
        
    # Fallback to segment-level timings if word timestamps are missing
    print("Warning: Word-level timestamps missing. Falling back to segment-level.")
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=False,
        vad_filter=True,
        language=lang_code,
        initial_prompt=prompt_text
    )
    out = []
    for segment in segments:
        out.append({
            'start': round(segment.start, 2),
            'end': round(segment.end, 2),
            'text': segment.text.strip(),
            'confidence': 1.0,
            'words': []
        })
    return out

# --- Groq Cloud Whisper API (Vercel Serverless Ready) ---
def transcribe_with_groq(audio_path, language, api_key):
    if not api_key:
        raise ValueError("Groq Whisper requires an API Key. Please add it in settings.")
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    lang_param = None
    if language and language != 'auto':
        if language.startswith('roman'):
            lang_param = 'ur'
        else:
            lang_param = language.split('-')[0]
            
    prompt_text = "Transcribe the speech exactly."
    if language and language.startswith('roman'):
        prompt_text = "Transcribe the Roman Urdu / Hinglish speech exactly using Latin script/English letters, for example 'mein', 'tum', 'kya', 'acha'."
        
    files = {
        'file': (os.path.basename(audio_path), open(audio_path, 'rb'), 'audio/wav')
    }
    
    data = {
        'model': 'whisper-large-v3',
        'response_format': 'verbose_json',
        'timestamp_granularities[]': 'word'
    }
    if lang_param:
        data['language'] = lang_param
    if prompt_text:
        data['prompt'] = prompt_text
        
    print(f"Sending audio to Groq API...")
    try:
        response = requests.post(url, headers=headers, files=files, data=data)
    except requests.exceptions.ConnectionError as conn_err:
        raise RuntimeError("Groq Connection Error: Failed to resolve/reach api.groq.com. Please check your internet connection and try again.")
    except Exception as req_err:
        raise RuntimeError(f"Groq Request Error: {str(req_err)}")
        
    if not response.ok:
        raise Exception(f"Groq API Error: {response.text}")
        
    result = response.json()
    
    raw_words = result.get('words', [])
    if not raw_words:
        for seg in result.get('segments', []):
            raw_words.extend(seg.get('words', []))
            
    words = []
    for w in raw_words:
        words.append({
            'word': w.get('word', ''),
            'start': float(w.get('start', 0)),
            'end': float(w.get('end', 0)),
            'probability': float(w.get('probability', 0.9))
        })
        
    if words:
        return group_words_into_segments(words)
        
    # Fallback to segment-level timings
    out = []
    for segment in result.get('segments', []):
        out.append({
            'start': round(float(segment.get('start', 0)), 2),
            'end': round(float(segment.get('end', 0)), 2),
            'text': segment.get('text', '').strip(),
            'confidence': 1.0,
            'words': []
        })
    return out

# --- Gemini Enhanced Captions Backend ---
def sanitize_gemini_segments(subtitles, language):
    if not isinstance(subtitles, list):
        if isinstance(subtitles, dict):
            for value in subtitles.values():
                if isinstance(value, list):
                    subtitles = value
                    break
        else:
            raise ValueError("Response is not a JSON array")

    sanitized = []
    for item in subtitles:
        if isinstance(item, dict) and 'start' in item and 'end' in item and 'text' in item:
            seg_type = str(item.get('type', 'speech')).strip().lower()
            is_music = seg_type in ('music', 'song', 'instrumental', 'non_speech', 'non-speech')
            clean_text = str(item['text']).strip()
            if is_music:
                clean_text = clean_text or MUSIC_MARKER
            else:
                clean_text = normalize_spoken_numbers(clean_text, language)

            speaker = str(item.get('speaker', '')).strip()
            sanitized.append({
                'start': float(item['start']),
                'end': float(item['end']),
                'text': clean_text,
                'speaker': speaker if speaker else ('Music' if is_music else ''),
                'type': 'music' if is_music else 'speech'
            })

    sanitized.sort(key=lambda x: x['start'])
    return sanitized

def transcribe_with_gemini(audio_bytes, language, api_key, model):
    if not api_key:
        raise ValueError("Enhanced captions need an access key first. Please configure it in settings.")

    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    instructions = (
        "Transcribe the following audio file. Return a JSON array of subtitle segments. "
        "Each segment must be a JSON object with these fields:\n"
        "1. 'start': start time in seconds (float, e.g. 1.25)\n"
        "2. 'end': end time in seconds (float, e.g. 4.5)\n"
        "3. 'text': the transcript text for this segment.\n"
        "4. 'speaker': short stable speaker label when more than one person speaks, such as 'Speaker 1' or 'Speaker 2'.\n"
        "5. 'type': 'speech' for spoken words, or 'music' for music-only / singing bed / instrumental / non-speech moments.\n\n"
        "Keep segments short and readable (typically 2-6 seconds, max 10 words per segment). "
        "Split sentences naturally. "
        "Do not skip quiet speech, short reactions, filler words, names, or fast back-and-forth dialogue. "
        "If speech overlaps background music, transcribe the speech and keep type as 'speech'. "
        "When there is music without clear speech, do not invent lyrics or normal captions; return a short music marker like '\\u266a \\u266b \\u266a' and set type to 'music'. "
        "When a different person starts speaking, keep the speaker label consistent so the UI can color them differently. "
        "Be very careful with spoken numbers, prices, dates, phone numbers, OTPs, addresses, usernames, and codes. "
        "When a number is spoken, output it as digits where natural (for example 'twenty five' -> '25', "
        "'zero three zero zero' -> '0300'). Do not guess missing digits; preserve uncertain words if unclear. "
    )

    if wants_roman_urdu(language):
        instructions += (
            "The audio is mostly Roman Urdu / Hinglish. Output captions in English letters only "
            "(Latin/Roman script), not Urdu-Arabic script. Keep English words as English and write "
            "Urdu/Hindi words as natural Roman Urdu, for example 'mein', 'tum', 'kya', 'acha'. "
            "Do not translate the meaning into formal Urdu script; preserve the speaker's wording and timing."
        )
    elif language and language != 'auto':
        instructions += f"The spoken language in the audio is {language}. Please transcribe or output the text in {language}."
    else:
        instructions += "Auto-detect the spoken language and transcribe it in that language."

    instructions += (
        "\n\nReturn ONLY a raw JSON array of objects. Do not include markdown code block formatting (like ```json), "
        "do not put speaker names inside the text, and do not include conversational intro/outro text."
    )

    payload = {
        "contents": [{
            "parts": [
                {"text": instructions},
                {
                    "inline_data": {
                        "mime_type": "audio/wav",
                        "data": audio_b64
                    }
                }
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.15
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method='POST'
    )

    with urllib.request.urlopen(req) as response:
        res_data = response.read().decode('utf-8')
        res_json = json.loads(res_data)

    try:
        text_response = res_json['candidates'][0]['content']['parts'][0]['text']
    except (KeyError, IndexError):
        raise ValueError(f"Failed to parse enhanced caption response: {res_json}")

    try:
        parsed = json.loads(text_response.strip())
        return sanitize_gemini_segments(parsed, language)
    except Exception as parse_err:
        raise ValueError(f"Enhanced captions did not return valid subtitle JSON: {parse_err}")

# --- Unified Transcription Dispatcher ---
def transcribe_audio_file(audio_path, engine, language, api_key=None, model='gemini-1.5-flash'):
    if engine == 'gemini':
        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()
        return transcribe_with_gemini(audio_bytes, language, api_key, model)
    elif engine == 'groq':
        return transcribe_with_groq(audio_path, language, api_key)
    elif engine == 'local':
        return transcribe_local_whisper(audio_path, language)
    else: # free (Google SpeechRecognition legacy)
        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()
        return transcribe_free_engine(audio_bytes, language)

# --- Backward-compatible Byte Wrapper ---
def transcribe_audio_bytes(audio_bytes, engine, language, api_key=None, model='gemini-1.5-flash'):
    if not audio_bytes:
        raise ValueError("Audio file is empty.")
    
    fd_in, temp_in = tempfile.mkstemp(prefix='bytes_in_', suffix='.wav')
    os.close(fd_in)
    with open(temp_in, 'wb') as f:
        f.write(audio_bytes)
        
    fd_out, temp_out = tempfile.mkstemp(prefix='bytes_out_', suffix='.wav')
    os.close(fd_out)
    
    try:
        preprocess_audio(temp_in, temp_out)
        return clean_subtitle_timeline(transcribe_audio_file(temp_out, engine, language, api_key, model))
    finally:
        for path in (temp_in, temp_out):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

def get_ffmpeg_executable():
    path = shutil.which('ffmpeg')
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None

def extract_wav_chunk(ffmpeg_path, source_path, output_path, start_seconds, duration_seconds):
    command = [
        ffmpeg_path,
        '-y',
        '-hide_banner',
        '-loglevel', 'error',
        '-ss', str(max(0, start_seconds)),
        '-t', str(max(0.1, duration_seconds)),
        '-i', source_path,
        '-vn',
        '-ac', '1',
        '-ar', '16000',
        '-sample_fmt', 's16',
        '-af', 'highpass=f=80,lowpass=f=7600,dynaudnorm=f=150:g=15,loudnorm=I=-18:TP=-2:LRA=11',
        output_path
    ]
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def update_job(job_id, **changes):
    with TRANSCRIPTION_JOBS_LOCK:
        job = TRANSCRIPTION_JOBS.get(job_id)
        if job:
            job.update(changes)

def run_video_transcription_job(job_id, source_path, duration, engine, language, api_key, model):
    try:
        ffmpeg_path = get_ffmpeg_executable()
        if not ffmpeg_path:
            raise RuntimeError("Long video mode needs FFmpeg. Install ffmpeg or keep using short-video mode.")

        duration = float(duration or 0)
        if not math.isfinite(duration) or duration <= 0:
            duration = 1.0
            
        all_segments = []

        with tempfile.TemporaryDirectory(prefix='caption_chunks_') as tmpdir:
            if engine in ('local', 'groq', 'free'):
                wav_path = os.path.join(tmpdir, 'full_audio.wav')
                update_job(
                    job_id,
                    status='processing',
                    progress=15,
                    message='Extracting audio track...'
                )
                extract_wav_chunk(ffmpeg_path, source_path, wav_path, 0, duration)
                
                update_job(
                    job_id,
                    status='processing',
                    progress=45,
                    message='Transcribing with AI speech pipeline...'
                )
                all_segments = transcribe_audio_file(wav_path, engine, language, api_key, model)
            else:
                # Gemini chunked flow
                chunk_seconds = 150
                chunk_overlap = 2.0
                total_chunks = max(1, math.ceil(duration / chunk_seconds))

                for index in range(total_chunks):
                    nominal_start = index * chunk_seconds
                    start = max(0, nominal_start - (chunk_overlap if index > 0 else 0))
                    chunk_duration = min(chunk_seconds + (chunk_overlap if index > 0 else 0), duration - start)
                    wav_path = os.path.join(tmpdir, f'chunk_{index:04d}.wav')

                    update_job(
                        job_id,
                        status='processing',
                        progress=8 + int((index / total_chunks) * 86),
                        message=f'Processing audio part {index + 1}/{total_chunks}'
                    )

                    extract_wav_chunk(ffmpeg_path, source_path, wav_path, start, chunk_duration)
                    with open(wav_path, 'rb') as chunk_file:
                        chunk_bytes = chunk_file.read()

                    chunk_segments = transcribe_audio_bytes(chunk_bytes, engine, language, api_key, model)
                    for seg in chunk_segments:
                        shifted = dict(seg)
                        shifted['start'] = round(float(seg['start']) + start, 2)
                        shifted['end'] = round(float(seg['end']) + start, 2)
                        if shifted['end'] <= nominal_start and index > 0:
                            continue
                        if shifted['start'] < nominal_start and index > 0:
                            shifted['start'] = round(nominal_start, 2)
                        all_segments.append(shifted)

                    update_job(
                        job_id,
                        progress=8 + int(((index + 1) / total_chunks) * 86),
                        message=f'Finished part {index + 1}/{total_chunks}'
                    )

        all_segments = clean_subtitle_timeline(all_segments)
        update_job(
            job_id,
            status='complete',
            progress=100,
            message='Captions ready',
            subtitles=all_segments,
            completed_at=time.time()
        )
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        try:
            err_json = json.loads(error_msg)
            message = err_json.get('error', {}).get('message', error_msg)
        except Exception:
            message = error_msg
        update_job(job_id, status='error', progress=100, message=f"Enhanced captions error ({e.code}): {message}")
    except Exception as e:
        update_job(job_id, status='error', progress=100, message=str(e))
    finally:
        try:
            if os.path.exists(source_path):
                os.remove(source_path)
        except Exception:
            pass

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    engine = request.form.get('engine', 'free')
    language = request.form.get('language', 'auto')

    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided in request.'}), 400

    try:
        audio_bytes = request.files['audio'].read()
        api_key = request.headers.get('X-API-Key') or request.form.get('api_key')
        model = request.form.get('model', 'gemini-1.5-flash')
        subtitles = transcribe_audio_bytes(audio_bytes, engine, language, api_key, model)
        return jsonify({'subtitles': subtitles})
    except urllib.error.HTTPError as e:
        import traceback
        traceback.print_exc()
        error_msg = e.read().decode('utf-8')
        try:
            err_json = json.loads(error_msg)
            message = err_json.get('error', {}).get('message', error_msg)
        except Exception:
            message = error_msg
        return jsonify({'error': f"Gemini API Error ({e.code}): {message}"}), 500
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f"Internal Server Error: {str(e)}"}), 500

@app.route('/api/transcribe-video', methods=['POST'])
def start_video_transcription():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided in request.'}), 400

    ffmpeg_path = get_ffmpeg_executable()
    if not ffmpeg_path:
        return jsonify({'error': 'Long video mode needs FFmpeg. Install ffmpeg or restart after installing the bundled dependency.'}), 500

    engine = request.form.get('engine', 'free')
    language = request.form.get('language', 'auto')
    model = request.form.get('model', 'gemini-1.5-flash')
    api_key = request.headers.get('X-API-Key') or request.form.get('api_key')
    duration = float(request.form.get('duration') or 0)

    if engine in ('gemini', 'groq') and not api_key:
        return jsonify({'error': 'Access key required for this engine.'}), 400

    video_file = request.files['video']
    suffix = os.path.splitext(video_file.filename or '')[1] or '.mp4'
    fd, source_path = tempfile.mkstemp(prefix='caption_video_', suffix=suffix)
    os.close(fd)
    video_file.save(source_path)

    job_id = uuid.uuid4().hex
    with TRANSCRIPTION_JOBS_LOCK:
        TRANSCRIPTION_JOBS[job_id] = {
            'status': 'queued',
            'progress': 2,
            'message': 'Preparing video audio',
            'subtitles': [],
            'created_at': time.time()
        }

    worker = threading.Thread(
        target=run_video_transcription_job,
        args=(job_id, source_path, duration, engine, language, api_key, model),
        daemon=True
    )
    worker.start()

    return jsonify({'job_id': job_id, 'status': 'queued', 'progress': 2})

@app.route('/api/transcribe-video/<job_id>', methods=['GET'])
def get_video_transcription_status(job_id):
    with TRANSCRIPTION_JOBS_LOCK:
        job = TRANSCRIPTION_JOBS.get(job_id)
        if not job:
            return jsonify({'error': 'Transcription job was not found.'}), 404
        return jsonify(job)

if __name__ == '__main__':
    # Ensure static directory exists
    os.makedirs(os.path.join(os.path.dirname(__file__), 'static'), exist_ok=True)
    print("Starting video caption generator server...")
    print("Open http://127.0.0.1:5000 in your browser.")
    app.run(host='127.0.0.1', port=5000, debug=True)
