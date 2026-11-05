"""Finite production checks for approved branding, intro and seller estimate edge cases."""
import json, os
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright, expect
BASE = os.environ.get('VIP_TEST_URL', 'http://localhost:3001')
OUT = Path(os.environ.get('VIP_TEST_OUTPUT', 'test-results/branding'))
OUT.mkdir(parents=True, exist_ok=True)
errors, checks = [], []
params = dict(make='Toyota', model='Fortuner', variant='Legender', year='2023', mileage='35000', fuel='Diesel', transmission='Automatic', owners='1', condition='good', accident='none', service='full')

def capture(page, name):
    page.mouse.move(0, 0)
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / (name + '.png')))

def run(browser):
    for theme in ['dark', 'light']:
        for label, w, h in [('desktop',1440,900),('phone',390,844),('tablet',820,1180)]:
            ctx=browser.new_context(viewport={'width':w,'height':h}, is_mobile=label=='phone', has_touch=label=='phone')
            page=ctx.new_page();page.on('pageerror',lambda error: errors.append(str(error)))
            page.goto(BASE+'/?theme='+theme);page.wait_for_load_state('networkidle')
            expect(page.locator('.brand-home img')).to_have_attribute('src','/brand/vip-motors.png')
            expect(page.locator('.footer-brand img')).to_have_attribute('src','/brand/vip-motors.png')
            page.get_by_role('button',name='Open VIP Concierge',exact=True).click()
            chat=page.get_by_role('dialog',name='Concierge',exact=True)
            expect(chat.get_by_role('button',name='My budget is ₹50 lakh. What can I buy?',exact=True)).to_be_visible()
            capture(page,f'{theme}-{label}-concierge-welcome')
            chat.get_by_role('button',name='Which SUVs can I explore?',exact=True).click()
            expect(chat.locator('.concierge-result')).to_have_count(3)
            expect(chat.locator('.chat-turn').last).to_contain_text('Explore these SUVs')
            chat.get_by_role('button',name='How can I arrange a viewing?',exact=True).click()
            expect(chat.locator('.chat-turn').last).to_contain_text('preferred day and time')
            page.keyboard.press('Escape')
            expect(chat).not_to_be_visible()
            expect(page.get_by_role('button',name='Open VIP Concierge',exact=True)).to_be_focused()
            page.goto(BASE+'/quote')
            page.wait_for_load_state('networkidle')
            if label=='desktop': capture(page,f'{theme}-{label}-valuation-form')
            form=page.locator('.valuation-form')
            form.get_by_role('button',name='Get my quote').click()
            expect(form.locator('[name=make]')).to_be_focused()
            expect(form.locator('[aria-invalid=true]')).to_have_count(11)
            for key in ['make','model','variant','year','mileage']:
                form.locator('[name='+key+']').fill(params[key])
            for key in ['fuel','transmission','owners','condition','accident','service']:
                form.locator('[name='+key+']').select_option(params[key])
            form.locator('[name=mileage]').fill('-4')
            form.get_by_role('button',name='Get my quote').click()
            expect(form.locator('[name=mileage]')).to_be_focused()
            expect(form.locator('[name=make]')).to_have_value('Toyota')
            form.locator('[name=mileage]').fill('35000')
            form.get_by_role('button',name='Get my quote').click()
            expect(page.locator('.valuation-range')).to_be_visible()
            first=page.locator('.valuation-range strong').inner_text()
            form.locator('[name=mileage]').fill('150000')
            expect(page.locator('.valuation-range')).to_have_count(0)
            form.get_by_role('button',name='Get my quote').click()
            assert first != page.locator('.valuation-range strong').inner_text()
            page.reload();expect(form.locator('[name=mileage]')).to_have_value('150000')
            expect(page.locator('.valuation-range')).to_be_visible()
            form.locator('[name=model]').fill('Unlisted model')
            form.get_by_role('button',name='Get my quote').click()
            expect(form.locator('[name=originalPrice]')).to_be_focused()
            form.locator('[name=originalPrice]').fill('5500000')
            form.get_by_role('button',name='Get my quote').click()
            expect(page.locator('.valuation-result')).to_contain_text('Original price supplied')
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            checks.append(f'{theme}/{label}: approved PNG, three suggestions, SUV/viewing answers, Escape/focus, validation retains draft, mileage changes range, URL reload, unlisted model fallback, no overflow')
            ctx.close()
    # Existing vehicle-gallery controls remain usable alongside the new global branding.
    for label, w, h in [('desktop',1440,900),('phone',390,844),('tablet',820,1180)]:
        ctx=browser.new_context(viewport={'width':w,'height':h})
        page=ctx.new_page();page.goto(BASE+'/inventory/ferrari-roma-2022');page.wait_for_load_state('networkidle')
        gallery=page.get_by_role('region',name='Ferrari Roma image gallery')
        expect(gallery.locator('.gallery-position>span').first).to_have_text('01')
        gallery.get_by_role('button',name='Next image',exact=True).click()
        expect(gallery.locator('.gallery-position>span').first).to_have_text('02')
        gallery.get_by_role('button',name='Previous image',exact=True).focus();page.keyboard.press('ArrowLeft')
        expect(gallery.locator('.gallery-position>span').first).to_have_text('01')
        gallery.locator('.gallery-thumbnails button').nth(1).click()
        expect(gallery.locator('.gallery-position>span').first).to_have_text('02')
        capture(page,f'{label}-vehicle-gallery')
        page.get_by_role('button',name='Enquire about this vehicle',exact=True).click()
        expect(page.get_by_role('dialog').locator('.enquiry-context')).to_contain_text('Ferrari Roma')
        page.keyboard.press('Escape')
        checks.append(f'{label}: gallery arrows, keyboard and thumbnails, vehicle enquiry context')
        ctx.close()
    # Deep-link parameters yield a complete estimate from the server-rendered page.
    ctx=browser.new_context(viewport={'width':1440,'height':900})
    page=ctx.new_page();page.goto(BASE+'/quote?'+urlencode(params))
    expect(page.locator('.valuation-range')).to_be_visible()
    expect(page.locator('.valuation-result a[href^="/contact"]')).to_have_count(0)
    expect(page.get_by_role('button',name='Download my quote',exact=True)).to_be_visible()
    checks.append('Complete parameter deep link restores a standalone quote with a download action and no contact redirect')
    # A real first home visit settles; returning home in the same tab skips it.
    page.goto(BASE+'/');page.wait_for_load_state('networkidle')
    assert page.evaluate("sessionStorage.getItem('vip:intro:v2')")=='seen'
    expect(page.locator('.hero-intro')).not_to_be_visible()
    page.get_by_role('link',name='Explore inventory',exact=True).first.click()
    page.get_by_role('link',name='VIP Motors home',exact=True).first.click()
    expect(page.locator('.hero-intro')).not_to_be_visible()
    checks.append('First home intro completes; internal home return skips it')
    ctx.close()
    # Capture the header-only CSS reveal at 500ms; the hero car remains unobstructed.
    for label,w,h in [('desktop',1440,900),('phone',390,844)]:
        ctx=browser.new_context(viewport={'width':w,'height':h})
        page=ctx.new_page();page.goto(BASE+'/');page.wait_for_load_state('networkidle')
        page.evaluate("""() => {const layer=document.querySelector('.hero-intro'); document.documentElement.dataset.vipIntro='play'; delete layer.dataset.finished; getComputedStyle(layer).opacity; layer.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=500}); }""")
        expect(page.locator('.hero-intro')).to_be_visible()
        expect(page.locator('.intro-logo-reveal img')).to_have_attribute('src','/brand/vip-motors.png')
        capture(page,f'{label}-approved-logo-loading')
        page.locator('.hero-intro').screenshot(path=str(OUT/f'{label}-loading-closeup.png'))
        page.keyboard.press('Tab')
        expect(page.locator('.hero-intro')).not_to_be_visible()
        expect(page.get_by_role('link',name='Skip to content')).to_be_focused()
        checks.append(f'{label}: loading screenshot at actual CSS keyframe; keyboard ends intro and reaches skip link')
        ctx.close()
    ctx=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
    page=ctx.new_page();page.goto(BASE+'/');page.wait_for_load_state('networkidle')
    expect(page.locator('.hero-intro')).not_to_be_visible()
    assert page.evaluate("document.documentElement.dataset.vipIntro")=='done'
    checks.append('Reduced-motion visit gets settled hero immediately')
    ctx.close()
    # A failed hero never blocks navigation or useful copy.
    ctx=browser.new_context(viewport={'width':1440,'height':900})
    page=ctx.new_page()
    page.route('**/_next/image?*',lambda route: route.abort() if 'ferrari-roma' in route.request.url else route.continue_())
    page.goto(BASE+'/');page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading',name='Ferrari Roma.')).to_be_visible()
    expect(page.get_by_role('link',name='Explore inventory',exact=True).first).to_be_visible()
    capture(page,'missing-hero-fallback')
    checks.append('Missing hero retains designed copy and working inventory link')
    ctx.close()
    assert not errors,errors

if __name__=='__main__':
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
            try: run(browser)
            finally: browser.close()
    finally:
        (OUT/'brand-valuation-results.json').write_text(json.dumps({'passed':checks,'runtime_errors':errors},indent=2))
    print('Completed brand/valuation scenarios:',len(checks))
