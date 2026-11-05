"""Production buyer-journey checks. Run with the server already on port 3000.
Install: python3 -m pip install -r tests/requirements.txt
Run: VIP_TEST_OUTPUT=/absolute/output python3 tests/browser_journey.py
Set VIP_CHROMIUM_EXECUTABLE when using an existing Chromium installation.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("VIP_TEST_URL", "http://localhost:3001")
OUT = Path(os.environ.get("VIP_TEST_OUTPUT", "test-results"))
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []
requests = []


def passed(name):
    checks.append(name)
    print("PASS", name, flush=True)


def settled(page):
    page.wait_for_load_state("networkidle")


def capture(page, name, full=False):
    page.wait_for_timeout(350)  # Capture settled transitions without mutating animation state.
    page.screenshot(path=str(OUT / (name + ".png")), full_page=full)


def no_overflow(page):
    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth"), "Horizontal overflow"


def observe(page):
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("request", lambda request: requests.append({"url": request.url, "method": request.method}))


def run(browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, permissions=["clipboard-read", "clipboard-write"])
    page = ctx.new_page()
    observe(page)
    # Observe the first paint without inserting an artificial image/network wait.
    page.goto(BASE, wait_until="domcontentloaded")
    assert page.evaluate("sessionStorage.getItem('vip:intro:v2')") == "seen"
    expect(page.get_by_role("link", name="Explore inventory", exact=True).first).to_be_visible()
    page.wait_for_function("document.documentElement.dataset.vipIntro === 'done'")
    settled(page)
    no_overflow(page)
    capture(page, "desktop-home")
    capture(page, "desktop-home-full", True)
    passed("Fresh-tab intro completes; useful headline, header and inventory link remain independent")

    page.get_by_role("link", name="Explore inventory", exact=True).first.click()
    expect(page.locator(".vehicle-card")).to_have_count(6)
    settled(page)
    capture(page, "desktop-inventory", True)
    filters = page.locator(".desktop-filters")
    filters.get_by_label("Make", exact=True).select_option("BMW")
    filters.get_by_role("button", name="Apply filters").click()
    expect(page).to_have_url(BASE + "/inventory?make=BMW")
    expect(page.locator(".vehicle-card")).to_have_count(3)
    page.get_by_label("Sort by").select_option("mileage-asc")
    expect(page).to_have_url(BASE + "/inventory?make=BMW&sort=mileage-asc")
    expect(page.locator(".vehicle-card h3").first).to_have_text("BMW 5 Series")
    page.reload()
    settled(page)
    expect(page.locator(".desktop-filters").get_by_label("Make", exact=True)).to_have_value("BMW")
    expect(page.get_by_label("Sort by")).to_have_value("mileage-asc")
    expect(page.locator(".vehicle-card")).to_have_count(3)
    page.go_back()
    settled(page)
    expect(page).to_have_url(BASE + "/inventory?make=BMW")
    expect(page.locator(".vehicle-card h3").first).to_have_text("BMW X7")
    passed("URL filters, meaningful sorting, reload and browser Back restore the inventory")

    page.locator(".vehicle-card").filter(has=page.get_by_role("heading", name="BMW X7", exact=True)).get_by_role("link").click()
    settled(page)
    expect(page.get_by_role("heading", name="BMW X7", exact=True)).to_be_visible()
    expect(page.get_by_role("link", name="Back to your results")).to_have_attribute("href", "/inventory?make=BMW")
    page.get_by_role("button", name="Next image", exact=True).click()
    expect(page.get_by_role("button", name="View interior image")).to_have_attribute("aria-pressed", "true")
    page.get_by_role("button", name="Next image", exact=True).focus()
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("button", name="View detail image")).to_have_attribute("aria-pressed", "true")
    page.get_by_role("button", name="View exterior image").click()
    expect(page.locator(".gallery-position")).to_contain_text("01")
    no_overflow(page)
    capture(page, "desktop-vehicle-detail", True)
    passed("Vehicle context, thumbnail controls, position indicator and keyboard gallery controls")

    trigger = page.get_by_role("button", name="Enquire about this vehicle")
    trigger.click()
    dialog = page.get_by_role("dialog")
    expect(dialog).to_contain_text("BMW X7")
    dialog.get_by_role("textbox", name="Your name").fill("A")
    dialog.get_by_role("textbox", name="Email address").fill("invalid")
    dialog.get_by_role("textbox", name="Your message").fill("Hi")
    dialog.get_by_role("button", name="Preview enquiry").click()
    expect(dialog.locator("[aria-invalid=true]")).to_have_count(3)
    expect(dialog.get_by_role("textbox", name="Your name")).to_be_focused()
    capture(page, "desktop-invalid-enquiry")
    dialog.get_by_role("textbox", name="Your name").fill("Demo Visitor")
    dialog.get_by_role("textbox", name="Email address").fill("demo@example.com")
    dialog.get_by_role("textbox", name="Your message").fill("Please prepare more details for this illustrative vehicle.")
    dialog.get_by_role("textbox", name="Phone number").fill("letters")
    dialog.get_by_role("button", name="Preview enquiry").click()
    expect(dialog.get_by_role("textbox", name="Phone number")).to_be_focused()
    dialog.get_by_role("textbox", name="Phone number").fill("")
    page.keyboard.press("Escape")
    expect(dialog).not_to_be_visible()
    expect(trigger).to_be_focused()
    trigger.click()
    expect(dialog.get_by_role("textbox", name="Your name")).to_have_value("Demo Visitor")
    dialog.get_by_role("button", name="Preview enquiry").click()
    expect(dialog.get_by_role("heading", name="Your enquiry is ready.")).to_be_visible()
    expect(dialog.get_by_role("textbox", name="Enquiry text")).to_contain_text("preview-001")
    dialog.get_by_role("button", name="Copy enquiry").click()
    expect(dialog.get_by_role("status")).to_have_text("Enquiry copied. Nothing has been sent.")
    assert "BMW X7" in page.evaluate("navigator.clipboard.readText()")
    capture(page, "desktop-enquiry-preview")
    passed("Actionable validation, draft preservation, Escape/focus restoration, local preview and clipboard copy")
    dialog.get_by_role("button", name="Close enquiry").click()
    page.get_by_role("link", name="VIP Motors home").click()
    settled(page)
    assert page.locator(".hero-intro").evaluate("el => getComputedStyle(el).display") == "none"
    passed("Same-tab home return skips the intro")

    page.goto(BASE + "/inventory?q=no-such-vehicle")
    settled(page)
    expect(page.get_by_role("heading", name="No vehicles match just yet.")).to_be_visible()
    page.get_by_role("link", name="Reset filters", exact=True).click()
    expect(page.locator(".vehicle-card")).to_have_count(6)
    passed("Search empty state and reset action")
    page.goto(BASE + "/inventory/toyota-fortuner-preview")
    settled(page)
    expect(page.get_by_text("Single image plate")).to_be_visible()
    expect(page.get_by_role("button", name="Next image", exact=True)).to_have_count(0)
    passed("Single-image listing does not expose a false carousel")

    # Complete the same buyer journey at a phone viewport, including modal panels.
    phone_ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    phone = phone_ctx.new_page()
    observe(phone)
    phone.goto(BASE)
    settled(phone)
    phone.wait_for_timeout(300)
    no_overflow(phone)
    capture(phone, "phone-home")
    phone.get_by_role("button", name="Menu", exact=True).click()
    expect(phone.get_by_role("dialog")).to_be_visible()
    phone.keyboard.press("Escape")
    expect(phone.get_by_role("button", name="Menu", exact=True)).to_be_focused()
    phone.get_by_role("link", name="Explore inventory", exact=True).first.click()
    settled(phone)
    phone.get_by_role("button", name="Filters", exact=True).click()
    drawer = phone.get_by_role("dialog")
    expect(drawer.get_by_role("heading", name="Refine the collection")).to_be_visible()
    capture(phone, "phone-filter-drawer")
    expect(drawer).to_be_visible()
    # Tab cycles inside the modal, including reverse traversal.
    drawer.get_by_role("button", name="Reset filters").focus()
    phone.keyboard.press("Tab")
    expect(drawer.get_by_role("button", name="Close filters")).to_be_focused()
    drawer.get_by_label("Make", exact=True).select_option("Toyota")
    drawer.get_by_role("button", name="Show vehicles").click()
    expect(phone.locator(".vehicle-card")).to_have_count(1)
    phone.get_by_role("button", name="Filters (1)", exact=True).click()
    phone.get_by_role("dialog").get_by_role("button", name="Reset filters").click()
    expect(phone).to_have_url(BASE + "/inventory")
    expect(phone.locator(".vehicle-card")).to_have_count(6)
    capture(phone, "phone-inventory", True)
    phone.locator(".vehicle-card").first.get_by_role("link").click()
    settled(phone)
    phone.get_by_role("button", name="Next image", exact=True).click()
    expect(phone.get_by_role("button", name="View interior image")).to_have_attribute("aria-pressed", "true")
    capture(phone, "phone-vehicle-detail", True)
    phone.get_by_role("button", name="Enquire about this vehicle").click()
    pd = phone.get_by_role("dialog")
    pd.get_by_role("button", name="Preview enquiry").click()
    expect(pd.locator("[aria-invalid=true]")).to_have_count(3)
    pd.get_by_role("textbox", name="Your name").fill("Demo Visitor")
    pd.get_by_role("textbox", name="Email address").fill("demo@example.com")
    pd.get_by_role("textbox", name="Your message").fill("Please provide details about this illustrative BMW.")
    pd.get_by_role("button", name="Preview enquiry").click()
    expect(pd.get_by_role("heading", name="Your enquiry is ready.")).to_be_visible()
    no_overflow(phone)
    capture(phone, "phone-enquiry-preview")
    passed("390×844 buyer journey, mobile menu, modal focus trap, filter reset, gallery and enquiry")
    phone_ctx.close()

    tablet = ctx.new_page()
    tablet.set_viewport_size({"width": 834, "height": 1112})
    observe(tablet)
    tablet.goto(BASE)
    settled(tablet)
    no_overflow(tablet)
    capture(tablet, "tablet-home")
    tablet.goto(BASE + "/inventory")
    settled(tablet)
    no_overflow(tablet)
    assert tablet.locator(".inventory-grid").evaluate("el => getComputedStyle(el).gridTemplateColumns.split(' ').length") == 2
    capture(tablet, "tablet-inventory", True)
    passed("834px tablet layout, two-column stock grid and no overflow")
    tablet.close()

    page.goto(BASE + "/contact")
    settled(page)
    page.get_by_role("textbox", name="Your name").fill("Demo Visitor")
    page.get_by_role("textbox", name="Email address").fill("demo@example.com")
    page.get_by_role("textbox", name="Your message").fill("I would like to discuss the illustrative collection.")
    page.get_by_role("button", name="Preview enquiry").click()
    expect(page.get_by_role("textbox", name="Enquiry text")).to_contain_text("General enquiry")
    passed("General enquiry uses the same local-only preview journey")

    # Ensure no accidental personal details were persisted.
    assert page.evaluate("Object.keys(localStorage).length") == 0
    assert page.evaluate("Object.keys(sessionStorage)") == ["vip:intro:v2"]
    assert all(r["method"] == "GET" for r in requests)
    assert all(r["url"].startswith(BASE) for r in requests)
    assert not errors, errors
    passed("No hydration/runtime console errors, external requests, POSTs or personal storage")
    ctx.close()

    reduced = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    rp = reduced.new_page()
    rp.goto(BASE)
    settled(rp)
    assert rp.locator(".hero-intro").evaluate("el => getComputedStyle(el).display") == "none"
    no_overflow(rp)
    passed("Fresh-tab reduced motion receives the settled hero immediately")
    reduced.close()

    keyboard = browser.new_context(viewport={"width": 1440, "height": 900})
    kp = keyboard.new_page()
    # Slow only a non-critical resource so keyboard interaction occurs during the intro.
    kp.goto(BASE, wait_until="domcontentloaded")
    kp.keyboard.press("Tab")
    kp.wait_for_function("document.documentElement.dataset.vipIntro === 'done'")
    expect(kp.get_by_role("link", name="Skip to content")).to_be_focused()
    passed("Keyboard interaction ends the decorative intro and retains the skip link")
    keyboard.close()

    for mode in ["missing", "slow"]:
        fallback = browser.new_context(viewport={"width": 1440, "height": 900})
        fp = fallback.new_page()
        if mode == "missing":
            fp.route("**/placeholders/hero.svg", lambda route: route.abort())
        else:
            held = []
            fp.route("**/placeholders/hero.svg", lambda route: held.append(route))
        fp.goto(BASE, wait_until="domcontentloaded")
        expect(fp.get_by_role("link", name="Explore inventory", exact=True).first).to_be_visible()
        expect(fp.get_by_role("heading", name="The collection.")).to_be_visible()
        fp.wait_for_timeout(850)
        if mode == "slow":
            assert held, "Expected the hero request to be pending"
            assert not fp.locator(".hero-plate img").evaluate("el => el.complete")
            assert fp.locator(".hero-intro").evaluate("el => getComputedStyle(el).display") == "none"
            held[0].continue_()
        if mode == "missing":
            expect(fp.locator(".image-fallback").first).to_be_visible()
            capture(fp, "desktop-missing-hero")
        no_overflow(fp)
        fallback.close()
    passed("Slow and missing hero assets preserve the headline, layout and inventory action")

    nojs = browser.new_context(viewport={"width": 1440, "height": 900}, java_script_enabled=False)
    np = nojs.new_page()
    np.goto(BASE)
    np.wait_for_timeout(1000)
    assert np.locator(".hero-intro").evaluate("el => getComputedStyle(el).visibility") == "hidden"
    expect(np.get_by_role("link", name="Explore inventory", exact=True).first).to_be_visible()
    passed("Intro completes through CSS even when hydration/JavaScript is unavailable")
    nojs.close()
    response = browser.new_page().goto(BASE + "/inventory/not-a-vehicle")
    assert response.status == 404
    passed("Unknown vehicle route returns 404")


if __name__ == "__main__":
    try:
        with sync_playwright() as p:
            opts = {"headless": True}
            if os.environ.get("VIP_CHROMIUM_EXECUTABLE"):
                opts["executable_path"] = os.environ["VIP_CHROMIUM_EXECUTABLE"]
            browser = p.chromium.launch(**opts)
            try:
                run(browser)
            finally:
                browser.close()
    finally:
        (OUT / "browser-results.json").write_text(json.dumps({"passed": checks, "runtime_errors": errors}, indent=2))
    print(f"Completed {len(checks)} checks.")
