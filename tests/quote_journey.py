"""Production buyer-to-quote journey, local photos, simulation and downloadable demo pricing."""
import json, os
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3001')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/quote'))
OUT.mkdir(parents=True,exist_ok=True)
ROOT=Path(__file__).parents[1]
PHOTO=ROOT/'public/cars/toyota-fortuner-legender-2023/1.jpg'
checks,errors,requests=[],[],[]
examples=[('Fortuner · 2023','₹28.8 lakh','Toyota','Fortuner','4X2 Diesel AT','2023','60500','Diesel'),('C-Class · 2022','₹34.2 lakh','Mercedes-Benz','C-Class','C 200 BSVI','2022','21700','Petrol'),('XUV700 · 2023','₹14.9 lakh','Mahindra','XUV700','AX7 7Str AT','2023','52000','Petrol')]

def fill_vehicle(form, make='Toyota',model='Fortuner',variant='4X2 Diesel AT',year='2023',mileage='60500',fuel='Diesel'):
    for key,value in [('make',make),('model',model),('variant',variant),('year',year),('mileage',mileage)]: form.locator('[name='+key+']').fill(value)
    for key,value in [('fuel',fuel),('transmission','Automatic'),('owners','1'),('condition','good'),('accident','none'),('service','full')]: form.locator('[name='+key+']').select_option(value)

def screenshot(page,name):
    page.mouse.move(0,0);page.wait_for_timeout(180);page.screenshot(path=str(OUT/(name+'.png')))

