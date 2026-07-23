from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class FrontendCaptionContractTests(unittest.TestCase):
    def test_fresh_install_default_is_english_with_roman_urdu_available(self):
        html = (ROOT / 'static' / 'index.html').read_text(encoding='utf-8')
        script = (ROOT / 'static' / 'app.js').read_text(encoding='utf-8')

        self.assertIn('<option value="en-US" selected>English</option>', html)
        self.assertIn('<option value="roman-ur-PK">Roman Urdu / Hinglish</option>', html)
        self.assertIn('<option value="auto">Auto - Detect best language</option>', html)
        self.assertIn("languageSelect.value = 'en-US';", script)

    def test_best_captions_mode_is_available_with_status_copy(self):
        html = (ROOT / 'static' / 'index.html').read_text(encoding='utf-8')
        script = (ROOT / 'static' / 'app.js').read_text(encoding='utf-8')

        self.assertIn('<option value="best">Best Captions (Auto choose engine)</option>', html)
        self.assertIn('id="caption-engine-status"', html)
        self.assertIn('engineResults', script)

    def test_overlay_uses_a_visible_video_viewport(self):
        html = (ROOT / 'static' / 'index.html').read_text(encoding='utf-8')
        script = (ROOT / 'static' / 'app.js').read_text(encoding='utf-8')

        self.assertIn('id="caption-viewport"', html)
        self.assertIn('function updateCaptionViewport()', script)
        self.assertIn('const pRect = getCaptionFrameRect();', script)


    def test_target_layout_is_a_real_output_frame_with_cover_cropping(self):
        script = (ROOT / 'static' / 'app.js').read_text(encoding='utf-8')
        styles = (ROOT / 'static' / 'style.css').read_text(encoding='utf-8')

        self.assertIn('function updateVideoStageLayout()', script)
        self.assertIn('new ResizeObserver', script)
        self.assertIn('CaptionGeometry.getAspectFrame', script)
        self.assertIn('object-fit: cover;', styles)
    def test_layout_switch_preserves_the_hidden_video_state(self):
        script = (ROOT / 'static' / 'app.js').read_text(encoding='utf-8')

        self.assertNotIn('videoWrapper.className =', script)
        self.assertIn("videoWrapper.classList.remove('aspect-9-16', 'aspect-1-1', 'aspect-4-5', 'aspect-16-9');", script)
    def test_editor_actions_use_the_tested_recovery_wrapper(self):
        html = (ROOT / 'static' / 'index.html').read_text(encoding='utf-8')
        script = (ROOT / 'static' / 'app.js').read_text(encoding='utf-8')

        self.assertIn('caption-actions.js', html)
        self.assertIn('CaptionActions.withActionState', script)
        self.assertIn('function setCaptionActionsBusy(isBusy)', script)
if __name__ == '__main__':
    unittest.main()

