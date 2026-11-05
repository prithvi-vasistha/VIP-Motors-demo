"""Automatic ambience, processing crosses and customer-facing copy in the production build."""
import json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3001')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/presentation'))
OUT.mkdir(parents=True,exist_ok=True)
ROOT=Path(__file__).parents[1]
checks,errors,console_errors=[],[],[]
BANNED=re.compile(r'\b(demo|test|testing|preview|procedural|simulation|simulated|illustrative)\b',re.I)
INSTRUMENT="""(()=>{const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){this.canvas.draws=(this.canvas.draws||0)+1;return clear.apply(this,args)}})()"""

def clean(page):
    text=page.locator('body').inner_text()
    attrs=page.locator('body').evaluate("e=>[...e.querySelectorAll('[alt],[aria-label],[placeholder],[title]')].flatMap(n=>['alt','aria-label','placeholder','title'].map(a=>n.getAttribute(a)||'')).join(' ')")
    match=BANNED.search(text+' '+attrs)
    assert not match,(page.url,match.group(0),text)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')

def fill(form):
    for name,value in [('make','Toyota'),('model','Fortuner'),('variant','4X2 Diesel AT'),('year','2023'),('mileage','60500')]:form.locator('[name='+name+']').fill(value)
    for name,value in [('fuel','Diesel'),('transmission','Automatic'),('owners','1'),('condition','good'),('accident','none'),('service','full')]:form.locator('[name='+name+']').select_option(value)

def capture(page,name):
    page.mouse.move(0,0);page.wait_for_timeout(200);page.screenshot(path=str(OUT/(name+'.png')))