def run(browser):
    for theme,label,w,h in [('dark','desktop',1440,900),('light','desktop',1440,900),('dark','phone',390,844),('light','phone',390,844),('dark','tablet',820,1180)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},permissions=['clipboard-read','clipboard-write'],accept_downloads=True,is_mobile=label=='phone',has_touch=label=='phone')
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda req:requests.append((req.method,req.url)))
        page.add_init_script("""window.quoteRevoked=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{window.quoteRevoked.push(url);revoke(url)};""")
        page.goto(BASE+'/?theme='+theme);page.wait_for_load_state('networkidle')
        expect(page.locator('.hero-visual .hero-slide-image[data-active=true] .hero-plate img')).to_be_visible()
        assert page.locator('.hero-visual .hero-intro').count()==0
        seller=page.locator('.sell-section')
        for link in seller.get_by_role('link').all(): assert link.get_attribute('href')=='/quote'
        seller.get_by_role('link',name='Get a fair quote',exact=True).click()
        expect(page).to_have_url(BASE+'/quote');page.wait_for_load_state('networkidle')
        screenshot(page,f'{theme}-{label}-quote-form')
        form=page.locator('.valuation-form')
        form.get_by_role('button',name='Get my quote',exact=True).click()
        expect(form.locator('[name=make]')).to_be_focused()
        expect(form.locator('[aria-invalid=true]')).to_have_count(11)
        assert page.locator('.valuation-range').count()==0
        for index,(example,expected_price,make,model,variant,year,mileage,fuel) in enumerate(examples):
            fill_vehicle(form,make,model,variant,year,mileage,fuel)
            expect(form.locator('[name=make]')).to_have_value(make)
            expect(form.locator('[name=model]')).to_have_value(model)
            if index==0:
                form.locator('input[type=file]').set_input_files(str(PHOTO))
                expect(form.locator('.quote-photo-grid li')).to_have_count(1)
                local_src=form.locator('.quote-photo-grid img').get_attribute('src')
                assert local_src.startswith('blob:')
                assert form.locator('.quote-photo-grid img').evaluate('image=>image.complete && image.naturalWidth>0')
                form.locator('.quote-photo-fieldset').scroll_into_view_if_needed()
                screenshot(page,f'{theme}-{label}-photo-upload')
            form.get_by_role('button',name='Get my quote',exact=True).click()
            expect(page.get_by_role('heading',name='Preparing your quote.',exact=True)).to_be_visible()
            expect(form.locator('[name=make]')).to_be_disabled()
            if index==0: screenshot(page,f'{theme}-{label}-generating')
            expect(page.locator('.quote-estimate>strong')).to_have_text(expected_price,timeout=10000)
            expect(page.locator('.valuation-result')).to_contain_text(make+' '+model)
            expect(page).to_have_url(BASE+'/quote?'+urlparse(page.url).query)
            assert page.locator('.valuation-result a[href^="/contact"]').count()==0
            assert parse_qs(urlparse(page.url).query)['model'][0]==model
            if index==0:
                expect(page.locator('.quote-particle-output .generation-preview-image')).to_have_attribute('src',local_src)
                screenshot(page,f'{theme}-{label}-quote-result')
                page.locator('.valuation-result').screenshot(path=str(OUT/f'{theme}-{label}-result-card.png'))
            with page.expect_download() as info:
                page.get_by_role('button',name='Download my quote',exact=True).click()
            download=info.value
            assert download.suggested_filename.endswith('.txt')
            text=Path(download.path()).read_text()
            for fragment in [make,model,'Indicative quote: '+expected_price,'subject to vehicle inspection']:
                assert fragment in text,fragment
            page.get_by_role('button',name='Copy quote',exact=True).click()
            expect(page.locator('.valuation-copy-status')).to_have_text('Quote copied.')
            assert expected_price in page.evaluate('navigator.clipboard.readText()')
            if index==0:
                form.get_by_role('button',name='Remove 1.jpg',exact=True).click()
                assert page.evaluate('(url)=>window.quoteRevoked.includes(url)',local_src)
                expect(page.locator('.quote-particle-output')).to_have_count(0)
            page.reload();page.wait_for_load_state('networkidle')
            expect(page.locator('.quote-estimate>strong')).to_have_text(expected_price)
            expect(page.locator('.quote-photo-grid li')).to_have_count(0)
        page.get_by_role('button',name='Get a quote for another car',exact=True).click()
        expect(page).to_have_url(BASE+'/quote')
        expect(form.locator('[name=make]')).to_have_value('')
        assert page.locator('.valuation-range').count()==0
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        checks.append(f'{theme}/{label}: home CTA, validation, local photo/remove/revocation, all 3 sourced quotes, visible generation state, download/copy, no contact redirect, URL reload and new-car reset')
        ctx.close()
    ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'/quote');page.wait_for_load_state('networkidle')
    form=page.locator('.valuation-form');upload=form.locator('input[type=file]')
    upload.set_input_files({'name':'not-a-photo.txt','mimeType':'text/plain','buffer':b'test'})
    expect(page.locator('.quote-photo-upload [role=alert]')).to_contain_text('JPG, PNG or WebP')
    upload.set_input_files({'name':'broken.jpg','mimeType':'image/jpeg','buffer':b'not an image'})
    expect(page.locator('.quote-photo-upload [role=alert]')).to_contain_text('couldn’t be opened')
    upload.set_input_files({'name':'too-large.jpg','mimeType':'image/jpeg','buffer':b'x'*(8*1024*1024+1)})
    expect(page.locator('.quote-photo-upload [role=alert]')).to_contain_text('under 8 MB')
    upload.set_input_files([{'name':f'car-{i}.jpg','mimeType':'image/jpeg','buffer':PHOTO.read_bytes()} for i in range(5)])
    expect(page.locator('.quote-photo-upload [role=alert]')).to_contain_text('up to 4 photos')
    fill_vehicle(form)
    upload.set_input_files([{'name':f'car-{i}.jpg','mimeType':'image/jpeg','buffer':PHOTO.read_bytes()} for i in range(4)])
    expect(form.locator('.quote-photo-grid li')).to_have_count(4)
    form.get_by_role('button',name='Get my quote',exact=True).click()
    expect(page.locator('.quote-processing')).to_be_visible()
    expect(page.locator('.quote-particle-output .red-dot-loader')).to_have_attribute('data-motion','static')
    expect(page.locator('.quote-particle-output .red-dot-loader')).to_have_attribute('data-rendering','false')
    page.get_by_role('button',name='Cancel and edit details',exact=True).click()
    page.wait_for_timeout(4600)
    assert page.locator('.valuation-range').count()==0
    expect(form.locator('[name=make]')).to_have_value('Toyota')
    expect(form.locator('[name=make]')).to_be_focused()
    form.locator('[name=mileage]').fill('-5')
    form.get_by_role('button',name='Get my quote',exact=True).click()
    expect(form.locator('[name=mileage]')).to_be_focused()
    expect(form.locator('.quote-photo-grid li')).to_have_count(4)
    form.locator('[name=mileage]').fill('45000')
    form.locator('[name=make]').fill('Unlisted make');form.locator('[name=model]').fill('Unlisted model')
    form.get_by_role('button',name='Get my quote',exact=True).click()
    expect(form.locator('[name=originalPrice]')).to_be_focused()
    form.locator('[name=originalPrice]').fill('2000000')
    form.get_by_role('button',name='Get my quote',exact=True).click()
    expect(page.locator('.quote-estimate>strong')).to_be_visible(timeout=10000)
    expect(page.locator('.valuation-summary')).to_contain_text('Original price supplied')
    screenshot(page,'unlisted-model-estimate')
    page.get_by_role('button',name='Edit details',exact=True).click()
    form.locator('[name=mileage]').fill('150000')
    assert page.locator('.valuation-range').count()==0
    checks.append('Invalid/corrupt/oversized/excess photos rejected, 4 valid photos accepted, cancellation clears timers, invalid mileage keeps photo/draft, unknown model fallback works, edits clear stale quotes, reduced motion disables orbit')
    ctx.close()
    assert not errors,errors
    assert all(method=='GET' and (url.startswith(BASE) or url.startswith('blob:') or url.startswith('data:')) for method,url in requests),requests
    checks.append('No runtime errors, external AI calls, photo uploads or lead submissions')

if __name__=='__main__':
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
            try: run(browser)
            finally: browser.close()
    finally:
        (OUT/'quote-journey-results.json').write_text(json.dumps({'passed':checks,'runtime_errors':errors},indent=2))
    print('Completed standalone-quote scenarios:',len(checks))
