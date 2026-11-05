"""Check the showroom, footer destinations and concierge launcher in the production build."""
import json, os
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3001')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/showroom-footer'));OUT.mkdir(parents=True,exist_ok=True)
MAP='https://www.google.com/maps/place/VIP+Motors+Bengaluru/data=!4m2!3m1!1s0x3bae3d00274a8247:0xb702134b5bddbe2?sa=X&ved=1t:242&ictx=111'
INSTAGRAM='https://www.instagram.com/vipmotors.india?obrf=aTRxbmpzamgyeDZ2'
checks,errors,console_errors,measurements=[],[],[],[]

def visit(page,path):
    response=page.goto(BASE+path);assert response and response.status==200,(path,response.status if response else None)
    page.wait_for_load_state('networkidle')

def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.viewport_size

def run(browser):
    for theme,label,w,h in [('dark','desktop',1440,900),('light','desktop',1440,900),('dark','phone',390,844),('light','phone',390,844),('dark','tablet',820,1180)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce')
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
        visit(page,'/?theme='+theme)
        # The launcher drawing is geometrically centred; no text baseline is involved.
        geometry=page.locator('.launcher-plus').evaluate('''circle=>{const svg=circle.querySelector('svg'),a=circle.getBoundingClientRect(),b=svg.getBoundingClientRect(),p=svg.querySelector('path').getBBox();return {dx:(b.x+b.width/2)-(a.x+a.width/2),dy:(b.y+b.height/2)-(a.y+a.height/2),pathX:p.x+p.width/2,pathY:p.y+p.height/2}}''')
        assert abs(geometry['dx'])<.1 and abs(geometry['dy'])<.1 and geometry['pathX']==8 and geometry['pathY']==8,geometry
        measurements.append({'theme':theme,'width':w,**geometry})
        page.get_by_role('button',name='Open Concierge',exact=True).click();expect(page.get_by_role('dialog',name='Concierge',exact=True)).to_be_visible();page.keyboard.press('Escape');expect(page.get_by_role('button',name='Open Concierge',exact=True)).to_be_focused()
        showroom=page.locator('#showroom');footer=page.locator('footer')
        assert showroom.evaluate('(e)=>e.nextElementSibling.tagName')=='FOOTER'
        expect(showroom.get_by_role('heading',name='Come and see the cars in person.')).to_be_visible()
        for region in [showroom,footer]:
            text=region.inner_text()
            for item in ['Magadi Main Road, opp. Shell petrol bunk','Rajajinagar, Bengaluru, Karnataka','+91 97318 61111','Open daily, 10:00 am to 8:30 pm','@vipmotors.india']:assert item in text,item
            for a in region.locator('a[href^="https://www.google.com/maps/"]').all():
                assert a.get_attribute('href')==MAP
                assert a.get_attribute('target')=='_blank' and 'noopener' in a.get_attribute('rel')
            for a in region.get_by_role('link',name='@vipmotors.india',exact=True).all():assert a.get_attribute('href')==INSTAGRAM
        expect(footer.get_by_role('link',name='vipmotorsindia@yahoo.com')).to_have_attribute('href','mailto:vipmotorsindia@yahoo.com')
        expect(footer.locator('.footer-brand img')).to_have_attribute('src','/brand/vip-motors.png')
        expect(footer.locator('.footer-promise')).to_contain_text('Luxury')
        showroom.scroll_into_view_if_needed();page.wait_for_function('document.querySelector(".showroom-visit-photo img").naturalWidth>0')
        no_overflow(page)
        # Frame the section deliberately below the sticky header, with its full content saved separately.
        showroom.evaluate('(e)=>window.scrollTo({top:e.offsetTop-106,behavior:"instant"})');page.wait_for_timeout(100)
        page.screenshot(path=str(OUT/f'{theme}-{label}-visit.png'))
        showroom.screenshot(path=str(OUT/f'{theme}-{label}-visit-section.png'))
        footer.screenshot(path=str(OUT/f'{theme}-{label}-footer.png'))
        page.evaluate('window.scrollTo({top:document.body.scrollHeight,behavior:"instant"})');page.wait_for_timeout(80)
        page.screenshot(path=str(OUT/f'{theme}-{label}-footer-viewport.png'))
        # At the bottom the chat launcher leaves the legal link visible and clickable.
        legal=footer.get_by_role('link',name='Legal',exact=True)
        assert legal.evaluate('(a)=>{const r=a.getBoundingClientRect();return a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
        visit(page,'/about');page.locator('.about-showroom-photo').scroll_into_view_if_needed();page.wait_for_function('document.querySelector(".about-showroom-photo").naturalWidth>0');no_overflow(page)
        if label=='desktop':page.screenshot(path=str(OUT/f'{theme}-about.png'))
        visit(page,'/compare');expect(page.locator('.compare-table tbody tr')).to_have_count(7);no_overflow(page)
        if label=='phone':
            region=page.get_by_role('region',name='Vehicle comparison');assert region.evaluate('(e)=>e.scrollWidth>e.clientWidth');region.focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(100)
        page.screenshot(path=str(OUT/f'{theme}-{label}-compare.png'))
        ctx.close();checks.append(f'{theme} {label}: centred plus, chat Escape/focus, showroom assets, matching business details, footer/section order, legal access and no overflow')
    ctx=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    visit(page,'/')
    buy=page.get_by_role('navigation',name='Buy by brand');links=[(a.inner_text(),a.get_attribute('href')) for a in buy.get_by_role('link').all()]
    for label,href in links:
        visit(page,href);cards=page.locator('.inventory-grid .vehicle-card h3');assert cards.count()>0
        if label!='All Stock':assert all(s.startswith(label+' ') for s in cards.all_text_contents()),(label,cards.all_text_contents())
    checks.append('All six brand links filter real catalogue records; All Stock lists the collection')
    for topic,title,text in [('finance-insurance','Finance and insurance','finance for'),('extended-warranty','Extended warranty','extended warranty')]:
        visit(page,'/');page.get_by_role('navigation',name='VIP Motors',exact=True).get_by_role('link',name=title.title(),exact=True).click();page.wait_for_url(BASE+('/finance' if topic=='finance-insurance' else '/warranty'));page.get_by_role('link',name='Discuss this plan' if topic=='finance-insurance' else 'Discuss warranty options',exact=True).click();page.wait_for_url('**/contact?*');page.wait_for_load_state('networkidle')
        expect(page.locator('.enquiry-context strong')).to_have_text(title);assert text in page.get_by_label('Your message').input_value()
        page.get_by_role('button',name='Prepare enquiry',exact=True).click();expect(page.get_by_label('Your name')).to_have_attribute('aria-invalid','true');assert text in page.get_by_label('Your message').input_value()
    checks.append('Finance/insurance and warranty links open context-aware enquiries and preserve text on invalid submit')
    for label,path in [('Sell Or Exchange','/quote'),('About Us','/about'),('Compare Cars','/compare')]:
        visit(page,'/');page.get_by_role('navigation',name='VIP Motors',exact=True).get_by_role('link',name=label,exact=True).click();page.wait_for_url(BASE+path);page.wait_for_load_state('networkidle');assert urlparse(page.url).path==path;expect(page.locator('main h1')).to_be_visible()
    visit(page,'/about');page.get_by_role('navigation',name='VIP Motors',exact=True).get_by_role('link',name='Visit The Showroom',exact=True).click();page.wait_for_timeout(150);expect(page).to_have_url(BASE+'/#showroom');assert page.locator('#showroom').bounding_box()['y']>=0
    page.locator('#showroom').get_by_role('link',name='Contact the team').click();page.wait_for_url(BASE+'/contact');page.wait_for_load_state('networkidle');assert urlparse(page.url).path=='/contact'
    checks.append('Selling, About Us, showroom anchor, comparison and Contact the team links reach their correct destinations')
    visit(page,'/compare');first=page.locator('[name=first]').input_value();options=page.locator('[name=second] option').evaluate_all('(items)=>items.map(i=>i.value)');second=next(o for o in reversed(options) if o!=first)
    page.locator('[name=second]').select_option(second);page.get_by_role('button',name='Compare cars',exact=True).click();page.wait_for_load_state('networkidle');assert parse_qs(urlparse(page.url).query)['second']==[second]
    old=page.locator('.compare-table').inner_text();page.reload();page.wait_for_load_state('networkidle');assert page.locator('.compare-table').inner_text()==old
    visit(page,f'/compare?first={first}&second={first}');expect(page.locator('.compare-notice')).to_contain_text('two different cars');assert page.locator('[name=first]').input_value()!=page.locator('[name=second]').input_value()
    checks.append('Comparison GET selections survive refresh, show matching specs and handle duplicate car choices')
    ctx.close();assert not errors,errors;assert not console_errors,console_errors

if __name__=='__main__':
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
            try:run(browser)
            finally:browser.close()
    finally:(OUT/'verification.json').write_text(json.dumps({'passed':checks,'launcher_measurements':measurements,'runtime_errors':errors,'console_errors':console_errors},indent=2))
    print('Completed showroom/footer scenarios:',len(checks))
