"""V2-specific checks against the locally running production server."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('VIP_TEST_URL', 'http://localhost:3001')
OUT = Path(os.environ.get('VIP_TEST_OUTPUT', 'test-results/v2'))
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []
requests = []
QUESTIONS = ['My budget is ₹50 lakh. What can I buy?', 'Which SUVs can I explore?', 'How can I arrange a viewing?']


def passed(name):
    checks.append(name)
    print('PASS', name, flush=True)


def shot(page, name):
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / (name + '.png')))


def no_overflow(page):
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')


def run(browser):
    for theme in ['dark', 'light']:
        for label, w, h in [('desktop', 1440, 900), ('phone', 390, 844), ('tablet', 834, 1112)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, is_mobile=(label == 'phone'), has_touch=(label == 'phone'))
            page = ctx.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            page.on('request', lambda request: requests.append((request.method, request.url)))
            page.goto(BASE + '/?theme=' + theme)
            page.wait_for_load_state('networkidle')
            expect(page.locator('html')).to_have_attribute('data-theme', theme)
            assert page.evaluate('getComputedStyle(document.documentElement).colorScheme') == theme
            expect(page.locator('meta[name="theme-color"]')).to_have_attribute('content', '#f7f6f3' if theme == 'light' else '#0c0d10')
            no_overflow(page)
            shot(page, f'{theme}-{label}-home')
            page.get_by_role('button', name='Open VIP Concierge', exact=True).click()
            dialog = page.get_by_role('dialog', name='VIP Concierge')
            expect(dialog).to_be_visible()
            expect(dialog.locator('.chat-suggestion')).to_have_count(3)
            expect(dialog.get_by_role('textbox')).to_have_count(1)
            for question in QUESTIONS:
                expect(dialog.get_by_role('button', name=question, exact=True)).to_be_visible()
            shot(page, f'{theme}-{label}-chat')
            composer = dialog.get_by_role('textbox', name='Your message')
            expect(dialog.get_by_role('button', name='Send message')).to_be_disabled()
            composer.fill('What is your favourite colour?')
            composer.press('Enter')
            expect(dialog.get_by_role('log')).to_contain_text('Unable to connect to the server. Please try again later.')
            expect(composer).to_have_value('')
            composer.fill('What can I buy for ₹50 lakh?')
            dialog.get_by_role('button', name='Send message').click()
            expect(dialog.locator('.chat-answer-links a')).to_have_count(3)
            dialog.get_by_role('button', name='Start again').click()

            dialog.get_by_role('button', name=QUESTIONS[0], exact=True).click()
            expect(dialog.get_by_role('log')).to_contain_text('Prices are unconfirmed')
            expect(dialog.locator('.chat-answer-links a')).to_have_count(3)
            shot(page, f'{theme}-{label}-budget')
            no_overflow(page)
            bounds = dialog.bounding_box()
            assert bounds['x'] >= 0 and bounds['y'] >= 0
            assert bounds['x'] + bounds['width'] <= w + 1
            assert bounds['y'] + bounds['height'] <= h + 1
            dialog.get_by_role('link', name='Mercedes-Benz C-Class', exact=True).click()
            expect(page).to_have_url(BASE + '/inventory/mercedes-c220d-2023')
            expect(page.get_by_role('heading', name='Mercedes-Benz C-Class', exact=True)).to_be_visible()
            expect(page.get_by_role('dialog')).to_have_count(0)
            expect(page.locator('html')).to_have_attribute('data-theme', theme)
            page.get_by_role('button', name='Open VIP Concierge', exact=True).click()
            dialog.get_by_role('button', name=QUESTIONS[1], exact=True).click()
            expect(dialog.get_by_role('log')).to_contain_text('Range Rover Velar')
            dialog.get_by_role('link', name='Explore the SUV collection').click()
            expect(page).to_have_url(BASE + '/inventory?body=SUV')
            expect(page.locator('.vehicle-card')).to_have_count(17)
            page.get_by_role('button', name='Open VIP Concierge', exact=True).click()
            dialog.get_by_role('button', name=QUESTIONS[2], exact=True).click()
            expect(dialog.get_by_role('log')).to_contain_text('does not send enquiries or confirm appointments')
            dialog.get_by_role('link', name='Prepare a general enquiry').click()
            expect(page).to_have_url(BASE + '/contact')
            expect(page.get_by_role('textbox', name='Your name')).to_be_visible()
            shot(page, f'{theme}-{label}-contact')
            no_overflow(page)
            page.get_by_role('button', name='Open VIP Concierge', exact=True).click()
            dialog.get_by_role('button', name='Start again', exact=True).click()
            expect(dialog.locator('.chat-turn')).to_have_count(0)
            page.keyboard.press('Escape')
            expect(dialog).not_to_be_visible()
            expect(page.get_by_role('button', name='Open VIP Concierge', exact=True)).to_be_focused()
            # The only stored preference is theme; neither conversations nor personal details persist.
            assert page.evaluate('Object.keys(localStorage)') == ['vip:v2:theme']
            assert page.evaluate('Object.keys(sessionStorage)') == ['vip:intro:v2']
            passed(f'{theme}/{label}: 3 clickable answers, budget links, SUV filters, viewing enquiry, reset, Escape/focus and containment')
            ctx.close()

    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
    page.get_by_role('button', name='Switch to light theme').click()
    expect(page.locator('html')).to_have_attribute('data-theme', 'light')
    expect(page.locator('meta[name="theme-color"]')).to_have_attribute('content', '#f7f6f3')
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('html')).to_have_attribute('data-theme', 'light')
    page.get_by_role('link', name='Explore inventory', exact=True).first.click()
    expect(page.locator('html')).to_have_attribute('data-theme', 'light')
    page.get_by_role('button', name='Switch to dark theme').click()
    expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
    page.goto(BASE + '/?theme=light')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Switch to dark theme').click()
    expect(page).to_have_url(BASE + '/?theme=dark')
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
    passed('Theme switch, local preference, reload, shared variant URL and internal navigation preserve the chosen variant')
    # Keyboard users can open the assistant and reach a question immediately.
    launcher = page.get_by_role('button', name='Open VIP Concierge', exact=True)
    launcher.focus()
    page.keyboard.press('Enter')
    dialog = page.get_by_role('dialog', name='VIP Concierge')
    expect(dialog.get_by_role('button', name='Close assistant')).to_be_focused()
    page.keyboard.press('Tab')
    expect(dialog.get_by_role('button', name=QUESTIONS[0], exact=True)).to_be_focused()
    page.keyboard.press('Enter')
    expect(dialog.get_by_role('log')).to_contain_text('Prices are unconfirmed')
    page.keyboard.press('Escape')
    expect(launcher).to_be_focused()
    passed('Keyboard opening, question activation, Escape and focus restoration')
    ctx.close()

    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    page = ctx.new_page()
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Open VIP Concierge').click()
    dialog = page.get_by_role('dialog', name='VIP Concierge')
    assert dialog.evaluate('el => getComputedStyle(el).transitionDuration') == '0s'
    no_overflow(page)
    passed('Reduced-motion chat opens without positional animation')
    ctx.close()
    assert all(method == 'GET' and url.startswith(BASE) for method, url in requests)
    assert not errors, errors
    passed('No external requests, model calls, POSTs, console errors or hydration errors')


if __name__ == '__main__':
    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('VIP_CHROMIUM_EXECUTABLE'):
                options['executable_path'] = os.environ['VIP_CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**options)
            try:
                run(browser)
            finally:
                browser.close()
    finally:
        (OUT / 'v2-results.json').write_text(json.dumps({'passed': checks, 'runtime_errors': errors}, indent=2))
    print(f'Completed {len(checks)} V2 checks.')
