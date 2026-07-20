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


if __name__ == '__main__':
    unittest.main()
