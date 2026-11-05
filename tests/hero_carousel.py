"""Featured-car synchronization, native controls, autoplay lifecycle and address pins."""
import os,json,time,re
from pathlib import Path
from urllib.parse import unquote
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3001')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/hero-carousel'));OUT.mkdir(parents=True,exist_ok=True)
NAMES=['Ferrari Roma','Bentley Continental GT','Porsche 911','Mercedes-Maybach S-Class','BMW X7','Land Rover Range Rover']
SLUGS=['ferrari-roma-2022','bentley-continental-gt-2021','porsche-911-carrera-s-2021','maybach-s580-2022','bmw-x7-40i-2023','range-rover-autobiography-2020']
checks,errors,console_errors,layouts=[],[],[],[]

def watch(page):
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
def home(page,theme='dark'):
 page.goto(BASE+'/?theme='+theme);page.wait_for_load_state('networkidle')
def index(page,value):expect(page.locator('.hero-carousel')).to_have_attribute('data-active-slide',str(value))
def active_image(page):return page.locator('.hero-slide-image[data-active=true] img')
def advance_clock(page,ms):page.clock.fast_forward(ms);page.wait_for_timeout(100)

def run(browser):
 for theme,label,w,h in [('dark','desktop',1440,900),('light','desktop',1440,900),('dark','phone',390,844),('light','phone',390,844),('dark','tablet',820,1180)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=ctx.new_page();watch(page);home(page,theme)
  hero=page.locator('.hero-carousel');expect(hero).to_have_attribute('data-playing','false');expect(hero.locator('.hero-carousel-selectors button')).to_have_count(6)
  size=None
  for i,(name,slug) in enumerate(zip(NAMES,SLUGS)):
   hero.locator('.hero-carousel-selectors button').nth(i).click();index(page,i);expect(hero.locator('h1')).to_have_attribute('aria-label',name);expect(hero.locator('.hero-carousel-caption')).to_contain_text(name);expect(hero.locator('.hero-carousel-stage')).to_have_attribute('href','/inventory/'+slug)
   image=active_image(page);expect(image).to_be_visible();assert slug in unquote(image.get_attribute('src'));assert image.evaluate('(e)=>e.complete&&e.naturalWidth>0')
   bounds=hero.locator('.hero-carousel-stage').bounding_box();current=(bounds['x'],bounds['y'],bounds['width'],bounds['height'])
   if size:assert all(abs(a-b)<1 for a,b in zip(size,current)),(size,current)
   size=current
   title=hero.locator('h1').evaluate('''e=>{const range=document.createRange();const width=e.clientWidth;return {width,height:e.getBoundingClientRect().height,slot:e.parentElement.getBoundingClientRect().height,spans:[...e.children].map(s=>{range.selectNodeContents(s);return range.getBoundingClientRect().width})}}''')
   assert title['height']<=title['slot']+1 and max(title['spans'])<=title['width']+1,title
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   layouts.append({'theme':theme,'width':w,'name':name,'stage':current,'title':title})
   page.mouse.move(0,0);page.screenshot(path=str(OUT/f'{theme}-{label}-slide-{i+1}.png'))
  # Keyboard arrows wrap without moving focus or animating the title.
  next_button=hero.get_by_role('button',name='Next Featured Vehicle');next_button.focus();page.keyboard.press('ArrowRight');index(page,0);expect(next_button).to_be_focused();expect(hero).to_have_attribute('data-instant','true');page.keyboard.press('ArrowLeft');index(page,5)
  hero.get_by_role('button',name='Previous Featured Vehicle').click();index(page,4)
  hero.locator('.hero-carousel-stage').click();page.wait_for_url(BASE+'/inventory/'+SLUGS[4]);expect(page.locator('main h1')).to_have_text('BMW X7')
  # The emoji is visible, while the address retains its readable accessible name and Maps target.
  for route,total in [('/contact',3),('/inventory',2),('/finance',2),('/warranty',2),('/about',2),('/compare',2)]:
   page.goto(BASE+route);page.wait_for_load_state('networkidle');expect(page.locator('address')).to_have_count(total);expect(page.locator('address .address-pin')).to_have_count(total)
   for pin in page.locator('address .address-pin').all():expect(pin).to_have_text('📍');expect(pin).to_have_attribute('aria-hidden','true')
   for link in page.locator('address .address-link').all():assert '/maps/place/VIP+Motors+Bengaluru/' in link.get_attribute('href')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  ctx.close();checks.append(f'{theme} {label}: all six names/photos/links match, stable layout, keyboard wrap/focus, reduced motion, vehicle navigation, all address pins and Maps links')
 # Observe one real five-second cycle; virtual time then checks each pause/resume condition.
 ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();watch(page);page.clock.install();page.add_init_script("sessionStorage.setItem('vip:intro:v2:showcase','seen')");page.mouse.move(0,0)
 started=time.monotonic();home(page);hero=page.locator('.hero-carousel');expect(hero).to_have_attribute('data-playing','true');index(page,0);index_wait=page.locator('.hero-carousel');expect(index_wait).to_have_attribute('data-active-slide','1',timeout=6500);elapsed=time.monotonic()-started;assert elapsed>=4.5,elapsed
 page.wait_for_timeout(500);page.screenshot(path=str(OUT/'desktop-autoplay.png'))
 hero.hover();expect(hero).to_have_attribute('data-playing','false');advance_clock(page,6000);index(page,1)
 page.mouse.move(0,0);expect(hero).to_have_attribute('data-playing','true');advance_clock(page,5100);index(page,2)
 hero.locator('.hero-carousel-caption').focus();expect(hero).to_have_attribute('data-playing','false');advance_clock(page,6000);index(page,2)
 hero.get_by_role('button',name='Play Carousel').click();page.mouse.move(0,0);expect(hero).to_have_attribute('data-playing','true');advance_clock(page,5100);index(page,3)
 hero.get_by_role('button',name='Pause Carousel').click();page.mouse.move(0,0);expect(hero).to_have_attribute('data-playing','false');advance_clock(page,6000);index(page,3)
 hero.get_by_role('button',name='Play Carousel').click();page.mouse.move(0,0);page.locator('#showroom').scroll_into_view_if_needed();expect(hero).to_have_attribute('data-playing','false');advance_clock(page,6000);index(page,3)
 page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.mouse.move(0,0);expect(hero).to_have_attribute('data-playing','true');advance_clock(page,5100);index(page,4)
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))");expect(hero).to_have_attribute('data-playing','false');advance_clock(page,6000);index(page,4)
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))");expect(hero).to_have_attribute('data-playing','true');advance_clock(page,5100);index(page,5);advance_clock(page,5100);index(page,0)
 page.emulate_media(reduced_motion='reduce');expect(hero).to_have_attribute('data-playing','false');advance_clock(page,6000);index(page,0)
 page.goto(BASE+'/inventory');page.wait_for_load_state('networkidle');advance_clock(page,10000);assert page.locator('.hero-carousel').count()==0
 ctx.close();checks.append(f'Real autoplay cycle ({elapsed:.2f}s incl. initial load), hover/focus/user pause, offscreen pause, simulated document visibility pause, wrap, reduced-motion changes and navigation cleanup')
 # First-load brand animation finishes before the carousel's first dwell period begins.
 ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();watch(page);page.mouse.move(0,0);page.goto(BASE+'/',wait_until='domcontentloaded');expect(page.locator('.site-intro')).to_be_visible();expect(page.locator('.hero-carousel')).to_have_attribute('data-playing','false');expect(page.locator('.site-intro')).not_to_be_visible(timeout=4000);expect(page.locator('.hero-carousel')).to_have_attribute('data-playing','true');index(page,0);ctx.close();checks.append('First-load introduction and carousel timing coordinate correctly')
 # A missing carousel photo retains its named fallback and the next slide remains usable.
 ctx=browser.new_context(reduced_motion='reduce');page=ctx.new_page();page.route(re.compile(r'.*bentley-continental-gt-2021.*'),lambda route:route.abort());home(page);hero=page.locator('.hero-carousel');hero.get_by_role('button',name='Show Bentley Continental GT',exact=True).click();index(page,1);expect(hero.locator('h1')).to_have_attribute('aria-label','Bentley Continental GT');expect(page.locator('.hero-slide-image[data-active=true] .plate-center')).to_have_text('Photograph unavailable');hero.get_by_role('button',name='Next Featured Vehicle').click();index(page,2);expect(active_image(page)).to_be_visible();ctx.close();checks.append('Missing-image fallback and subsequent navigation remain functional')
 assert not errors,errors;assert not console_errors,console_errors

if __name__=='__main__':
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
   try:run(browser)
   finally:browser.close()
 finally:(OUT/'verification.json').write_text(json.dumps({'passed':checks,'layouts':layouts,'runtime_errors':errors,'console_errors':console_errors},indent=2))
 print('Completed hero carousel/address scenarios:',len(checks))
