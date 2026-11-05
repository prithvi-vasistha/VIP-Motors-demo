"""Budget-photo results, demo quotes, seller contact and motion checks."""
import json
import re
import os
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('VIP_TEST_URL', 'http://localhost:3001')
OUT = Path(os.environ.get('VIP_TEST_OUTPUT', 'test-results/concierge'))
OUT.mkdir(parents=True, exist_ok=True)
rows = json.loads((Path(__file__).parents[1] / 'src/lib/reference-catalogue.json').read_text())
expected = {car['slug']: car for car in rows if car['price']['kind'] == 'numeric' and car['price']['amount'] <= 5000000}
checks, errors, requests = [], [], []


def capture(page, name):
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / (name + '.png')))


def latest(chat):
    return chat.locator('.chat-turn').last


def run(browser):
    for theme in ['dark', 'light']:
        for label, w, h in [('desktop', 1440, 900), ('phone', 390, 844)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, is_mobile=label == 'phone', has_touch=label == 'phone')
            page = ctx.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda req: requests.append((req.method, req.url)))
            page.goto(BASE + '/?theme=' + theme)
            page.wait_for_load_state('networkidle')
            page.wait_for_function("document.documentElement.dataset.vipIntro === 'done'")
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            capture(page, f'{theme}-{label}-home')
            page.get_by_role('button', name='Open VIP Concierge', exact=True).click()
            chat = page.get_by_role('dialog', name='Concierge', exact=True)
            chat.get_by_role('button', name='My budget is ₹50 lakh. What can I buy?', exact=True).click()
            reply = latest(chat)
            expect(reply.locator('.concierge-result')).to_have_count(3)
            expect(reply).to_contain_text(f'{len(expected)} vehicles are within ₹50 lakh')
            for result in reply.locator('.concierge-result').all():
                href = result.get_attribute('href')
                slug = urlparse(href).path.split('/')[-1]
                assert slug in expected
                image = result.locator('img')
                expect(image).to_be_visible()
                image.evaluate('image => image.loading = "eager"')
                image.wait_for(state='visible')
                page.wait_for_function('(image) => image.complete && image.naturalWidth > 0', arg=image.element_handle())
                image_path = parse_qs(urlparse(image.get_attribute('src')).query).get('url', [image.get_attribute('src')])[0]
                assert image_path.startswith('/cars/' + slug + '/')
                expect(result).to_contain_text('Indicative price')
            capture(page, f'{theme}-{label}-photo-quotes')
            chat.screenshot(path=str(OUT / f'{theme}-{label}-concierge-panel.png'))
            # The photograph itself is the navigation target, with the budget retained for Back.
            reply.locator('.concierge-result-image').first.click()
            expect(page.get_by_role('heading', name='Toyota Fortuner', exact=True)).to_be_visible()
            expect(page.locator('.detail-price')).to_have_text('₹46 lakh')
            expect(page.get_by_role('link', name='Back to your results')).to_have_attribute('href', '/inventory?maxPrice=5000000')
            page.get_by_role('link', name='Back to your results').click()
            expect(page.locator('.vehicle-card')).to_have_count(len(expected))
            page.reload()
            expect(page.locator('.vehicle-card')).to_have_count(len(expected))
            if label == 'desktop':
                expect(page.locator('.desktop-filters').get_by_label('Maximum price')).to_have_value('5000000')
            else:
                page.get_by_role('button', name='Filters (1)', exact=True).click()
                drawer = page.get_by_role('dialog', name='Refine the collection')
                expect(drawer.get_by_label('Maximum price')).to_have_value('5000000')
                drawer.get_by_role('button', name='Reset filters').click()
                expect(page.locator('.vehicle-card')).to_have_count(len(rows))
            page.get_by_role('button', name='Open VIP Concierge', exact=True).click()
            for question, budget in [('cars under 50 lakes', 5000000), ('cars within 1 crore', 10000000), ('cars under ₹45,00,000', 4500000)]:
                field = chat.get_by_role('textbox', name='Your message')
                field.fill(question)
                field.press('Enter')
                expect(latest(chat).locator('.concierge-result')).to_have_count(3)
                for result in latest(chat).locator('.concierge-result').all():
                    slug = urlparse(result.get_attribute('href')).path.split('/')[-1]
                    car = next(car for car in rows if car['slug'] == slug)
                    assert car['price']['amount'] <= budget
            field.fill('cars under 1 lakh');field.press('Enter')
            expect(latest(chat)).to_contain_text('There are no vehicles within ₹1 lakh')
            expect(latest(chat).locator('.concierge-result')).to_have_count(0)
            field.fill('Tell me a joke');field.press('Enter')
            expect(latest(chat)).to_contain_text('Unable to connect to the server. Please try again later.')
            page.keyboard.press('Escape')
            page.get_by_role('link', name='VIP Motors home').first.click()
            page.wait_for_load_state('networkidle')
            seller = page.locator('.sell-section')
            seller.scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            seller.screenshot(path=str(OUT / f'{theme}-{label}-sell-section.png'))
            seller.get_by_role('link', name='Get a fair quote', exact=True).click()
            expect(page).to_have_url(BASE + '/quote')
            expect(page.get_by_role('heading', name='Your car. Its next chapter.')).to_be_visible()
            form = page.locator('.valuation-form')
            for key, value in [('make', 'Toyota'), ('model', 'Fortuner'), ('variant', 'Legender'), ('year', '2023'), ('mileage', '35000')]:
                form.locator('[name="' + key + '"]').fill(value)
            for key, value in [('fuel', 'Diesel'), ('transmission', 'Automatic'), ('owners', '1'), ('condition', 'good'), ('accident', 'none'), ('service', 'full')]:
                form.locator('[name="' + key + '"]').select_option(value)
            form.get_by_role('button', name='Get my quote').click()
            expect(page.locator('.valuation-range')).to_be_visible()
            page.reload()
            expect(page.locator('.valuation-range')).to_be_visible()
            page.locator('.valuation-result').screenshot(path=str(OUT / f'{theme}-{label}-estimate.png'))
            capture(page, f'{theme}-{label}-valuation')
            expect(page.locator('.valuation-result a[href^="/contact"]')).to_have_count(0)
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            checks.append(f'{theme}/{label}: matching photo quotes, budget bounds/links/reload/reset, free-text variants, empty result, fallback, standalone quote generation/URL reload without a contact redirect')
            ctx.close()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    page = ctx.new_page();page.goto(BASE);page.wait_for_load_state('networkidle')
    page.get_by_role('link', name='Explore inventory', exact=True).first.click()
    expect(page.locator('.vehicle-card')).to_have_count(len(rows))
    assert page.locator('.route-stage').evaluate('element => element.getAnimations().length') == 0
    checks.append('Reduced motion: route transition is skipped and inventory remains immediate')
    ctx.close()
    assert not errors, errors
    assert all(method == 'GET' and url.startswith(BASE) for method, url in requests)
    checks.append('No runtime errors, external model calls, submitted leads or background requests')


if __name__ == '__main__':
    try:
        with sync_playwright() as p:
            opts = {'headless': True}
            if os.environ.get('VIP_CHROMIUM_EXECUTABLE'):
                opts['executable_path'] = os.environ['VIP_CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**opts)
            try:
                run(browser)
            finally:
                browser.close()
    finally:
        (OUT / 'concierge-results.json').write_text(json.dumps({'passed': checks, 'runtime_errors': errors}, indent=2))
    print('Completed concierge/seller scenarios:', len(checks))