def run(browser):
    for theme in ['dark','light']:
        for label,w,h in [('desktop',1440,900),('phone',390,844),('tablet',820,1180)]:
            ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=2,permissions=['clipboard-read','clipboard-write'],accept_downloads=True)
            page=ctx.new_page();page.add_init_script(INSTRUMENT)
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('console',lambda msg:console_errors.append(msg.text) if msg.type=='error' else None)
            page.goto(BASE+'/?theme='+theme);page.wait_for_load_state('networkidle')
            field=page.locator('.hero-ambient .red-dot-loader')
            expect(field).to_have_attribute('data-character','dot');expect(field).to_have_attribute('data-rendering','true')
            expect(page.locator('.hero-ambient')).to_have_attribute('aria-hidden','true')
            assert page.locator('.hero-ambient').evaluate('e=>getComputedStyle(e).pointerEvents')=='none'
            box=field.bounding_box();assert abs(box['width']-w)<1 and abs(box['height']-h)<1,box
            assert float(page.locator('.hero-ambient').evaluate('e=>getComputedStyle(e).opacity'))<=.3
            canvas=field.locator('canvas');first=canvas.evaluate('c=>c.draws')
            page.wait_for_timeout(1500);assert canvas.evaluate('c=>c.draws')>first+20
            expect(page.locator('.hero-visual .hero-slide-image[data-active=true] .hero-plate img')).to_be_visible()
            assert page.locator('.hero-visual .hero-slide-image[data-active=true] .hero-plate img').evaluate('e=>{let r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e}')
            assert page.locator('.hero-visual .red-dot-loader').count()==0
            assert page.locator('.preview-banner,.particle-demo-controls,.quote-examples').count()==0
            assert page.locator('.hero-ambient').get_by_role('button').count()==0
            clean(page);capture(page,f'{theme}-{label}-home')
            page.get_by_role('link',name='Explore inventory',exact=True).first.click()
            expect(page.locator('.inventory-page')).to_be_visible();expect(page.locator('.hero-ambient')).to_have_count(0)
            clean(page)
            page.get_by_role('button',name='Open VIP Concierge',exact=True).click()
            chat=page.get_by_role('dialog',name='Concierge',exact=True)
            chat.get_by_role('button',name='My budget is ₹50 lakh. What can I buy?',exact=True).click()
            expect(chat.locator('.concierge-result')).to_have_count(3);clean(page)
            capture(page,f'{theme}-{label}-concierge')
            chat.locator('.concierge-result-image').first.click()
            expect(page.get_by_role('heading',name='Toyota Fortuner',exact=True)).to_be_visible();clean(page)
            page.get_by_role('button',name='Enquire about this vehicle',exact=True).click()
            dialog=page.get_by_role('dialog',name='Make an enquiry')
            dialog.get_by_role('button',name='Prepare enquiry',exact=True).click()
            expect(dialog.get_by_role('textbox',name='Your name')).to_be_focused()
            dialog.get_by_role('textbox',name='Your name').fill('Vehicle Buyer')
            dialog.get_by_role('textbox',name='Email address').fill('buyer@example.com')
            dialog.get_by_role('textbox',name='Your message').fill('Please share current photographs and viewing availability for this vehicle.')
            dialog.get_by_role('button',name='Prepare enquiry',exact=True).click()
            expect(dialog.get_by_role('textbox',name='Enquiry text')).to_contain_text('Copy and share this enquiry with VIP Motors.')
            clean(page);page.keyboard.press('Escape')
            page.goto(BASE+'/quote');page.wait_for_load_state('networkidle');clean(page)
            form=page.locator('.valuation-form');fill(form)
            form.locator('input[type=file]').set_input_files(str(ROOT/'public/cars/toyota-fortuner-legender-2023/1.jpg'))
            expect(form.locator('.quote-photo-grid li')).to_have_count(1)
            form.get_by_role('button',name='Get my quote',exact=True).click()
            cross=page.locator('.quote-particle-output .red-dot-loader')
            expect(cross).to_have_attribute('data-character','cross');expect(cross).to_have_attribute('data-rendering','true')
            expect(page.get_by_role('heading',name='Preparing your quote.',exact=True)).to_be_visible();clean(page)
            page.wait_for_timeout(900);capture(page,f'{theme}-{label}-quote-crosses')
            expect(page.locator('.quote-estimate>strong')).to_have_text('₹28.8 lakh',timeout=10000)
            expect(page.locator('.generation-preview-image')).to_be_visible();expect(cross).to_have_attribute('data-rendering','false')
            page.wait_for_timeout(550);clean(page);capture(page,f'{theme}-{label}-quote')
            page.get_by_role('button',name='Copy quote',exact=True).click()
            copied=page.evaluate('navigator.clipboard.readText()');assert not BANNED.search(copied),copied
            assert 'subject to vehicle inspection' in copied
            with page.expect_download() as info:page.get_by_role('button',name='Download my quote',exact=True).click()
            downloaded=Path(info.value.path()).read_text();assert not BANNED.search(downloaded)
            checks.append(f'{theme}/{label}: automatic dots behind unobscured hero, no motion controls, clean inventory/chat/vehicle/enquiry copy, cross-symbol quote loading, photo crossfade, clean copy/download')
            ctx.close()
    ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=ctx.new_page();page.add_init_script(INSTRUMENT);page.goto(BASE);page.wait_for_load_state('networkidle')
    field=page.locator('.hero-ambient .red-dot-loader');expect(field).to_have_attribute('data-motion','static');expect(field).to_have_attribute('data-rendering','false')
    n=field.locator('canvas').evaluate('c=>c.draws');page.wait_for_timeout(300);assert field.locator('canvas').evaluate('c=>c.draws')==n
    page.emulate_media(reduced_motion='no-preference');expect(field).to_have_attribute('data-rendering','true')
    page.goto(BASE+'/quote');page.wait_for_load_state('networkidle');fill(page.locator('.valuation-form'))
    page.emulate_media(reduced_motion='reduce');page.get_by_role('button',name='Get my quote',exact=True).click()
    field=page.locator('.quote-particle-output .red-dot-loader');expect(field).to_have_attribute('data-character','cross');expect(field).to_have_attribute('data-rendering','false')
    expect(field).to_have_attribute('data-motion','static')
    page.get_by_role('button',name='Cancel and edit details',exact=True).click()
    expect(page.locator('.red-dot-loader')).to_have_count(0)
    checks.append('OS reduced-motion preference gives static dots/crosses; live preference change resumes; quote cancellation unmounts renderer')
    for path in ['/contact','/credits']:
        page.goto(BASE+path);page.wait_for_load_state('networkidle');clean(page)
    response=page.goto(BASE+'/motion-preview');assert response.status==404
    checks.append('Contact/credit copy clean and former motion playground no longer exists')
    ctx.close()
    assert not errors,errors
    assert not console_errors,console_errors

if __name__=='__main__':
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
            try:run(browser)
            finally:browser.close()
    finally:(OUT/'presentation-results.json').write_text(json.dumps({'passed':checks,'runtime_errors':errors,'console_errors':console_errors},indent=2))
    print('Completed presentation scenarios:',len(checks))
