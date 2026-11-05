"""Static project-path deployment, progress clock, saved cars and buyer journeys.
Run with VIP_TEST_URL=https://<owner>.github.io/<repo> against the published site.
"""
import os,json,re
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3002/VIP-Motors-demo').rstrip('/')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/github-pages'));OUT.mkdir(parents=True,exist_ok=True)
ROOT=Path(__file__).parents[1]
CHROME=os.environ.get('CHROMIUM_PATH','/Users/ppv/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
checks=[];errors=[];bad=[]
def watch(page):
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text+' '+str(m.location)) if m.type=='error' else None)
 page.on('response',lambda r:bad.append([r.status,r.url]) if r.status>=400 else None)
def go(page,path):
 response=page.goto(BASE+path);assert response.status==200,(path,response.status)
 page.wait_for_load_state('networkidle')
def fits(page):assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.url
def fill_time(page):return page.evaluate('''()=>{const i=document.querySelector('.hero-carousel').dataset.activeSlide;const a=document.getAnimations().find(a=>a.effect?.target?.dataset?.progressIndex===i);return {time:a?.currentTime,state:a?.playState,scale:getComputedStyle(document.querySelector(`[data-progress-index="${i}"]`)).transform}}''')
def finish(page):page.evaluate('''()=>{const i=document.querySelector('.hero-carousel').dataset.activeSlide;document.getAnimations().find(a=>a.effect?.target?.dataset?.progressIndex===i).finish()}''')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROME)
 context=browser.new_context(viewport={'width':1440,'height':900});context.add_init_script("window.__introStates=[];new MutationObserver(()=>{const state=document.documentElement?.dataset.vipIntro;if(state)window.__introStates.push(state)}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-vip-intro']})");page=context.new_page();watch(page)
 go(page,'/?theme=dark');assert 'play' in page.evaluate('window.__introStates');expect(page.locator('html')).to_have_attribute('data-vip-intro','done');expect(page.locator('.hero-carousel')).to_have_attribute('data-playing','true');page.evaluate("document.getAnimations().filter(a=>a.effect?.target?.hasAttribute('data-progress-index')).forEach(a=>a.currentTime=0)")
 first=fill_time(page);page.wait_for_timeout(1400);second=fill_time(page)
 assert second['time']>first['time']+1000,(first,second)
 assert 'matrix' in second['scale'] and second['scale']!='matrix(1, 0, 0, 1, 0, 0)'
 page.screenshot(path=str(OUT/'desktop-home-progress.png'))
 expect(page.locator('.hero-carousel')).to_have_attribute('data-active-slide','1',timeout=6500)
 checks.append('Real five-second fill advances photo, model name and caption together')
 page.mouse.move(700,300);page.wait_for_timeout(100);a=fill_time(page);page.wait_for_timeout(350);b=fill_time(page);assert a['state']=='paused' and abs(a['time']-b['time'])<2
 page.mouse.move(0,0);page.wait_for_timeout(150);assert fill_time(page)['state']=='running'
 # Drive the same progress animation to its end to check every slide and loop wrap.
 for i in [2,3,4,5,0]:
  finish(page);expect(page.locator('.hero-carousel')).to_have_attribute('data-active-slide',str(i));page.wait_for_timeout(70)
  assert page.locator('.hero-slide-image[data-active=true] img').evaluate('(e)=>e.complete&&e.naturalWidth>0')
 checks.append('Progress pauses/resumes at the same position; all six slides loop back to the first')
 expect(page.get_by_role('link',name='Get Quote On WhatsApp',exact=True)).to_have_attribute('href','https://www.whatsapp.com/')
 for parent in ['.showroom-visit','.site-footer']:
  link=page.locator(parent+' .instagram-link');link.scroll_into_view_if_needed();expect(link.locator('img')).to_have_js_property('complete',True);expect(link).to_have_attribute('href','https://www.instagram.com/vipmotors.india?obrf=aTRxbmpzamgyeDZ2');assert link.locator('img').evaluate('(e)=>e.complete&&e.naturalWidth>0');assert '.png' in link.locator('img').get_attribute('src')
 checks.append('WhatsApp website destination and both Instagram PNG links verified')
 go(page,'/inventory/');expect(page.locator('.vehicle-card')).to_have_count(36)
 for i in [0,1]:page.locator('.vehicle-card').nth(i).get_by_role('button').click()
 expect(page.locator('.wishlist-count')).to_have_text('2');page.locator('.wishlist-nav').click();page.wait_for_url('**/wishlist/');expect(page.locator('.vehicle-card')).to_have_count(2)
 page.reload();page.wait_for_load_state('networkidle');expect(page.locator('.vehicle-card')).to_have_count(2)
 page.locator('.vehicle-card').first.get_by_role('button').click();expect(page.locator('.vehicle-card')).to_have_count(1);expect(page.locator('.wishlist-count')).to_have_text('1')
 page.screenshot(path=str(OUT/'desktop-wishlist.png'))
 # Another tab must update immediately when the saved collection changes.
 tab=context.new_page();watch(tab);go(tab,'/wishlist/');expect(tab.locator('.vehicle-card')).to_have_count(1)
 page.locator('.vehicle-card').first.get_by_role('button').click();expect(tab.locator('.vehicle-card')).to_have_count(0);expect(tab.locator('.wishlist-empty')).to_be_visible()
 tab.close();checks.append('Wishlist saves/removes, updates header, persists after reload and syncs between tabs')
 go(page,'/inventory/?make=BMW&maxPrice=10000000&sort=price-asc');count=page.locator('.vehicle-card').count();assert count>0
 for card in page.locator('.vehicle-card').all():assert 'BMW' in card.locator('h3').inner_text()
 page.locator('.vehicle-link').first.click();page.wait_for_load_state('networkidle');expect(page.locator('.back-link')).to_have_attribute('href',re.compile(r'make=BMW'))
 page.reload();page.wait_for_load_state('networkidle');page.locator('.back-link').click();expect(page.locator('.vehicle-card')).to_have_count(count)
 page.locator('.clear-filters').click();expect(page.locator('.vehicle-card')).to_have_count(36);page.go_back();expect(page.locator('.vehicle-card')).to_have_count(count)
 checks.append('Static inventory filter URL, detail refresh, return to filtered results and browser Back')
 go(page,'/finance/?vehicle=mercedes-c220d-2023&price=5000000&deposit=1000000&rate=11.5&months=48')
 expect(page.locator('#finance-price')).to_have_value('5000000');expect(page.locator('#finance-rate')).to_have_value('11.5');expect(page.locator('.finance-emi output')).to_contain_text('₹')
 page.get_by_role('button',name='Save this plan',exact=True).click();assert urlparse(page.url).path.startswith(urlparse(BASE).path+'/finance')
 page.get_by_role('link',name='Discuss this plan',exact=True).click();page.wait_for_load_state('networkidle');expect(page.locator('.enquiry-context strong')).to_have_text('Finance and insurance');assert '48 months' in page.get_by_label('Your message').input_value()
 checks.append('Finance parameters restore on static reload and preserve vehicle/repayment context in contact')
 go(page,'/quote/');form=page.locator('.valuation-form');form.get_by_role('button',name='Get my quote',exact=False).click();expect(form.locator('[name=make]')).to_be_focused()
 for key,value in [('make','Toyota'),('model','Fortuner'),('variant','Legender'),('year','2023'),('mileage','35000')]:form.locator('[name='+key+']').fill(value)
 for key,value in [('fuel','Diesel'),('transmission','Automatic'),('owners','1'),('condition','good'),('accident','none'),('service','full')]:form.locator('[name='+key+']').select_option(value)
 form.locator('input[type=file]').set_input_files(str(ROOT/'public/cars/toyota-fortuner-legender-2023/1.jpg'))
 form.get_by_role('button',name='Get my quote',exact=False).click();expect(page.locator('.quote-processing')).to_be_visible();assert urlparse(page.url).path.startswith(urlparse(BASE).path+'/quote')
 page.wait_for_timeout(1200);expect(page.locator('.quote-processing')).to_be_visible();expect(page.locator('.valuation-range')).to_be_visible(timeout=7000)
 page.screenshot(path=str(OUT/'desktop-quote.png'));saved=page.url;page.reload();page.wait_for_load_state('networkidle');expect(page.locator('.valuation-range')).to_be_visible();assert page.url==saved
 checks.append('Invalid quote validation, local photo, visible processing delay, estimate and parameter reload')
 go(page,'/compare/?first=bmw-x7-40i-2023&second=porsche-911-carrera-s-2021');expect(page.locator('.compare-table thead')).to_contain_text('BMW X7');expect(page.locator('.compare-table thead')).to_contain_text('Porsche 911')
 page.locator('[name=first]').select_option('ferrari-roma-2022');page.get_by_role('button',name='Compare cars',exact=True).click();page.wait_for_load_state('networkidle');expect(page.locator('.compare-table thead')).to_contain_text('Ferrari Roma')
 go(page,'/warranty/?vehicle=toyota-fortuner-legender-2023');expect(page.locator('#warranty-vehicle')).to_have_value('toyota-fortuner-legender-2023')
 checks.append('Compare native form and warranty deep links work beneath repository path')
 for route in ['/about/','/legal/','/contact/','/credits/']:
  go(page,route);expect(page.locator('h1')).to_be_visible();fits(page)
 context.close()
 for theme,width,height,label in [('dark',390,844,'phone'),('light',390,844,'phone'),('dark',820,1180,'tablet'),('light',1440,900,'desktop'),('dark',360,800,'small-phone')]:
  ctx=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce');pg=ctx.new_page();watch(pg);go(pg,'/?theme='+theme);fits(pg)
  expect(pg.locator('.hero-carousel')).to_have_attribute('data-playing','false');expect(pg.locator('.hero-carousel-selectors button').first).to_be_enabled();pg.wait_for_timeout(300);expect(pg.locator('.hero-carousel')).to_have_attribute('data-active-slide','0');assert pg.evaluate("document.getAnimations().filter(a=>a.effect?.target?.hasAttribute('data-progress-index')).every(a=>a.playState!=='running')");expect(pg.locator('.hero-carousel-selectors')).to_be_visible()
  pg.screenshot(path=str(OUT/f'{theme}-{label}-home.png'))
  go(pg,'/inventory/?make=Porsche');pg.locator('.vehicle-card').first.get_by_role('button').click();pg.locator('.wishlist-nav').click();expect(pg.locator('.vehicle-card')).to_have_count(1);fits(pg)
  pg.screenshot(path=str(OUT/f'{theme}-{label}-wishlist.png'))
  if width<700:
   go(pg,'/inventory/?make=BMW');pg.get_by_role('button',name=re.compile('^Filters')).click();drawer=pg.locator('.filter-drawer');expect(drawer).to_be_visible();drawer.get_by_role('button',name='Reset filters',exact=True).click();expect(drawer).not_to_be_visible();expect(pg.locator('.vehicle-card')).to_have_count(36);fits(pg)
  ctx.close()
 checks.append('Desktop, tablet, 390px/360px phones, both themes, reduced motion, mobile wishlist and filter reset')
 browser.close()
assert not errors,errors
assert not bad,bad
(OUT/'verification.json').write_text(json.dumps({'base':BASE,'checks':checks,'console_errors':errors,'http_errors':bad},indent=2))
print(json.dumps({'checks':len(checks),'errors':errors,'http_errors':bad,'output':str(OUT)}))
