import io
import math
import struct
import unittest
import wave
from unittest.mock import patch

import app


def build_loud_wav(seconds=2.2, sample_rate=16000, amplitude=3000):
    samples = [
        int(amplitude * math.sin(2 * math.pi * 220 * index / sample_rate))
        for index in range(int(seconds * sample_rate))
    ]
    output = io.BytesIO()
    with wave.open(output, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(struct.pack(f'<{len(samples)}h', *samples))
    return output.getvalue()


class RecordingRecognizer:
    def __init__(self):
        self.languages = []

    def recognize_google(self, audio, language, show_all):
        self.languages.append(language)
        return {'alternative': [{'transcript': f'caption in {language}', 'confidence': 0.9}]}


class TranscriptionRegressionTests(unittest.TestCase):
    def test_explicit_language_never_probes_urdu_or_other_locales(self):
        recognizer = RecordingRecognizer()

        result = app.recognize_google_with_fallback(recognizer, object(), 'es-ES')

        self.assertEqual(['es-ES'], recognizer.languages)
        self.assertEqual('es-ES', result['language'])

    def test_standard_mode_unrecognised_loud_audio_does_not_become_music(self):
        def raise_unknown(*args, **kwargs):
            raise app.sr.UnknownValueError()

        with patch.object(app, 'recognize_sample_variants', side_effect=raise_unknown):
            subtitles = app.transcribe_free_engine(build_loud_wav(), 'en-US')

        self.assertEqual([], subtitles)

    def test_transcribe_endpoint_preserves_the_selected_language(self):
        with patch.object(app, 'transcribe_audio_bytes', return_value=[]) as transcribe_audio:
            response = app.app.test_client().post(
                '/api/transcribe',
                data={
                    'audio': (io.BytesIO(build_loud_wav()), 'speech.wav'),
                    'engine': 'free',
                    'language': 'fr-FR',
                },
                content_type='multipart/form-data',
            )

        self.assertEqual(200, response.status_code)
        self.assertEqual('fr-FR', transcribe_audio.call_args.args[2])

    def test_best_engine_skips_gemini_without_api_key(self):
        calls = []

        def fake_transcribe_audio_file(audio_path, engine, language, api_key=None, model='gemini-1.5-flash'):
            calls.append(engine)
            return [{
                'start': 0,
                'end': 1,
                'text': f'{engine} caption',
                'type': 'speech',
                'confidence': 0.8,
            }]

        with patch.object(app, 'preprocess_audio', side_effect=lambda src, dst: None), \
             patch.object(app, 'transcribe_audio_file', side_effect=fake_transcribe_audio_file):
            result = app.transcribe_audio_bytes(build_loud_wav(), 'best', 'en-US')

        self.assertNotIn('gemini', calls)
        self.assertIn('local', calls)
        self.assertIn('free', calls)
        self.assertEqual('local', result['engineResults']['selected'])
        self.assertEqual('local caption', result['subtitles'][0]['text'])

    def test_best_engine_uses_gemini_when_api_key_is_present(self):
        calls = []

        def fake_transcribe_audio_file(audio_path, engine, language, api_key=None, model='gemini-1.5-flash'):
            calls.append(engine)
            return [{
                'start': 0,
                'end': 1,
                'text': f'{engine} caption with more useful words',
                'type': 'speech',
                'confidence': 0.9,
            }]

        with patch.object(app, 'preprocess_audio', side_effect=lambda src, dst: None), \
             patch.object(app, 'transcribe_audio_file', side_effect=fake_transcribe_audio_file):
            result = app.transcribe_audio_bytes(build_loud_wav(), 'best', 'en-US', api_key='key')

        self.assertIn('gemini', calls)
        self.assertEqual('gemini', result['engineResults']['selected'])

    def test_best_engine_rejects_urdu_script_for_roman_urdu(self):
        def fake_transcribe_audio_file(audio_path, engine, language, api_key=None, model='gemini-1.5-flash'):
            if engine == 'gemini':
                return [{'start': 0, 'end': 1, 'text': 'یہ اردو ہے', 'type': 'speech', 'confidence': 0.99}]
            return [{'start': 0, 'end': 1, 'text': 'yeh urdu hai', 'type': 'speech', 'confidence': 0.7}]

        with patch.object(app, 'preprocess_audio', side_effect=lambda src, dst: None), \
             patch.object(app, 'transcribe_audio_file', side_effect=fake_transcribe_audio_file):
            result = app.transcribe_audio_bytes(build_loud_wav(), 'best', 'roman-ur-PK', api_key='key')

        self.assertEqual('local', result['engineResults']['selected'])
        self.assertEqual('yeh urdu hai', result['subtitles'][0]['text'])
        self.assertTrue(any('Urdu script' in warning for warning in result['engineResults']['warnings']))


if __name__ == '__main__':
    unittest.main()

