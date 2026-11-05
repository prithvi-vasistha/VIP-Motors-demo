"""Production-browser coverage for finance, service briefs and every footer destination."""
import json,os,re,math
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3001')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/footer-services'));OUT.mkdir(parents=True,exist_ok=True)
checks,errors,console_errors,failures=[],[],[],[]

def visit(page,path):
    response=page.goto(BASE+path);assert response and response.status==200,(path,response.status if response else None)
    page.wait_for_load_state('networkidle')

def money_number(locator):return int(re.sub(r'[^0-9]','',locator.inner_text().split('/')[0]))
def monthly(principal,rate,months):
    r=rate/1200
    return principal/months if not r else principal*r/(1-(1+r)**(-months))
def no_overflow(page):assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.viewport_size

def run(browser):
    for theme,label,w,h in [('dark','desktop',1440,900),('light','desktop',1440,900),('dark','phone',390,844),('light','phone',390,844),('dark','tablet',820,1180)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce',permissions=['clipboard-read','clipboard-write'])
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);page.on('request',lambda r:failures.append(r.url) if r.method not in ['GET','HEAD'] else None)
        visit(page,'/finance?theme='+theme);expect(page.get_by_role('heading',level=1)).to_have_text('A plan foryour next drive.')
        expect(page.locator('#finance-vehicle')).to_have_value('mercedes-c220d-2023')
        assert abs(money_number(page.locator('.finance-emi output'))-monthly(3600000,12.9,60))<.6
        expect(page.locator('.finance-schedule tbody tr')).to_have_count(5);no_overflow(page)
        page.screenshot(path=str(OUT/f'{theme}-{label}-finance.png'))
        for key,val in [('price','5000000'),('deposit','1000000'),('rate','11.5')]:page.locator('#finance-'+key).fill(val)
        page.locator('#finance-months').select_option('48')
        assert abs(money_number(page.locator('.finance-emi output'))-monthly(4000000,11.5,48))<.6
        expect(page.locator('.finance-schedule tbody tr')).to_have_count(4)
        expect(page.locator('.finance-schedule tbody tr').last.locator('td').last).to_have_text('₹0')
        page.get_by_role('button',name='Save this plan',exact=True).click();assert parse_qs(urlparse(page.url).query)['months']==['48']
        page.reload();page.wait_for_load_state('networkidle');expect(page.locator('#finance-price')).to_have_value('5000000');expect(page.locator('#finance-months')).to_have_value('48')
        page.get_by_role('button',name='Copy plan link',exact=True).click();assert 'price=5000000' in page.evaluate('navigator.clipboard.readText()')
        page.locator('.finance-summary').scroll_into_view_if_needed();page.locator('.finance-summary').screenshot(path=str(OUT/f'{theme}-{label}-estimate.png'))
        if label=='phone':
            table=page.get_by_role('region',name='Yearly repayment schedule');table.focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(120);assert table.evaluate('(e)=>e.scrollLeft')>0
        page.get_by_role('link',name='Discuss this plan',exact=True).click();page.wait_for_url('**/contact?*');page.wait_for_load_state('networkidle')
        expect(page.locator('.enquiry-context strong')).to_have_text('Finance and insurance')
        draft=page.get_by_label('Your message');text=draft.input_value()
        for item in ['Mercedes-Benz C-Class','Loan amount: ₹40,00,000','Term: 48 months','11.5%']:assert item in text,item
        page.get_by_role('button',name='Prepare enquiry',exact=True).click();expect(page.get_by_label('Your name')).to_be_focused();assert draft.input_value()==text
        page.get_by_label('Your name').fill('Aarav Visitor');page.get_by_label('Email address').fill('buyer@example.com');page.get_by_role('button',name='Prepare enquiry',exact=True).click();expect(page.locator('.enquiry-preview h3')).to_have_text('Your enquiry is ready.');assert 'Loan amount: ₹40,00,000' in page.locator('.enquiry-output').input_value()
        page.locator('.inline-enquiry').screenshot(path=str(OUT/f'{theme}-{label}-finance-enquiry.png'))
        visit(page,'/finance')
        page.locator('#finance-price').fill('1000000');page.locator('#finance-deposit').fill('1200000');page.get_by_role('button',name='Save this plan',exact=True).click();expect(page.locator('#finance-deposit')).to_have_attribute('aria-invalid','true');expect(page.locator('#finance-deposit')).to_be_focused();assert page.locator('.finance-emi output').count()==0
        page.locator('#finance-deposit').fill('200000');page.locator('#finance-rate').fill('0');assert money_number(page.locator('.finance-emi output'))==round(800000/60)
        page.locator('#finance-deposit').fill('1000000');expect(page.locator('.finance-emi output')).to_contain_text('₹0');expect(page.locator('.finance-summary')).to_contain_text('No loan is needed')
        page.get_by_role('button',name='Reset',exact=True).click();expect(page.locator('#finance-price')).to_have_value('4500000');expect(page.locator('#finance-rate')).to_have_value('12.9')
        page.locator('.service-disclosure summary').click();expect(page.get_by_role('link',name='View the lending benchmark')).to_have_attribute('href','https://www.icici.bank.in/personal-banking/loans/car-loan/service-charges')
        page.get_by_role('link',name='Explore insurance',exact=True).click();page.wait_for_timeout(50)
        page.locator('#insurance-vehicle').select_option('toyota-fortuner-legender-2023');page.get_by_role('radio',name='Third-party cover',exact=False).check();page.get_by_role('checkbox',name='Ask about zero-depreciation cover').check();no_overflow(page)
        page.locator('#insurance').screenshot(path=str(OUT/f'{theme}-{label}-insurance.png'))
        page.get_by_role('link',name='Get an insurance quote',exact=True).click();page.wait_for_url('**/contact?*');page.wait_for_load_state('networkidle');expect(page.locator('.enquiry-context strong')).to_have_text('Insurance enquiry')
        for item in ['Toyota Fortuner','Third-party cover','Please check availability and price']:assert item in page.get_by_label('Your message').input_value()
        visit(page,'/warranty?vehicle=toyota-fortuner-legender-2023');page.locator('#warranty-term').select_option('24');page.locator('#warranty-driving').select_option('20000');expect(page.locator('.service-brief')).to_contain_text('62,000 km');no_overflow(page)
        page.screenshot(path=str(OUT/f'{theme}-{label}-warranty.png'));page.locator('.service-planner').screenshot(path=str(OUT/f'{theme}-{label}-warranty-plan.png'))
        page.get_by_role('link',name='Discuss warranty options',exact=True).click();page.wait_for_url('**/contact?*');page.wait_for_load_state('networkidle');expect(page.locator('.enquiry-context strong')).to_have_text('Extended warranty')
        for item in ['Toyota Fortuner','24 months','20,000 km']:assert item in page.get_by_label('Your message').input_value()
        if label=='phone':
            page.get_by_role('button',name='Menu',exact=False).click();menu=page.locator('.menu-panel');expect(menu).to_be_visible()
            for name in ['Home','The Inventory','Sell Your Car','Finance And Insurance','Extended Warranty','Compare Cars','About Us','Contact']:expect(menu.get_by_role('link',name=name,exact=True)).to_be_visible()
            menu.get_by_role('link',name='Finance And Insurance',exact=True).click();page.wait_for_url(BASE+'/finance');expect(menu).not_to_be_visible()
        ctx.close();checks.append(f'{theme} {label}: independent EMI check, live changes, amortisation, saved URL reload/copy, finance enquiry validation, zero-rate/full-payment, insurance and warranty briefs, keyboard and overflow')
    ctx=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    visit(page,'/');links=page.locator('footer a[href^="/"]').evaluate_all('(a)=>a.map(e=>({text:e.textContent.trim(),href:e.getAttribute("href")}))')
    audited=[]
    for link in links:
        if link['href'] in audited:continue
        visit(page,link['href']);expect(page.locator('main h1')).to_be_visible();no_overflow(page);audited.append(link['href'])
        if link['href'].startswith('/inventory?make='):
            expected=parse_qs(urlparse(link['href']).query)['make'][0];names=page.locator('.inventory-grid .vehicle-card h3').all_text_contents();assert names and all(n.startswith(expected+' ') for n in names),(expected,names)
        if '#showroom' in link['href']:assert page.locator('#showroom').bounding_box()['y']>=0
    checks.append('Every internal footer destination returns 200 and usable content: '+', '.join(audited))
    visit(page,'/inventory/toyota-fortuner-legender-2023');page.get_by_role('link',name='Explore finance',exact=True).click();page.wait_for_url('**/finance?vehicle=toyota-fortuner-legender-2023');expect(page.locator('#finance-vehicle')).to_have_value('toyota-fortuner-legender-2023');expect(page.locator('#finance-price')).to_have_value('4600000')
    visit(page,'/finance?price=-10&deposit=9999999&rate=bad&months=2');expect(page.locator('#finance-price')).to_have_attribute('aria-invalid','true');expect(page.locator('.finance-invalid')).to_be_visible();assert 'NaN' not in page.locator('body').inner_text()
    checks.append('Vehicle-to-finance context and malformed deep-link handling work')
    ctx.close();assert not errors,errors;assert not console_errors,console_errors;assert not failures,failures

if __name__=='__main__':
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
            try:run(browser)
            finally:browser.close()
    finally:(OUT/'verification.json').write_text(json.dumps({'passed':checks,'runtime_errors':errors,'console_errors':console_errors,'unexpected_non_read_requests':failures},indent=2))
    print('Completed finance/service scenarios:',len(checks))
