"""One-time production check for the supplied-asset collection and VIP Concierge."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('VIP_TEST_URL', 'http://localhost:3001')
OUT = Path(os.environ.get('VIP_TEST_OUTPUT', 'test-results/assets'))
OUT.mkdir(parents=True, exist_ok=True)
CATALOGUE = json.loads((Path(__file__).parents[1] / 'src/lib/reference-catalogue.json').read_text())
checks, errors, requests = [], [], []


def capture(page, name):
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / (name + '.png')))


def validate(browser):
    for theme in ['dark', 'light']:
        for label, width, height in [('desktop', 1440, 900), ('phone', 390, 844)]:
            ctx = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=label == 'phone', has_touch=label == 'phone')
            page = ctx.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda req: requests.append((req.method, req.url)))
            page.goto(BASE + '/?theme=' + theme)
            page.wait_for_load_state('networkidle')
            page.wait_for_function("document.documentElement.dataset.vipIntro === 'done'")
            expect(page.get_by_role('heading', name='Ferrari Roma.', exact=True)).to_be_visible()
            expect(page.locator('.hero-slide-image[data-active=true] .hero-plate img')).to_have_attribute('alt', CATALOGUE[0]['images'][0]['alt'])
            assert page.locator('.hero-slide-image[data-active=true] .hero-plate img').evaluate('image => image.complete && image.naturalWidth > 0')
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            capture(page, f'{theme}-{label}-home')
            if label == 'desktop':
                page.locator('.selected-section').evaluate('section => window.scrollTo({top: section.offsetTop - 20, behavior: "instant"})')
                capture(page, f'{theme}-{label}-selected')
            page.get_by_role('link', name='Explore inventory', exact=True).first.click()
            page.wait_for_load_state('networkidle')
            expect(page.locator('.vehicle-card')).to_have_count(len(CATALOGUE))
            # Verify every asset independently of browser lazy-load scheduling.
            page.locator('.vehicle-card img').evaluate_all('images => images.forEach(image => image.loading = "eager")')
            page.wait_for_function("[...document.querySelectorAll('.vehicle-card img')].every(image => image.complete && image.naturalWidth > 0)", timeout=10000)
            assert page.locator('.vehicle-card img[src*="placeholders"]').count() == 0
            page.locator('.result-toolbar').evaluate('toolbar => window.scrollTo({top: toolbar.getBoundingClientRect().top + scrollY - 25, behavior: "instant"})')
            capture(page, f'{theme}-{label}-inventory')
            if label == 'desktop':
                page.locator('.desktop-filters').get_by_label('Make', exact=True).select_option('BMW')
                page.get_by_role('button', name='Apply filters', exact=True).click()
                expect(page.locator('.vehicle-card')).to_have_count(sum(v['make'] == 'BMW' for v in CATALOGUE))
                page.reload()
                expect(page.locator('.desktop-filters').get_by_label('Make', exact=True)).to_have_value('BMW')
            page.goto(BASE + '/inventory/ferrari-roma-2022')
            page.wait_for_load_state('networkidle')
            expect(page.get_by_role('heading', name='Ferrari Roma', exact=True)).to_be_visible()
            page.get_by_role('button', name='Next image', exact=True).click()
            expect(page.get_by_role('button', name='View rear three-quarter image')).to_have_attribute('aria-pressed', 'true')
            expect(page.locator('.photo-credit')).to_contain_text('Alexander-93')
            page.get_by_role('button', name='Previous image', exact=True).focus()
            page.keyboard.press('ArrowLeft')
            expect(page.get_by_role('button', name='View front three-quarter image')).to_have_attribute('aria-pressed', 'true')
            capture(page, f'{theme}-{label}-vehicle')
            page.get_by_role('button', name='Open VIP Concierge', exact=True).click()
            chat = page.get_by_role('dialog', name='VIP Concierge')
            expect(chat.get_by_role('heading', name='VIP Concierge')).to_be_visible()
            chat.get_by_role('button', name='My budget is ₹50 lakh. What can I buy?', exact=True).click()
            expect(chat.get_by_role('log')).to_contain_text('Audi A6')
            capture(page, f'{theme}-{label}-concierge')
            # Navigating from a two-image vehicle to a one-image vehicle must reset gallery state.
            chat.get_by_role('link', name='Audi A6', exact=True).click()
            expect(page.get_by_role('heading', name='Audi A6', exact=True)).to_be_visible()
            expect(page.get_by_text('Single image plate')).to_be_visible()
            page.get_by_role('button', name='Enquire about this vehicle', exact=True).click()
            enquiry = page.get_by_role('dialog')
            enquiry.get_by_role('textbox', name='Your name').fill('Demo Visitor')
            enquiry.get_by_role('textbox', name='Email address').fill('demo@example.com')
            enquiry.get_by_role('textbox', name='Your message').fill('Please share details about this model-reference listing.')
            enquiry.get_by_role('button', name='Preview enquiry', exact=True).click()
            expect(enquiry.get_by_role('textbox', name='Enquiry text')).to_contain_text('audi-a6-45-tfsi-2021')
            expect(enquiry.get_by_role('textbox', name='Enquiry text')).to_contain_text('This enquiry has not been sent.')
            page.keyboard.press('Escape')
            page.get_by_role('button', name='Open VIP Concierge', exact=True).click()
            chat.get_by_role('textbox', name='Your message').fill('Tell me a joke')
            chat.get_by_role('textbox', name='Your message').press('Enter')
            expect(chat.get_by_role('log')).to_contain_text('Unable to connect to the server. Please try again later.')
            page.keyboard.press('Escape')
            page.goto(BASE + '/credits')
            page.wait_for_load_state('networkidle')
            expect(page.locator('.credits-list article')).to_have_count(len(CATALOGUE))
            expect(page.locator('.credits-list li')).to_have_count(sum(len(v['images']) for v in CATALOGUE))
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            checks.append(f'{theme}/{label}: hero and all 36 car photos, filters, paired gallery, single-image navigation, VIP Concierge, enquiry preview, fallback and 37 credits')
            ctx.close()
    assert not errors, errors
    assert all(method == 'GET' and url.startswith(BASE) for method, url in requests)


if __name__ == '__main__':
    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('VIP_CHROMIUM_EXECUTABLE'):
                options['executable_path'] = os.environ['VIP_CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**options)
            try:
                validate(browser)
            finally:
                browser.close()
    finally:
        (OUT / 'asset-results.json').write_text(json.dumps({'passed': checks, 'runtime_errors': errors}, indent=2))
    print('Completed asset integration checks:', len(checks))
