# Historical motion-playground checks. The route was removed; use tests/presentation_polish.py.
"""Rendered motion and lifecycle checks; no snapshots of internal particle coordinates."""
import json, os, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3001')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/red-dots'))
OUT.mkdir(parents=True,exist_ok=True)
checks, errors, console_errors, expected_image_errors, motion = [], [], [], [], []
INSTRUMENT=r'''(() => {
 window.dotRecords=[];window.dotDraws=0;window.dotDurations=[];
 const original=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(...args){
  if(this.canvas.closest('.red-dot-loader')){
   if(!this.canvas.dotRecord){this.canvas.dotRecord={canvas:this.canvas,frames:0};window.dotRecords.push(this.canvas.dotRecord)}
   this.canvas.dotRecord.frames++;window.dotDraws++;
  }
  return original.apply(this,args);
 };
 const native=requestAnimationFrame.bind(window);
 window.requestAnimationFrame=callback=>native(time=>{const before=window.dotDraws;const start=performance.now();callback(time);if(window.dotDraws>before)window.dotDurations.push(performance.now()-start)});
})()'''
PIXELS=r'''() => {
 const c=document.querySelector('.red-dot-loader canvas'),ctx=c.getContext('2d');
 const {data}=ctx.getImageData(0,0,c.width,c.height);let weight=0,projection=0,pixels=0,nonRed=0;
 for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2){let i=(y*c.width+x)*4,a=data[i+3];if(a>9){let r=data[i],g=data[i+1],b=data[i+2];pixels++;if(r<g*1.4||r<b*1.4||b<g*.5)nonRed++;weight+=a;projection+=a*(x/c.width+1-y/c.height)/2}}
 return {centroid:projection/weight,pixels,nonRed,frames:c.dotRecord.frames,count:Number(c.parentElement.dataset.particleCount),width:c.width,height:c.height};
}'''

def setup(page):
    page.add_init_script(INSTRUMENT)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda msg:console_errors.append(msg.text) if msg.type=='error' else None)

def field(page): return page.locator('.red-dot-loader')
def frames(page): return field(page).locator('canvas').evaluate('c=>c.dotRecord.frames')
def capture(page,name): page.screenshot(path=str(OUT/(name+'.png')))
def start(page):
    page.get_by_role('button',name='Start again',exact=True).click()
    expect(field(page)).to_have_attribute('data-rendering','true')

