"""First-visit reveal, Concierge lifecycle and requested navigation details."""
import json,os,time,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3001')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/review-updates'));OUT.mkdir(parents=True,exist_ok=True)
MAP='https://www.google.com/maps/place/VIP+Motors+Bengaluru/data=!4m2!3m1!1s0x3bae3d00274a8247:0xb702134b5bddbe2?sa=X&ved=1t:242&ictx=111'
checks,errors,console_errors,timings=[],[],[],[]

def watch(page):
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
def home(page,theme='dark'):
 page.goto(BASE+'/?theme='+theme,wait_until='domcontentloaded')
def open_concierge(page):
 page.get_by_role('button',name='Open Concierge',exact=True).click();expect(page.get_by_role('dialog',name='Concierge',exact=True)).to_be_visible()
def ask_budget(page):
 start=time.monotonic();page.get_by_role('button',name='My budget is ₹50 lakh. What can I buy?',exact=True).click()
 expect(page.locator('.concierge-processing')).to_be_visible();assert page.locator('.concierge-results').count()==0
 page.wait_for_timeout(400);expect(page.locator('.concierge-processing')).to_be_visible()
 return start

def run(browser):
 for theme,label,w,h in [('dark','desktop',1440,900),('light','desktop',1440,900),('dark','phone',390,844),('light','phone',390,844),('dark','tablet',820,1180)]:
  ctx=browser.new_context(viewport={'width':w,'height':h});page=ctx.new_page();watch(page);home(page,theme)
  intro=page.locator('.site-intro');expect(intro).to_be_visible();expect(page.locator('html')).to_have_attribute('data-vip-intro','play')
  page.wait_for_timeout(650);expect(intro).to_be_visible()
  box=intro.bounding_box();assert box['width']==w and box['height']==h
  assert intro.evaluate('(e)=>getComputedStyle(e).pointerEvents')=='none';assert intro.get_attribute('aria-hidden')=='true'
  expect(intro.locator('.red-dot-loader')).to_have_attribute('data-ready','true');assert intro.locator('.brand-logo').bounding_box()['width']>=220
  page.screenshot(path=str(OUT/f'{theme}-{label}-first-load.png'))
  expect(intro).not_to_be_visible(timeout=4000);expect(page.locator('html')).to_have_attribute('data-vip-intro','done')
  expect(intro.locator('.red-dot-loader')).to_have_attribute('data-rendering','false')
  expect(page.locator('.hero-slide-image[data-active=true] .hero-plate img')).to_be_visible();assert page.locator('.hero-slide-image[data-active=true] .hero-plate img').get_attribute('alt').lower().find('ferrari')>=0
  page.screenshot(path=str(OUT/f'{theme}-{label}-settled-home.png'))
  for a in page.locator('a[href^="https://www.google.com/maps/"]').all():assert a.get_attribute('href')==MAP
  assert page.locator('a[href^="https://share.google"]').count()==0
  assert page.get_by_text('Open daily, 10:00 am to 8:30 pm',exact=True).count()==2
  expected=['The Inventory','Sell Your Car','Finance','Contact']
  assert page.locator('.desktop-nav a').all_text_contents()==expected
  for name in ['Sell Or Exchange','Finance And Insurance','Extended Warranty','About Us','Visit The Showroom','Compare Cars']:
   expect(page.get_by_role('navigation',name='VIP Motors',exact=True).get_by_role('link',name=name,exact=True)).to_have_count(1)
  if label=='phone':
   page.get_by_role('button',name='Menu',exact=False).click();menu=page.locator('.menu-panel')
   for name in ['Home','The Inventory','Sell Your Car','Finance And Insurance','Extended Warranty','Compare Cars','About Us','Contact']:expect(menu.get_by_role('link',name=name,exact=True)).to_be_visible()
   page.wait_for_timeout(300);page.screenshot(path=str(OUT/f'{theme}-{label}-menu.png'));page.keyboard.press('Escape')
  more=page.get_by_role('link',name='View More',exact=True);expect(more).to_have_attribute('href','/inventory');assert more.locator('svg path').get_attribute('d')=='m4 6 6 6-6 6m9-12 6 6-6 6'
  assert more.evaluate('(e)=>e.getBoundingClientRect().top>=document.querySelector(".selected-grid").getBoundingClientRect().bottom')
  more.click();page.wait_for_url(BASE+'/inventory');page.go_back();expect(intro).not_to_be_visible();page.reload();page.wait_for_load_state('networkidle');expect(intro).not_to_be_visible()
  open_concierge(page);start=ask_budget(page);page.locator('.chat-panel').screenshot(path=str(OUT/f'{theme}-{label}-concierge-processing.png'))
  expect(page.locator('.concierge-results li')).to_have_count(3,timeout=4000);elapsed=time.monotonic()-start;assert elapsed>=1.05,elapsed;timings.append({'theme':theme,'width':w,'reply_seconds':round(elapsed,3)})
  expect(page.locator('.chat-log')).to_have_attribute('aria-busy','false');page.wait_for_load_state('networkidle')
  page.locator('.chat-panel').screenshot(path=str(OUT/f'{theme}-{label}-concierge-answer.png'))
  snapshot=page.locator('.chat-panel').aria_snapshot();assert not re.search(r'\b(chatbot|assistant|VIP Concierge|Close chat)\b',snapshot,re.I),snapshot
  assert page.locator('.chat-disclaimer').inner_text().strip()=='Concierge'
  first=page.locator('.concierge-results a').first;href=first.get_attribute('href');first.click();page.wait_for_url('**/inventory/*');assert '/inventory/' in href
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  ctx.close();checks.append(f'{theme} {label}: prominent first reveal, settled car hero, repeat skip, exact Maps/hours/menu labels, double-arrow inventory link, delayed Concierge with clickable priced photos')
 # Unknown replies also wait; restarting/closing cannot append a stale result.
 ctx=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce');page=ctx.new_page();watch(page);home(page);page.wait_for_load_state('networkidle');expect(page.locator('.site-intro')).not_to_be_visible();open_concierge(page)
 page.get_by_label('Your message',exact=True).fill('Can you tell me about the moon?');page.get_by_role('button',name='Send to Concierge').click();expect(page.locator('.concierge-processing')).to_be_visible();assert page.locator('.chat-connection-error').count()==0
 expect(page.locator('.chat-connection-error')).to_be_visible(timeout=4000);expect(page.locator('.chat-connection-error')).to_contain_text('Unable to connect to the server. Please try again later.')
 page.get_by_role('button',name='Restart Concierge').click();ask_budget(page);page.get_by_role('button',name='Restart Concierge').click();page.wait_for_timeout(1350);assert page.locator('.chat-turn').count()==0
 ask_budget(page);page.keyboard.press('Escape');page.wait_for_timeout(1350);open_concierge(page);assert page.locator('.chat-turn').count()==0
 expect(page.get_by_role('button',name='Send to Concierge')).to_be_disabled();ctx.close();checks.append('Unknown answer delay, restart and close cancellation, reduced-motion skip and Concierge-only accessible naming')
 # Keyboard input dismisses the intro immediately and restores the useful page.
 ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();watch(page);home(page);expect(page.locator('.site-intro')).to_be_visible();page.keyboard.press('Tab');expect(page.locator('.site-intro')).not_to_be_visible();expect(page.get_by_role('link',name='Skip to content')).to_be_focused();ctx.close();checks.append('Keyboard interaction immediately ends the intro without trapping focus')
 # A direct deep link is immediately useful; no home introduction plays there.
 ctx=browser.new_context();page=ctx.new_page();watch(page);page.goto(BASE+'/finance');page.wait_for_load_state('networkidle');expect(page.locator('.site-intro')).not_to_be_visible();ctx.close();checks.append('Fresh deep links skip the home introduction')
 # The CSS completion path remains intact if client chunks never hydrate.
 ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();page.route('**/_next/static/**/*.js',lambda route:route.abort());home(page);expect(page.locator('.site-intro')).to_be_visible();expect(page.locator('.site-intro')).not_to_be_visible(timeout=4000);expect(page.get_by_role('link',name='Explore Inventory',exact=True)).to_be_visible();ctx.close();checks.append('CSS-only completion reveals useful home content when hydration scripts fail')
 assert not errors,errors;assert not console_errors,console_errors

if __name__=='__main__':
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
   try:run(browser)
   finally:browser.close()
 finally:(OUT/'verification.json').write_text(json.dumps({'passed':checks,'reply_timings':timings,'runtime_errors':errors,'console_errors':console_errors},indent=2))
 print('Completed review-update scenarios:',len(checks))
