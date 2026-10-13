"""Real HTTP/Chromium QA; no mocked navigation, storage or downloads.

Run: python tests/browser_smoke.py
BASE_URL=https://host/project/ tests that project without a local server.
BROWSER_ARTIFACT_DIR optionally preserves screenshots, downloads and print PDFs.
Only test_08 injects clipboard denial; test_10 uses the real browser clipboard.
Viewport emulation is not a physical mobile-device test.
"""
from pathlib import Path
import json
import os
import subprocess
import tempfile
import time
import unittest
import urllib.request
from urllib.parse import parse_qs, urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('TEST_PORT', '4187'))
LIVE = bool(os.environ.get('BASE_URL'))
BASE = os.environ.get('BASE_URL', f'http://127.0.0.1:{PORT}/math-inquiry-lab/').rstrip('/') + '/'
PARTS = urlsplit(BASE)
if PARTS.scheme not in ('http', 'https') or not PARTS.netloc or PARTS.query or PARTS.fragment:
    raise ValueError('BASE_URL must be an HTTP(S) project base without query or fragment')
ORIGIN = f'{PARTS.scheme}://{PARTS.netloc}'
LABS = ('quadratic', 'probability', 'regression')
PAGES = ('index.html', 'teacher-guide.html', 'about.html', *(f'labs/{lab}.html' for lab in LABS))
FIELDS = ('prediction', 'explanation', 'exit-answer')


class BrowserSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = None
        cls.temp_artifacts = tempfile.TemporaryDirectory(prefix='math-inquiry-browser-')
        cls.artifacts = Path(os.environ.get('BROWSER_ARTIFACT_DIR', cls.temp_artifacts.name))
        cls.artifacts.mkdir(parents=True, exist_ok=True)
        if not LIVE:
            cls.server = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT,
                env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL)
            for _ in range(60):
                try:
                    urllib.request.urlopen(BASE, timeout=.3).close()
                    break
                except Exception:
                    time.sleep(.1)
            else:
                cls.server.terminate()
                cls.server.wait(timeout=10)
                raise RuntimeError('Local preview server did not start')
        cls.pw = sync_playwright().start()
        opts = {'headless': True}
        if os.environ.get('CHROMIUM_EXECUTABLE'):
            opts['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
        try:
            cls.browser = cls.pw.chromium.launch(**opts)
        except Exception:
            cls.pw.stop()
            if cls.server:
                cls.server.terminate()
                cls.server.wait(timeout=10)
            cls.temp_artifacts.cleanup()
            raise
        print(f'\nReal Chromium {cls.browser.version}; base={BASE}; live={LIVE}', flush=True)
        if os.environ.get('BROWSER_ARTIFACT_DIR'):
            print(f'Browser artifacts: {cls.artifacts.resolve()}', flush=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        if cls.server:
            cls.server.terminate()
            cls.server.wait(timeout=10)
        cls.temp_artifacts.cleanup()

    def setUp(self):
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        self.page = self.ctx.new_page()
        self.errors, self.remote, self.http_errors = [], [], []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.ctx.on('request', self.check_request)
        self.ctx.on('response', lambda response: self.http_errors.append(
            f'{response.status} {response.url}') if response.status >= 400 else None)

    def check_request(self, request):
        # Parsed origin equality also excludes lookalike host-name prefixes.
        parsed = urlsplit(request.url[5:] if request.url.startswith('blob:') else request.url)
        if (parsed.scheme, parsed.netloc) != (PARTS.scheme, PARTS.netloc):
            self.remote.append(request.url)

    def tearDown(self):
        try:
            self.assertEqual(self.errors, [], 'Uncaught browser JavaScript errors')
            self.assertEqual(self.remote, [], 'Requests outside the selected origin')
            self.assertEqual(self.http_errors, [], 'Browser HTTP failures')
        finally:
            self.ctx.close()

    def ready(self):
        self.page.wait_for_function("document.querySelector('#record-list')?.children.length > 0")
        self.assertEqual(self.page.locator('#plot').get_attribute('viewBox'), '0 0 720 480')

    def open(self, slug):
        self.assertEqual(self.page.goto(BASE + f'labs/{slug}.html').status, 200)
        self.ready()

    def save_download(self, selector, name):
        with self.page.expect_download() as pending:
            self.page.locator(selector).click()
        download = pending.value
        self.assertIsNone(download.failure())
        self.assertEqual(download.suggested_filename, name)
        destination = self.artifacts / name
        download.save_as(destination)
        return destination.read_text(encoding='utf-8')

    def test_01_http_routes_root_and_project(self):
        # Live runs stay in the project: the origin root may be a separate blog.
        for base in ([BASE] if LIVE else [ORIGIN + '/', BASE]):
            for name in ('', *PAGES):
                with self.subTest(url=base + name):
                    self.assertEqual(self.page.goto(base + name).status, 200)
                    self.assertEqual(self.page.locator('h1').count(), 1)
                    self.assertEqual(self.page.locator('html').get_attribute('lang'), 'zh-Hant')
                    self.assertEqual(self.page.evaluate('getComputedStyle(document.body).backgroundColor'), 'rgb(250, 250, 247)')
                    if name.startswith('labs/'):
                        self.ready()
                    self.assertEqual(self.page.reload().status, 200)
                    self.assertEqual(self.page.locator('h1').count(), 1)
                    if name.startswith('labs/'):
                        self.ready()
        self.open('regression')
        self.page.locator('.brand').click()
        self.assertEqual(self.page.url, BASE + 'index.html')
        self.assertEqual(self.page.locator('.module-row').count(), 3)

    def test_02_quadratic(self):
        self.open('quadratic')
        self.page.locator('#h-number').fill('2')
        self.assertIn('(x − 2)', self.page.locator('#equation').inner_text())
        self.page.locator('#a-number').fill('0')
        self.assertTrue(self.page.locator('#degenerate').is_visible())
        self.assertIn('所有實數都是零點', self.page.locator('#facts').text_content())
        self.assertIn('沒有唯一頂點', self.page.locator('#facts').text_content())
        self.page.locator('#k-number').fill('2')
        self.assertEqual(self.page.locator('#equation').inner_text(), 'y = 2')
        self.assertIn('沒有實數零點', self.page.locator('#facts').text_content())
        self.page.locator('#reset').click()
        self.assertFalse(self.page.locator('#degenerate').is_visible())
        self.page.locator('#a').focus()
        self.page.keyboard.press('ArrowRight')
        self.assertEqual(self.page.locator('#a-number').input_value(), '1.25')
        self.assertIn('1.25', self.page.locator('#equation').inner_text())
        self.assertIn('提示已隱藏', self.page.locator('#plot desc').text_content())
        self.page.locator('#show-vertex').check()
        self.assertIn('頂點為 (0,0)', self.page.locator('#plot desc').text_content())
        self.page.locator('#show-vertex').uncheck()
        self.assertNotIn('頂點為 (', self.page.locator('#plot desc').text_content())

    def test_03_real_storage_reload_opt_in(self):
        self.open('quadratic')
        note = '測試筆記，不是真實學生資料'
        self.page.locator('#prediction').fill(note)
        self.assertEqual(self.page.evaluate('localStorage.length'), 0)
        self.page.evaluate("localStorage.setItem('unrelated-app:test', 'retain')")
        self.page.locator('#remember').check()
        self.page.locator('#record').click()
        self.page.wait_for_function("JSON.parse(localStorage.getItem('math-inquiry-lab:v1:quadratic') || 'null')?.records.length === 1")
        self.page.reload()
        self.ready()
        self.assertEqual(self.page.locator('#prediction').input_value(), note)
        self.assertTrue(self.page.locator('#remember').is_checked())
        self.assertEqual(self.page.locator('#record-count').inner_text(), '1 / 8')
        self.page.locator('#remember').uncheck()
        # Coordination metadata contains no learner text and must remain to
        # detect stale writers. Require deletion of all actual notebook copies.
        self.page.wait_for_function("localStorage.getItem('math-inquiry-lab:v1:quadratic') === null && !Object.keys(localStorage).some(k => k.startsWith('math-learning-sync-v1:recovery:math-inquiry-quadratic:'))")
        remaining = self.page.evaluate('Object.fromEntries(Object.entries(localStorage))')
        self.assertNotIn('math-inquiry-lab:v1:quadratic', remaining)
        self.assertFalse(any(key.startswith('math-learning-sync-v1:recovery:math-inquiry-quadratic:') for key in remaining))
        self.assertEqual(remaining['unrelated-app:test'], 'retain')
        self.assertNotIn(note, json.dumps(remaining, ensure_ascii=False))
        self.assertEqual(self.page.locator('#prediction').input_value(), note)
        self.page.reload()
        self.ready()
        self.assertEqual(self.page.locator('#prediction').input_value(), '')

    def test_04_real_json_and_text_downloads(self):
        for lab in LABS:
            with self.subTest(lab=lab):
                self.open(lab)
                if lab == 'probability':
                    self.page.locator('[data-add="10"]').click()
                for field in FIELDS:
                    self.page.locator('#' + field).fill(f'測試 {lab} {field}：<數學> & 記錄')
                self.page.locator('#record').click()
                data = json.loads(self.save_download('#export-json', f'{lab}-learning-record.json'))
                self.assertEqual(data['lab'], lab)
                self.assertEqual(len(data['records']), 1)
                self.assertIsNotNone(data['current'])
                text = self.save_download('#export-text', f'{lab}-learning-record.txt')
                for field in FIELDS:
                    expected = f'測試 {lab} {field}：<數學> & 記錄'
                    self.assertEqual(data['answers'][field], expected)
                    self.assertIn(expected, text)
                self.assertIn('並非已提交作業', text)
                self.assertIn('觀察紀錄', text)

    def test_05_probability_reproducibility_and_boundaries(self):
        self.open('probability')
        self.assertEqual(self.page.locator('#proportion').inner_text(), '—')
        self.page.locator('#record').click()
        self.assertEqual(self.page.locator('#record-count').inner_text(), '0 / 8')
        self.page.locator('[data-add="1000"]').click()
        before = self.page.locator('#path-values').text_content()
        self.page.locator('#reset').click()
        self.page.locator('[data-add="1000"]').click()
        self.assertEqual(self.page.locator('#path-values').text_content(), before)
        self.page.locator('#prediction').fill('保留預測')
        self.page.locator('#p-number').fill('0')
        self.assertEqual(self.page.locator('#trials').inner_text(), '0')
        self.assertEqual(self.page.locator('#proportion').inner_text(), '—')
        self.page.locator('[data-add="10"]').click()
        self.assertEqual(self.page.locator('#proportion').inner_text(), '0')
        self.page.locator('#p-number').fill('1')
        for _ in range(3):
            self.page.locator('#add-path').click()
        for _ in range(2):
            self.page.locator('[data-add="10000"]').click()
        self.assertEqual(self.page.locator('#trials').inner_text(), '20,000')
        self.assertEqual(self.page.locator('#proportion').inner_text(), '1')
        self.assertEqual(self.page.locator('#error').inner_text(), '0')
        self.assertEqual(self.page.locator('#path-values tr').count(), 4)
        for row in self.page.locator('#path-values tr').all():
            self.assertEqual(row.locator('td').all_text_contents()[1:], ['20000', '1', '0'])
        self.assertTrue(self.page.locator('#add-path').is_disabled())
        for button in self.page.locator('[data-add]').all():
            self.assertTrue(button.is_disabled())
        self.page.locator('#seed').fill('123')
        self.page.locator('#seed').press('Tab')
        self.assertEqual(self.page.locator('#trials').inner_text(), '0')
        self.assertEqual(self.page.locator('#prediction').input_value(), '保留預測')

    def test_06_regression_drag_and_keyboard_alternative(self):
        self.open('regression')
        self.page.locator('[data-preset=middle]').click()
        self.assertEqual(self.page.locator('#delta').inner_text(), '0')
        self.page.locator('[data-preset=low]').click()
        self.assertNotEqual(self.page.locator('#delta').inner_text(), '0')
        box = self.page.locator('[data-drag=point]').bounding_box()
        self.page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        self.page.mouse.down()
        self.page.mouse.move(box['x'] - 70, box['y'] - 60, steps=6)
        self.page.mouse.up()
        self.assertNotEqual(self.page.locator('#rx-number').input_value(), '11')
        before = float(self.page.locator('#rx-number').input_value())
        self.page.locator('#rx').focus()
        self.page.keyboard.press('ArrowLeft')
        self.assertEqual(float(self.page.locator('#rx-number').input_value()), before - .25)
        self.page.locator('#include-point').uncheck()
        self.assertEqual(self.page.locator('#delta').inner_text(), '0')
        self.assertEqual(self.page.locator('#slope').inner_text(), '1.071')

    def test_07_all_pages_three_viewports(self):
        for width in (390, 768, 1440):
            self.page.set_viewport_size({'width': width, 'height': 900})
            for name in PAGES:
                with self.subTest(width=width, page=name):
                    self.assertEqual(self.page.goto(BASE + name).status, 200)
                    if name.startswith('labs/'):
                        self.ready()
                    self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
                    self.assertEqual(self.page.locator('h1').count(), 1)
                    if os.environ.get('BROWSER_ARTIFACT_DIR'):
                        self.page.screenshot(path=str(self.artifacts / f'{Path(name).stem}-{width}.png'), full_page=True)

    def test_08_simulated_clipboard_denial_fallback_no_private_text(self):
        self.open('quadratic')
        self.page.locator('#prediction').fill('PRIVATE_TEXT')
        # Deliberate fault injection: not evidence of real permission denial.
        self.page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}})")
        self.page.locator('#share').click()
        self.page.wait_for_function("!document.querySelector('#share-fallback').hidden")
        self.assertTrue(self.page.locator('#share-fallback').is_visible())
        url = self.page.locator('#share-url').input_value()
        self.assertTrue(url.startswith(BASE))
        self.assertNotIn('PRIVATE_TEXT', url)
        self.page.goto(url)
        self.ready()
        self.assertEqual(self.page.locator('#a-number').input_value(), '1')

    def test_09_projection_levels_and_real_print_pdfs(self):
        for lab in LABS:
            with self.subTest(lab=lab):
                self.page.emulate_media(media='screen')
                self.open(lab)
                self.page.locator('[data-level=challenge].level-button').click()
                self.assertTrue(self.page.locator('.task[data-level=challenge]').is_visible())
                for field in FIELDS:
                    self.page.locator('#' + field).fill(f'列印測試 {lab} {field}')
                if lab == 'probability':
                    self.page.locator('[data-add="10"]').click()
                self.page.locator('#record').click()
                self.page.locator('[data-level=explore].level-button').click()
                self.assertIn('挑戰', self.page.locator('#record-list').inner_text())
                self.page.locator('#focus-mode').click()
                self.assertFalse(self.page.locator('.notebook').is_visible())
                self.page.locator('#focus-mode').click()
                self.assertTrue(self.page.locator('.notebook').is_visible())
                self.assertEqual(self.page.locator('#prediction').input_value(), f'列印測試 {lab} prediction')
                self.page.locator('#print').click()
                self.page.emulate_media(media='print')
                for field in FIELDS:
                    self.assertTrue(self.page.locator(f'[data-print="{field}"]').is_visible())
                    self.assertFalse(self.page.locator('#' + field).is_visible())
                    self.assertEqual(self.page.locator(f'[data-print="{field}"]').inner_text(), f'列印測試 {lab} {field}')
                self.assertFalse(self.page.locator('.control-panel').is_visible())
                self.assertTrue(self.page.locator('#plot').is_visible())
                pdf = self.page.pdf(path=str(self.artifacts / f'{lab}-print.pdf'),
                    print_background=True, prefer_css_page_size=True)
                self.assertTrue(pdf.startswith(b'%PDF-'))
                self.assertIn(b'%%EOF', pdf[-100:])
                self.assertGreater(len(pdf), 5000)
                # Printing also restores notes when projection mode is active.
                self.page.emulate_media(media='screen')
                self.page.locator('#focus-mode').click()
                self.assertFalse(self.page.locator('.notebook').is_visible())
                self.page.emulate_media(media='print')
                self.assertTrue(self.page.locator('.notebook').is_visible())
                self.assertTrue(self.page.locator('[data-print="prediction"]').is_visible())

    def test_10_real_clipboard_and_parameter_roundtrips(self):
        self.ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=ORIGIN)
        cases = {
            'quadratic': {'a': '-1.5', 'h': '2', 'k': '-3', 'level': 'challenge'},
            'probability': {'p': '0.7', 'seed': '12345', 'n': '1000', 'paths': '2', 'level': 'explore'},
            'regression': {'rx': '10.25', 'ry': '3.5', 'included': 'false', 'level': 'challenge'},
        }
        for lab, expected in cases.items():
            with self.subTest(lab=lab):
                self.open(lab)
                for field in FIELDS:
                    self.page.locator('#' + field).fill('PRIVATE_' + field)
                self.page.locator(f'[data-level={expected["level"]}].level-button').click()
                for key in ('a', 'h', 'k', 'p', 'rx', 'ry'):
                    if key in expected:
                        self.page.locator(f'#{key}-number').fill(expected[key])
                if lab == 'probability':
                    self.page.locator('#seed').fill(expected['seed'])
                    self.page.locator('#seed').press('Tab')
                    self.page.locator('[data-add="1000"]').click()
                    self.page.locator('#add-path').click()
                if lab == 'regression':
                    self.page.locator('#include-point').uncheck()
                self.page.evaluate("navigator.clipboard.writeText('test sentinel')")
                self.page.locator('#share').click()
                self.page.wait_for_function("document.querySelector('#status').textContent.startsWith('已複製設定連結')")
                url = self.page.evaluate('navigator.clipboard.readText()')
                self.assertFalse(self.page.locator('#share-fallback').is_visible())
                self.assertEqual(urlsplit(url).path, urlsplit(BASE + f'labs/{lab}.html').path)
                self.assertEqual(f'{urlsplit(url).scheme}://{urlsplit(url).netloc}', ORIGIN)
                self.assertEqual(parse_qs(urlsplit(url).query), {key: [value] for key, value in expected.items()})
                self.assertNotIn('PRIVATE_', url)
                self.page.goto(url)
                self.ready()
                self.page.reload()
                self.ready()
                self.assertEqual(self.page.locator('body').get_attribute('data-level'), expected['level'])
                for key in ('a', 'h', 'k', 'p', 'rx', 'ry'):
                    if key in expected:
                        self.assertEqual(self.page.locator(f'#{key}-number').input_value(), expected[key])
                if lab == 'probability':
                    self.assertEqual(self.page.locator('#seed').input_value(), expected['seed'])
                    self.assertEqual(self.page.locator('#trials').inner_text(), '1,000')
                    self.assertEqual(self.page.locator('#paths-label').inner_text(), '2 條序列')
                if lab == 'regression':
                    self.assertFalse(self.page.locator('#include-point').is_checked())
                for field in FIELDS:
                    self.assertEqual(self.page.locator('#' + field).input_value(), '')

    def test_11_invalid_number_recovers_and_decimal_typing(self):
        for lab, key, typed in (('quadratic', 'a', '0.25'), ('probability', 'p', '0.75'), ('regression', 'rx', '4.25')):
            with self.subTest(lab=lab):
                self.open(lab)
                number = self.page.locator(f'#{key}-number')
                number.fill('')
                self.assertEqual(number.get_attribute('aria-invalid'), 'true')
                slider = self.page.locator('#' + key)
                expected = float(slider.input_value()) + float(slider.get_attribute('step'))
                slider.focus()
                self.page.keyboard.press('ArrowRight')
                self.assertAlmostEqual(float(number.input_value()), expected)
                self.assertIsNone(number.get_attribute('aria-invalid'))
                previous = self.page.locator('#plot').inner_html()
                number.fill('9999')
                self.assertEqual(number.get_attribute('aria-invalid'), 'true')
                self.assertEqual(self.page.locator('#plot').inner_html(), previous)
                self.page.locator('#reset').click()
                self.assertIsNone(number.get_attribute('aria-invalid'))
                self.assertTrue(number.evaluate('(input) => input.checkValidity()'))
                number.fill('')
                number.press_sequentially(typed)
                self.assertEqual(number.input_value(), typed)
                self.assertEqual(slider.input_value(), typed)
                self.assertIsNone(number.get_attribute('aria-invalid'))
        self.open('probability')
        seed = self.page.locator('#seed')
        for button in ('#reset', '#new-seed'):
            seed.fill('')
            seed.press('Tab')
            self.assertEqual(seed.get_attribute('aria-invalid'), 'true')
            self.page.locator(button).click()
            self.assertIsNone(seed.get_attribute('aria-invalid'))
            self.assertTrue(seed.evaluate('(input) => input.checkValidity() && input.value !== ""'))

    def test_12_mobile_chart_visible_while_adjusting_numbers(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        for lab, key, value in (('quadratic', 'k', '2'), ('probability', 'p', '0.7'), ('regression', 'ry', '9')):
            with self.subTest(lab=lab):
                self.open(lab)
                number = self.page.locator(f'#{key}-number')
                number.scroll_into_view_if_needed()
                number.fill(value)
                self.assertEqual(self.page.locator('#' + key).input_value(), value)
                box = self.page.locator('.plot-panel').bounding_box()
                self.assertGreaterEqual(box['y'], -1)
                self.assertLessEqual(box['y'] + box['height'], 844)
                self.assertTrue(number.evaluate('''input => {
                    const r = input.getBoundingClientRect();
                    const x = r.x + r.width / 2, y = r.y + r.height / 2;
                    return y >= 0 && y < innerHeight && document.elementFromPoint(x, y) === input;
                }'''), 'Sticky chart must not cover the active number input')
                if os.environ.get('BROWSER_ARTIFACT_DIR'):
                    self.page.screenshot(path=str(self.artifacts / f'{lab}-mobile-control.png'))

    def test_13_record_limit_and_clear_only_this_lab(self):
        self.open('probability')
        self.page.locator('#prediction').fill('另一活動的測試筆記')
        self.page.locator('#remember').check()
        self.page.locator('[data-add="10"]').click()
        self.page.locator('#record').click()
        self.page.wait_for_function("JSON.parse(localStorage.getItem('math-inquiry-lab:v1:probability') || 'null')?.records.length === 1")
        probability = self.page.evaluate("localStorage.getItem('math-inquiry-lab:v1:probability')")
        # Real storage sentinel; this does not replace the browser implementation.
        self.page.evaluate("localStorage.setItem('unrelated-app:test', 'retain')")
        self.open('quadratic')
        self.page.locator('#prediction').fill('將清除的測試筆記')
        self.page.locator('#remember').check()
        for _ in range(9):
            self.page.locator('#record').click()
        self.assertEqual(self.page.locator('#record-count').inner_text(), '8 / 8')
        self.assertIn('最多保留 8 筆', self.page.locator('#status').inner_text())
        self.page.locator('.remove-record').first.click()
        self.assertEqual(self.page.locator('#record-count').inner_text(), '7 / 8')
        self.page.locator('#record').click()
        self.page.once('dialog', lambda dialog: dialog.accept())
        self.page.locator('#clear-notes').click()
        self.page.wait_for_function("localStorage.getItem('math-inquiry-lab:v1:quadratic') === null")
        self.assertEqual(self.page.locator('#record-count').inner_text(), '0 / 8')
        self.assertEqual(self.page.locator('#prediction').input_value(), '')
        self.assertFalse(self.page.locator('#remember').is_checked())
        self.assertIsNone(self.page.evaluate("localStorage.getItem('math-inquiry-lab:v1:quadratic')"))
        self.assertEqual(self.page.evaluate("localStorage.getItem('math-inquiry-lab:v1:probability')"), probability)
        self.assertEqual(self.page.evaluate("localStorage.getItem('unrelated-app:test')"), 'retain')
        self.open('probability')
        self.assertEqual(self.page.locator('#prediction').input_value(), '另一活動的測試筆記')
        self.assertEqual(self.page.locator('#record-count').inner_text(), '1 / 8')

    def test_14_complete_english_and_canonical_workspace_links(self):
        # The historical project path keeps the same activities and local notes.
        for name in PAGES:
            with self.subTest(page=name):
                self.assertEqual(self.page.goto(BASE + name + '?lang=en').status, 200)
                self.page.wait_for_function("typeof MathInquiryI18n !== 'undefined' && document.querySelector('[data-canonical-workspace]')")
                self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')
                self.assertEqual(self.page.evaluate('MathInquiryI18n.untranslated()'), [])
                destination = urlsplit(self.page.locator('[data-canonical-workspace]').get_attribute('href'))
                self.assertEqual(destination.netloc, 'skckenneth.github.io')
                self.assertEqual(destination.path, '/teaching/math/')
                if name.startswith('labs/'):
                    lab = Path(name).stem
                    self.ready()
                    self.assertEqual(parse_qs(destination.query)['activity'], ['lab:' + lab])
                    self.page.locator('#prediction').fill('QA 中文學生原文')
                    if lab == 'probability':
                        self.page.locator('[data-add="10"]').click()
                    self.page.locator('#record').click()
                    self.page.wait_for_timeout(30)
                    self.assertEqual(self.page.evaluate('MathInquiryI18n.untranslated()'), [])
                    text = self.save_download('#export-text', lab + '-learning-record.txt')
                    self.assertIn('QA 中文學生原文', text)
                    self.assertNotRegex(text.replace('QA 中文學生原文', ''), r'[\u3400-\u9fff]')
                else:
                    self.assertEqual(destination.query, '')
                # Relative navigation retains the requested language on Project Pages.
                self.assertIn('lang=en', self.page.locator('.brand').get_attribute('href'))
        self.assertEqual(self.page.goto(BASE + 'labs/quadratic.html?lang=zh-Hant').status, 200)
        self.page.wait_for_selector('[data-canonical-workspace]')
        destination = urlsplit(self.page.locator('[data-canonical-workspace]').get_attribute('href'))
        self.assertEqual(destination.path, '/zh/teaching/math/')
        self.assertEqual(parse_qs(destination.query)['activity'], ['lab:quadratic'])

    def test_15_native_tabs_preserve_old_records_and_merge_changes(self):
        self.open('quadratic')
        legacy = {'schema': 1, 'version': '0.1', 'lab': 'quadratic',
                  'title': '二次函數', 'level': '核心', 'consent': True,
                  'answers': {'prediction': '原有預測', 'explanation': '', 'exit-answer': ''},
                  'records': [{'level': '核心', 'summary': '原有觀察', 'detail': '保留原文'},
                              {'level': '核心', 'summary': '原有觀察', 'detail': '保留原文'}],
                  'unknownFutureField': {'keep': True}}
        raw = json.dumps(legacy, ensure_ascii=False)
        self.page.evaluate("raw => localStorage.setItem('math-inquiry-lab:v1:quadratic', raw)", raw)
        self.page.reload()
        self.ready()
        other = self.ctx.new_page()
        other.on('pageerror', lambda error: self.errors.append(str(error)))
        self.assertEqual(other.goto(BASE + 'labs/quadratic.html').status, 200)
        other.wait_for_function("document.querySelector('#record-count')?.textContent === '2 / 8'")
        self.assertEqual(self.page.evaluate("localStorage.getItem('math-inquiry-lab:v1:quadratic')"), raw,
                         'Opening old records must not rewrite them')
        other.locator('#prediction').focus()
        self.page.locator('#prediction').fill('QA 遠端更新預測')
        other.wait_for_function("document.querySelector('#prediction').value === 'QA 遠端更新預測'")
        other.locator('#explanation').fill('QA 另一分頁解釋')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('math-inquiry-lab:v1:quadratic')).answers.explanation === 'QA 另一分頁解釋'")
        saved = self.page.evaluate("JSON.parse(localStorage.getItem('math-inquiry-lab:v1:quadratic'))")
        self.assertEqual(saved['answers']['prediction'], 'QA 遠端更新預測')
        self.assertEqual(saved['records'], legacy['records'])
        self.assertEqual(saved['unknownFutureField'], {'keep': True})
        self.page.locator('#record').click()
        other.wait_for_function("document.querySelector('#record-count').textContent === '3 / 8'")
        # Delete one identified event while the second tab appends a new event.
        self.page.locator('.remove-record').click()
        other.locator('#record').click()
        self.page.wait_for_function("JSON.parse(localStorage.getItem('math-inquiry-lab:v1:quadratic')).records.length === 3")
        other.reload()
        other.wait_for_function("document.querySelector('#record-count')?.textContent === '3 / 8'")
        saved = other.evaluate("JSON.parse(localStorage.getItem('math-inquiry-lab:v1:quadratic'))")
        self.assertEqual(saved['records'][:2], legacy['records'], 'Duplicate legacy rows stay verbatim')
        self.assertEqual(sum(bool(row.get('eventId')) for row in saved['records']), 1)
        self.assertEqual(other.locator('#prediction').input_value(), 'QA 遠端更新預測')
        self.assertEqual(other.locator('#explanation').input_value(), 'QA 另一分頁解釋')
        self.page.locator('#remember').uncheck()
        other.wait_for_function("!document.querySelector('#remember').checked")
        self.assertEqual(other.locator('#prediction').input_value(), 'QA 遠端更新預測')
        other.locator('#explanation').fill('QA 只留在這次瀏覽的解釋')
        self.page.wait_for_function("localStorage.getItem('math-inquiry-lab:v1:quadratic') === null && !Object.keys(localStorage).some(k => k.startsWith('math-learning-sync-v1:recovery:math-inquiry-quadratic:'))")
        self.assertIsNone(other.evaluate("localStorage.getItem('math-inquiry-lab:v1:quadratic')"))
        self.assertFalse(other.locator('#remember').is_checked())
        other.close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