def run(browser):
    # Observe eight real seconds of rendering; a native recording is evidence, not a runtime asset.
    ctx=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=2,record_video_dir=str(OUT/'recording'),record_video_size={'width':1440,'height':900})
    page=ctx.new_page();setup(page);page.goto(BASE+'/motion-preview');page.wait_for_load_state('networkidle')
    stage=page.locator('.particle-demo-stage');stage.scroll_into_view_if_needed()
    expect(field(page)).to_have_attribute('data-rendering','true')
    start(page)
    for i,delay in enumerate([250,1000,1200,1200,2000,2300]):
        page.wait_for_timeout(delay);sample=page.evaluate(PIXELS);motion.append(sample)
        assert sample['nonRed']==0,sample
        assert 500<sample['count']<=6000,sample
        stage.screenshot(path=str(OUT/f'diagonal-wave-{i}.png'))
    assert motion[3]['centroid']>motion[0]['centroid']+0.06,motion
    assert motion[-1]['frames']-motion[0]['frames']>80,motion
    assert all(sample['pixels']>500 for sample in motion)
    durations=page.evaluate('window.dotDurations')
    perf={'measured_frames':len(durations),'mean_draw_ms':sum(durations)/len(durations),'p95_draw_ms':sorted(durations)[int(len(durations)*.95)]}
    assert perf['mean_draw_ms']<35,perf
    checks.append('Observed 8+ seconds: red-only dots, coherent bottom-left to top-right crest, sustained animation and bounded particle count')
    video=page.video;ctx.close();shutil.copyfile(video.path(),OUT/'red-dot-motion.webm')

    for label,w,h,dpr in [('desktop',1440,900,1),('phone',390,844,3),('tablet',820,1180,2)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr)
        page=ctx.new_page();setup(page);page.goto(BASE+'/motion-preview');page.wait_for_load_state('networkidle')
        stage=page.locator('.particle-demo-stage')
        for shape in ['Landscape','Square','Portrait']:
            page.get_by_role('button',name=shape,exact=True).click();stage.scroll_into_view_if_needed();page.wait_for_timeout(200)
            for surface in ['Ink','Paper']:
                page.get_by_role('button',name=surface,exact=True).click();stage.scroll_into_view_if_needed();page.wait_for_timeout(300)
                sample=page.evaluate(PIXELS);assert sample['nonRed']==0,sample
                bounds=stage.bounding_box();canvas=field(page).locator('canvas')
                css_width=canvas.evaluate('c=>c.getBoundingClientRect().width')
                assert abs(sample['width']-round(css_width*min(dpr,2)))<=1
                assert sample['count']<=6000
                expected=1.6 if shape=='Landscape' else 1 if shape=='Square' else .75
                assert abs(bounds['width']/bounds['height']-expected)<.025
                capture(page,f'{label}-{shape.lower()}-{surface.lower()}')
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        page.get_by_role('button',name='Landscape',exact=True).click();stage.scroll_into_view_if_needed()
        start(page)
        before=stage.bounding_box();before_frames=frames(page)
        page.get_by_role('button',name='Reveal demo image',exact=True).click()
        image=page.locator('.generation-preview-image')
        expect(image).to_be_visible();page.wait_for_timeout(70)
        fade=image.evaluate('e=>({opacity:Number(getComputedStyle(e).opacity),duration:getComputedStyle(e).transitionDuration})')
        assert fade['duration']=='0.5s',fade
        assert 0<fade['opacity']<1,fade
        expect(field(page)).to_have_attribute('data-rendering','false')
        page.wait_for_timeout(550);after=stage.bounding_box()
        assert abs(before['width']-after['width'])<1 and abs(before['height']-after['height'])<1
        expect(image).to_have_css('opacity','1')
        assert image.evaluate('i=>i.complete && i.naturalWidth>0')
        frozen=frames(page);page.wait_for_timeout(200);assert frames(page)==frozen
        page.set_viewport_size({'width':w-20,'height':h});page.wait_for_timeout(150);assert frames(page)==frozen
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150);assert frames(page)==frozen
        capture(page,f'{label}-decoded-completion')
        start(page)
        page.get_by_role('button',name='Simulate failure',exact=True).click()
        expect(page.locator('.generation-preview-error')).to_contain_text('Preview unavailable')
        assert field(page).count()==0
        start(page)
        page.get_by_role('button',name='Cancel',exact=True).click()
        expect(page.get_by_role('heading',name='Preview cancelled.')).to_be_visible()
        retired=page.evaluate('window.dotRecords.map(r=>r.frames)');page.wait_for_timeout(200)
        assert retired==page.evaluate('window.dotRecords.map(r=>r.frames)')
        checks.append(f'{label}: square/portrait/landscape on ink/paper, DPR cap, stable dimensions, decode-first 500ms crossfade, inactive frame stop, failure and cancellation')
        ctx.close()

    ctx=browser.new_context(viewport={'width':1440,'height':900})
    page=ctx.new_page();setup(page);page.goto(BASE+'/motion-preview');page.wait_for_load_state('networkidle')
    stage=page.locator('.particle-demo-stage');stage.scroll_into_view_if_needed();page.wait_for_timeout(700)
    # Natural offscreen scrolling, with extra document space supplied only by the test.
    page.evaluate("let spacer=document.createElement('div');spacer.id='test-spacer';spacer.style.height='1800px';document.body.append(spacer);window.scrollTo({top:document.body.scrollHeight,behavior:'instant'})")
    expect(field(page)).to_have_attribute('data-rendering','false')
    n=frames(page);page.wait_for_timeout(300);assert frames(page)==n
    page.evaluate("document.getElementById('test-spacer').remove()")
    stage.scroll_into_view_if_needed();expect(field(page)).to_have_attribute('data-rendering','true')
    # Trigger the same visibility listener used by a real backgrounded browser tab.
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
    expect(field(page)).to_have_attribute('data-rendering','false')
    frozen=field(page).locator('canvas').evaluate('c=>c.toDataURL()');n=frames(page)
    page.wait_for_timeout(350);assert frames(page)==n
    resumed=page.evaluate("""async()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));return await new Promise(resolve=>requestAnimationFrame(()=>resolve(document.querySelector('.red-dot-loader canvas').toDataURL())))}""")
    assert resumed==frozen,'Visibility resume advanced the paused clock'
    page.emulate_media(reduced_motion='reduce');expect(field(page)).to_have_attribute('data-motion','static');expect(field(page)).to_have_attribute('data-rendering','false')
    n=frames(page);page.wait_for_timeout(300);assert frames(page)==n
    page.emulate_media(reduced_motion='no-preference');expect(field(page)).to_have_attribute('data-rendering','true')
    page.set_viewport_size({'width':1060,'height':760});stage.scroll_into_view_if_needed();page.wait_for_timeout(250)
    assert page.evaluate(PIXELS)['count']<=6000
    page.get_by_role('button',name='Toggle fullscreen preview',exact=True).click()
    page.wait_for_function('!!document.fullscreenElement');page.wait_for_timeout(250)
    box=stage.bounding_box();assert box['width']==1060 and box['height']==760,box
    assert page.evaluate(PIXELS)['count']<=6000
    capture(page,'fullscreen-bottom-left-to-top-right')
    page.get_by_role('button',name='Toggle fullscreen preview',exact=True).click();page.wait_for_function('!document.fullscreenElement')
    for i in range(3):
        old=page.evaluate('window.dotRecords.map(r=>r.frames)')
        page.locator('.particle-demo-note').get_by_role('link',name='Get a quote',exact=True).click();expect(page).to_have_url(BASE+'/quote');expect(page.locator('.valuation-page')).to_be_visible();expect(page.locator('.particle-demo-page')).to_have_count(0)
        await_frames=page.evaluate('window.dotRecords.map(r=>r.frames)');page.wait_for_timeout(200)
        assert await_frames==page.evaluate('window.dotRecords.map(r=>r.frames)')
        page.go_back();page.wait_for_load_state('networkidle');stage.scroll_into_view_if_needed();expect(field(page)).to_have_attribute('data-rendering','true')
        assert page.evaluate('window.dotRecords.filter(r=>r.canvas.isConnected).length')==1
    checks.append('Offscreen/visibility pause with unchanged resume frame, live reduced-motion changes, resize/fullscreen, and three clean client-navigation mount/unmount cycles')
    # Hold an actual image response: particles must continue until decode can finish.
    pending=[]
    page.route('**/cars/ferrari-roma-2022/1.jpg',lambda route:pending.append(route))
    page.get_by_role('button',name='Reveal demo image',exact=True).click()
    expect(page.locator('.generation-preview')).to_have_attribute('aria-busy','true')
    expect(field(page)).to_have_attribute('data-rendering','true')
    expect(page.locator('.generation-preview-image')).to_have_count(0)
    page.wait_for_timeout(250)
    assert pending
    pending[0].fulfill(status=200,content_type='image/jpeg',body=(Path(__file__).parents[1]/'public/cars/ferrari-roma-2022/1.jpg').read_bytes())
    expect(page.locator('.generation-preview-image')).to_be_visible()
    expect(page.locator('.generation-preview')).to_have_attribute('aria-busy','false')
    page.unroute('**/cars/ferrari-roma-2022/1.jpg')
    checks.append('A held image request keeps particles active and aria-busy until the real image loads and decodes')
    start(page)
    # A real image error also ends the field, independently of the simulated backend error.
    page.route('**/cars/ferrari-roma-2022/1.jpg',lambda route:route.abort())
    count_before=len(console_errors)
    page.get_by_role('button',name='Reveal demo image',exact=True).click()
    expect(page.locator('.generation-preview-error')).to_contain_text('couldn’t be opened')
    assert field(page).count()==0
    expected_image_errors.extend(console_errors[count_before:]);del console_errors[count_before:]
    checks.append('Image decode/request failure shows actionable error and releases the particle renderer')
    ctx.close()
    ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=ctx.new_page();setup(page);page.goto(BASE+'/motion-preview');page.wait_for_load_state('networkidle');page.locator('.particle-demo-stage').scroll_into_view_if_needed()
    expect(field(page)).to_have_attribute('data-motion','static');expect(field(page)).to_have_attribute('data-rendering','false')
    n=frames(page);page.wait_for_timeout(300);assert frames(page)==n
    assert page.evaluate(PIXELS)['pixels']>100
    expect(page.locator('.generation-preview + [role=status]')).to_have_text('Preparing the demo image…')
    expect(field(page).locator('canvas')).to_have_attribute('aria-hidden','true')
    expect(page.locator('.generation-preview')).to_have_attribute('aria-busy','true')
    capture(page,'phone-reduced-motion-static')
    checks.append('Reduced motion on first mount: visible static red field, no continuing frames, decorative canvas and concise accessible status')
    ctx.close()
    for label,w,h in [('desktop',1440,900),('phone',390,844)]:
        ctx=browser.new_context(viewport={'width':w,'height':h})
        page=ctx.new_page();setup(page);page.goto(BASE+'/quote');page.wait_for_load_state('networkidle')
        page.get_by_role('button',name='Fortuner · 2023',exact=True).click()
        page.locator('input[type=file]').set_input_files(str(Path(__file__).parents[1]/'public/cars/toyota-fortuner-legender-2023/1.jpg'))
        expect(page.locator('.quote-photo-grid li')).to_have_count(1)
        page.get_by_role('button',name='Get my quote',exact=True).click()
        expect(page.locator('.quote-particle-output')).to_have_attribute('aria-busy','true')
        expect(field(page)).to_have_attribute('data-rendering','true')
        before=page.locator('.quote-particle-output').bounding_box()
        page.wait_for_timeout(1200);capture(page,f'{label}-quote-particle-integration')
        expect(page.locator('.quote-estimate>strong')).to_have_text('₹28.8 lakh',timeout=10000)
        expect(page.locator('.quote-particle-output .generation-preview-image')).to_be_visible()
        expect(page.locator('.quote-particle-output')).to_have_attribute('aria-busy','false')
        expect(field(page)).to_have_attribute('data-rendering','false')
        after=page.locator('.quote-particle-output').bounding_box()
        assert abs(before['width']-after['width'])<1 and abs(before['height']-after['height'])<1
        page.wait_for_timeout(550);capture(page,f'{label}-quote-image-completion')
        checks.append(f'{label}: actual quote simulation uses red particles, retains photo-plate dimensions, decodes attached image and stops canvas on completion')
        ctx.close()
    assert not errors,errors
    assert not console_errors,console_errors
    return perf

if __name__=='__main__':
    perf={}
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
            try: perf=run(browser)
            finally: browser.close()
    finally:
        (OUT/'particle-verification.json').write_text(json.dumps({'passed':checks,'runtime_errors':errors,'console_errors':console_errors,'expected_image_errors':expected_image_errors,'motion_samples':motion,'performance':perf},indent=2))
    print('Completed particle scenarios:',len(checks));print(json.dumps(perf))
