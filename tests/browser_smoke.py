"""Real HTTP/browser smoke tests. Required before publishing; no mocked storage.
Run: python tests/browser_smoke.py
Install the pinned Playwright and Chromium first (see README).
"""
from pathlib import Path
import json, os, subprocess, time, unittest, urllib.request
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('TEST_PORT', '4187'))
ORIGIN = f'http://127.0.0.1:{PORT}'
BASE = ORIGIN + '/math-inquiry-lab/'
class BrowserSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL)
        for _ in range(60):
            try:
                urllib.request.urlopen(ORIGIN,timeout=.3).close(); break
            except Exception: time.sleep(.1)
        else:
            cls.server.terminate();raise RuntimeError('Local preview server did not start')
        cls.pw=sync_playwright().start()
        opts={'headless':True}
        if os.environ.get('CHROMIUM_EXECUTABLE'):opts['executable_path']=os.environ['CHROMIUM_EXECUTABLE']
        try: cls.browser=cls.pw.chromium.launch(**opts)
        except Exception:
            cls.pw.stop();cls.server.terminate();raise
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop();cls.server.terminate();cls.server.wait(timeout=10)
    def setUp(self):
        self.ctx=self.browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
        self.page=self.ctx.new_page();self.errors=[];self.remote=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.on('request',lambda r:self.remote.append(r.url) if not r.url.startswith(ORIGIN) and not r.url.startswith('blob:') else None)
    def tearDown(self):
        self.assertEqual(self.errors,[]);self.assertEqual(self.remote,[]);self.ctx.close()
    def open(self,slug):
        self.page.goto(BASE+f'labs/{slug}.html')
        self.page.wait_for_function("document.querySelector('#record-list').children.length > 0")
    def test_01_http_routes_root_and_project(self):
        for base in [ORIGIN+'/',BASE]:
            for name in ['index.html','teacher-guide.html','about.html','labs/quadratic.html','labs/probability.html','labs/regression.html']:
                with self.subTest(url=base+name):
                    response=self.page.goto(base+name);self.assertEqual(response.status,200)
                    self.assertEqual(self.page.locator('h1').count(),1)
                    self.page.reload();self.assertEqual(self.page.locator('h1').count(),1)
    def test_02_quadratic(self):
        self.open('quadratic');self.page.locator('#h-number').fill('2')
        self.assertIn('(x − 2)',self.page.locator('#equation').inner_text())
        self.page.locator('#a-number').fill('0');self.assertTrue(self.page.locator('#degenerate').is_visible())
    def test_03_real_storage_reload_opt_in(self):
        self.open('quadratic');self.page.locator('#prediction').fill('測試筆記，不是真實學生資料')
        self.assertEqual(self.page.evaluate('localStorage.length'),0)
        self.page.locator('#remember').check();self.page.locator('#record').click()
        self.page.reload();self.page.wait_for_function("document.querySelector('#prediction').value.length > 0")
        self.assertEqual(self.page.locator('#record-count').inner_text(),'1 / 8')
        self.page.locator('#remember').uncheck();self.assertEqual(self.page.evaluate('localStorage.length'),0)
    def test_04_real_json_download(self):
        self.open('quadratic');self.page.locator('#prediction').fill('我的預測')
        self.page.locator('#record').click()
        with self.page.expect_download() as download:self.page.locator('#export-json').click()
        event=download.value;data=json.loads(Path(event.path()).read_text())
        self.assertEqual(data['answers']['prediction'],'我的預測');self.assertEqual(len(data['records']),1)
    def test_05_probability_reproducibility(self):
        self.open('probability');self.page.locator('[data-add="1000"]').click()
        before=self.page.locator('#proportion').inner_text()
        self.page.locator('#reset').click();self.page.locator('[data-add="1000"]').click()
        self.assertEqual(self.page.locator('#proportion').inner_text(),before)
        self.page.locator('#p-number').fill('0');self.page.locator('[data-add="10"]').click()
        self.assertEqual(self.page.locator('#proportion').inner_text(),'0')
    def test_06_regression_drag_and_keyboard_alternative(self):
        self.open('regression');self.page.locator('[data-preset=middle]').click()
        self.assertEqual(self.page.locator('#delta').inner_text(),'0')
        self.page.locator('[data-preset=low]').click();self.assertNotEqual(self.page.locator('#delta').inner_text(),'0')
        b=self.page.locator('[data-drag=point]').bounding_box()
        self.page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2);self.page.mouse.down()
        self.page.mouse.move(b['x']-70,b['y']-60,steps=6);self.page.mouse.up()
        self.assertNotEqual(self.page.locator('#rx-number').input_value(),'11')
        self.page.locator('#rx').focus();self.page.keyboard.press('ArrowLeft')
    def test_07_small_viewports(self):
        for width in [390,768,1440]:
            self.page.set_viewport_size({'width':width,'height':900})
            for slug in ['quadratic','probability','regression']:
                self.open(slug);self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'))
    def test_08_sharing_fallback_no_private_text(self):
        self.open('quadratic');self.page.locator('#prediction').fill('PRIVATE_TEXT')
        # Deliberately test the documented fallback for denied clipboard permission.
        self.page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}})")
        self.page.locator('#share').click();self.assertTrue(self.page.locator('#share-fallback').is_visible())
        url=self.page.locator('#share-url').input_value();self.assertTrue(url.startswith(BASE));self.assertNotIn('PRIVATE_TEXT',url)
        self.page.goto(url);self.assertEqual(self.page.locator('#a-number').input_value(),'1')
    def test_09_projection_print_css_and_level(self):
        self.open('quadratic');self.page.locator('[data-level=challenge].level-button').click()
        self.assertTrue(self.page.locator('.task[data-level=challenge]').is_visible())
        self.page.locator('#prediction').fill('列印測試')
        self.page.locator('#focus-mode').click();self.assertFalse(self.page.locator('.notebook').is_visible())
        self.page.emulate_media(media='print');self.assertTrue(self.page.locator('[data-print=prediction]').is_visible())
        self.assertFalse(self.page.locator('#prediction').is_visible())
        self.assertEqual(self.page.locator('[data-print=prediction]').inner_text(),'列印測試')

if __name__=='__main__':unittest.main(verbosity=2)
