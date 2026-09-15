"""Offline DOM/interaction checks for restricted render environments.

These checks use the actual site HTML/CSS/JS, but replace location with a synthetic
URL and localStorage/clipboard/download with in-memory test doubles. They are NOT
an end-to-end browser-navigation, hosting, persistence or download test.
Use browser_smoke.py before deployment for those checks.
"""
from pathlib import Path
import json, os, re, unittest
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
SHOTS = ROOT / 'docs' / 'previews'
SHOTS.mkdir(parents=True, exist_ok=True)
class MemoryUI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        options = {'headless': True}
        if os.environ.get('CHROMIUM_EXECUTABLE'):
            options['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
        cls.browser = cls.pw.chromium.launch(**options)
    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop()
    def setUp(self):
        self.context = self.browser.new_context(viewport={'width':1440,'height':1000})
        self.page = self.context.new_page()
        self.errors=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
    def tearDown(self):
        self.assertEqual(self.errors,[])
        self.context.close()
    def load(self, name, query=''):
        path = SITE/(f'labs/{name}.html' if name in ['quadratic','probability','regression'] else f'{name}.html')
        text=path.read_text()
        text=re.sub(r'<link[^>]+>', '', text)
        text=re.sub(r'<script type="module".*?</script>','',text,flags=re.S)
        css=(SITE/'assets/site.css').read_text()
        text=text.replace('</head>',f'<style>{css}</style></head>')
        self.page.set_content(text, wait_until='load')
        self.page.evaluate("""() => {
          window.__memory = new Map(); window.__exports = []; window.__shared = '';
          Object.defineProperty(window,'localStorage',{configurable:true,value:{
           getItem:k=>window.__memory.get(k)||null,
           setItem:(k,v)=>window.__memory.set(k,String(v)),
           removeItem:k=>window.__memory.delete(k)
          }});
          Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__shared=t}}});
          URL.createObjectURL=b=>{window.__exports.push(b);return 'blob:test-only'};
          URL.revokeObjectURL=()=>{}; HTMLAnchorElement.prototype.click=function(){};
          window.print=()=>{window.__printed=true};
        }""")
        if name in ['quadratic','probability','regression']:
            src='\n'.join((SITE/f'assets/{f}.mjs').read_text() for f in ['math','ui',name])
            src=re.sub(r'^import .*?;\n','',src,flags=re.M)
            src=re.sub(r'^export ','',src,flags=re.M)
            url='https://example.test/math-inquiry-lab/labs/'+name+'.html'+query
            src=src.replace('new URL(location.href)',f'new URL({json.dumps(url)})')
            self.page.add_script_tag(content='{\n'+src+'\n}')
        self.page.wait_for_timeout(70)
    def test_01_home_screenshot(self):
        self.load('index')
        self.assertEqual(self.page.locator('.module-row').count(),3)
        self.page.screenshot(path=str(SHOTS/'home.png'),full_page=True)
    def test_02_quadratic_and_zero(self):
        self.load('quadratic')
        self.page.locator('#h-number').fill('2')
        self.page.locator('#show-vertex').check()
        self.assertIn('(x − 2)',self.page.locator('#equation').inner_text())
        self.page.screenshot(path=str(SHOTS/'quadratic.png'),full_page=True)
        self.page.locator('#a-number').fill('0')
        self.assertTrue(self.page.locator('#degenerate').is_visible())
        self.assertIn('常數函數',self.page.locator('#facts').text_content())
    def test_03_malicious_url_values(self):
        self.load('quadratic','?a=NaN&h=Infinity&k=9999&level=invalid')
        self.assertEqual(self.page.locator('#a-number').input_value(),'1')
        self.assertEqual(self.page.locator('#h-number').input_value(),'0')
        self.assertEqual(self.page.locator('#k-number').input_value(),'4')
        self.assertEqual(self.page.locator('.level-button[aria-pressed=true]').inner_text(),'核心')
    def test_04_layers_notes_and_record(self):
        self.load('quadratic')
        self.page.locator('#prediction').fill('我預測向右移。')
        self.page.locator('[data-level=explore].level-button').click()
        self.assertEqual(self.page.locator('#prediction').input_value(),'我預測向右移。')
        self.page.locator('#record').click()
        self.assertIn('深究',self.page.locator('#record-list').inner_text())
        self.page.locator('#reset').click()
        self.assertEqual(self.page.locator('#record-count').inner_text(),'1 / 8')
    def test_05_storage_is_opt_in_and_scoped(self):
        self.load('quadratic')
        self.page.locator('#prediction').fill('不輸入姓名')
        self.assertEqual(self.page.evaluate('window.__memory.size'),0)
        self.page.evaluate("window.__memory.set('other-site','keep')")
        self.page.locator('#remember').check()
        self.assertEqual(self.page.evaluate('window.__memory.size'),2)
        self.page.locator('#remember').uncheck()
        self.assertEqual(self.page.evaluate("window.__memory.get('other-site')"),'keep')
        self.assertEqual(self.page.evaluate('window.__memory.size'),1)
    def test_06_sharing_contains_no_text(self):
        self.load('quadratic')
        self.page.locator('#prediction').fill('PRIVATE_TEST_TEXT')
        self.page.locator('#share').click()
        url=self.page.evaluate('window.__shared')
        self.assertIn('/math-inquiry-lab/labs/quadratic.html?',url)
        self.assertNotIn('PRIVATE_TEST_TEXT',url)
        self.assertIn('a=1',url)
    def test_07_exports_and_print_mirror(self):
        self.load('quadratic')
        self.page.locator('#prediction').fill('<img onerror=alert(1)>')
        self.page.locator('#record').click()
        self.page.locator('#export-json').click()
        data=json.loads(self.page.evaluate('window.__exports[0].text()'))
        self.assertEqual(data['answers']['prediction'],'<img onerror=alert(1)>')
        self.assertEqual(len(data['records']),1)
        self.page.locator('#export-text').click()
        self.assertIn('未填',self.page.evaluate('window.__exports[1].text()'))
        self.page.locator('#print').click()
        self.assertTrue(self.page.evaluate('window.__printed'))
        self.page.emulate_media(media='print')
        self.assertTrue(self.page.locator('[data-print=prediction]').is_visible())
        self.assertFalse(self.page.locator('#prediction').is_visible())
        self.assertEqual(self.page.locator('[data-print=prediction] img').count(),0)
    def test_08_probability(self):
        self.load('probability')
        self.page.locator('[data-add="1000"]').click()
        p=self.page.locator('#proportion').inner_text()
        self.page.locator('#add-path').click();self.page.locator('#add-path').click()
        self.assertEqual(self.page.locator('#path-values tr').count(),3)
        self.page.screenshot(path=str(SHOTS/'probability.png'),full_page=True)
        self.page.locator('#reset').click();self.page.locator('[data-add="1000"]').click()
        self.assertEqual(self.page.locator('#proportion').inner_text(),p)
        self.page.locator('#p-number').fill('1')
        self.assertEqual(self.page.locator('#trials').inner_text(),'0')
        self.page.locator('[data-add="10"]').click()
        self.assertEqual(self.page.locator('#proportion').inner_text(),'1')
    def test_09_regression_and_drag(self):
        self.load('regression')
        self.page.locator('[data-preset=middle]').click()
        self.assertEqual(self.page.locator('#delta').inner_text(),'0')
        self.page.locator('[data-preset=low]').click()
        self.assertNotEqual(self.page.locator('#delta').inner_text(),'0')
        self.page.screenshot(path=str(SHOTS/'regression.png'),full_page=True)
        box=self.page.locator('[data-drag=point]').bounding_box()
        self.page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        self.page.mouse.down();self.page.mouse.move(box['x']-60,box['y']-60,steps=5);self.page.mouse.up()
        self.assertNotEqual(self.page.locator('#rx-number').input_value(),'11')
        self.page.locator('#include-point').uncheck()
        self.assertEqual(self.page.locator('#delta').inner_text(),'0')
    def test_10_mobile_and_tablet_widths(self):
        for width in [390,768,1440]:
            self.page.set_viewport_size({'width':width,'height':844})
            for name in ['index','quadratic','probability','regression','teacher-guide','about']:
                with self.subTest(width=width,page=name):
                    self.load(name)
                    self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'))
                    if width==390 and name=='quadratic':
                        self.page.screenshot(path=str(SHOTS/'quadratic-mobile.png'),full_page=True)
    def test_11_keyboard_and_projection(self):
        self.load('quadratic')
        self.page.locator('#a').focus();self.page.keyboard.press('ArrowRight')
        self.assertEqual(self.page.locator('#a-number').input_value(),'1.25')
        self.page.locator('#focus-mode').click()
        self.assertFalse(self.page.locator('.notebook').is_visible())
        self.page.locator('#focus-mode').click()
        self.assertTrue(self.page.locator('.notebook').is_visible())
    def test_12_limits_and_clear(self):
        self.load('quadratic')
        for _ in range(9):self.page.locator('#record').click()
        self.assertEqual(self.page.locator('#record-count').inner_text(),'8 / 8')
        self.page.on('dialog',lambda d:d.accept())
        self.page.locator('#clear-notes').click()
        self.assertEqual(self.page.locator('#record-count').inner_text(),'0 / 8')

if __name__=='__main__': unittest.main(verbosity=2)
