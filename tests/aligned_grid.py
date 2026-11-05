"""Validate straight square lattice centres across frames, plus unobtrusive attribution."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('VIP_TEST_URL','http://localhost:3001')
OUT=Path(os.environ.get('VIP_TEST_OUTPUT','test-results/aligned-grid'))
OUT.mkdir(parents=True,exist_ok=True)
checks,errors,console_errors,metrics=[],[],[],[]
INSTRUMENT=r'''(()=>{
 const p=CanvasRenderingContext2D.prototype;
 const clear=p.clearRect,begin=p.beginPath,arc=p.arc,move=p.moveTo,line=p.lineTo;
 p.clearRect=function(...a){if(this.canvas.closest('.red-dot-loader')){let r=this.canvas.gridRecord;if(!r)r=this.canvas.gridRecord={points:new Float64Array(12000),count:0,frames:0,energy:0};r.count=0;r.energy=0;r.frames++}return clear.apply(this,a)};
 p.beginPath=function(...a){this.gridCaptured=false;this.gridStart=null;return begin.apply(this,a)};
 p.arc=function(x,y,r,...a){const g=this.canvas.gridRecord;if(g){g.points[g.count++]=x;g.points[g.count++]=y;g.energy+=this.globalAlpha*r}return arc.call(this,x,y,r,...a)};
 p.moveTo=function(x,y){if(!this.gridCaptured)this.gridStart=[x,y];return move.call(this,x,y)};
 p.lineTo=function(x,y){const g=this.canvas.gridRecord;if(g&&this.gridStart&&!this.gridCaptured){g.points[g.count++]=(x+this.gridStart[0])/2;g.points[g.count++]=(y+this.gridStart[1])/2;g.energy+=this.globalAlpha*Math.hypot(x-this.gridStart[0],y-this.gridStart[1]);this.gridCaptured=true}return line.call(this,x,y)};
})()'''
GEOMETRY=r'''canvas=>{
 const r=canvas.gridRecord;let xs=new Set(),ys=new Set();
 for(let i=0;i<r.count;i+=2){xs.add(r.points[i].toFixed(3));ys.add(r.points[i+1].toFixed(3))}
 const sorted=s=>[...s].map(Number).sort((a,b)=>a-b),steps=a=>a.slice(1).map((v,i)=>v-a[i]);
 const x=sorted(xs),y=sorted(ys),sx=steps(x),sy=steps(y);
 const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
 canvas.gridBaseline={points:r.points.slice(0,r.count),frames:r.frames,energy:r.energy};
 return {columns:x.length,rows:y.length,count:r.count/2,xSpacing:mean(sx),ySpacing:mean(sy),xDeviation:Math.max(...sx)-Math.min(...sx),yDeviation:Math.max(...sy)-Math.min(...sy)};
}'''
DRIFT=r'''canvas=>{const r=canvas.gridRecord,b=canvas.gridBaseline;let max=0;for(let i=0;i<r.count;i++)max=Math.max(max,Math.abs(r.points[i]-b.points[i]));return {max,frames:r.frames-b.frames,energyChange:Math.abs(r.energy-b.energy)}}'''

def verify_grid(page,selector,animated=True):
    canvas=page.locator(selector).locator('canvas')
    page.wait_for_function('(c)=>c.gridRecord?.count>0',arg=canvas.element_handle())
    data=canvas.evaluate(GEOMETRY)
    assert data['count']==data['columns']*data['rows'],data
    assert data['columns']>5 and data['rows']>5,data
    assert data['xDeviation']<.004 and data['yDeviation']<.004,data
    assert abs(data['xSpacing']-data['ySpacing'])<.004,data
    page.wait_for_timeout(450)
    drift=canvas.evaluate(DRIFT);assert drift['max']<.00001,drift
    if animated:assert drift['frames']>5 and drift['energyChange']>.001,drift
    else:assert drift['frames']==0,drift
    metrics.append({**data,**drift})

def fill(form):
    for key,value in [('make','Toyota'),('model','Fortuner'),('variant','4X2 Diesel AT'),('year','2023'),('mileage','60500')]:form.locator('[name='+key+']').fill(value)
    for key,value in [('fuel','Diesel'),('transmission','Automatic'),('owners','1'),('condition','good'),('accident','none'),('service','full')]:form.locator('[name='+key+']').select_option(value)

def run(browser):
    for theme,label,w,h in [('dark','desktop',1440,900),('light','desktop',1440,900),('dark','phone',390,844),('light','phone',390,844),('dark','tablet',820,1180)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=2)
        page=ctx.new_page();page.add_init_script(INSTRUMENT)
        page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
        page.goto(BASE+'/?theme='+theme);page.wait_for_load_state('networkidle')
        expect(page.locator('.hero-ambient .red-dot-loader')).to_have_attribute('data-rendering','true')
        verify_grid(page,'.hero-ambient .red-dot-loader')
        page.wait_for_timeout(1000);page.screenshot(path=str(OUT/f'{theme}-{label}-home.png'))
        expect(page.locator('.hero-visual .hero-slide-image[data-active=true] .hero-plate img')).to_be_visible()
        assert page.locator('a[href^="/credits"]').count()==0
        assert 'photography credits' not in page.locator('body').inner_text().lower()
        expect(page.get_by_role('link',name='Legal',exact=True)).to_have_attribute('href','/legal')
        page.set_viewport_size({'width':w-25,'height':h-20});page.wait_for_timeout(250)
        verify_grid(page,'.hero-ambient .red-dot-loader')
        page.goto(BASE+'/inventory/ferrari-roma-2022');page.wait_for_load_state('networkidle')
        assert page.locator('.photo-credit').count()==0
        assert 'Alexander-93' not in page.locator('body').inner_text()
        page.get_by_role('button',name='Next image',exact=True).click()
        expect(page.locator('.gallery-position>span').first).to_have_text('02')
        page.set_viewport_size({'width':w,'height':h})
        page.goto(BASE+'/quote');page.wait_for_load_state('networkidle');fill(page.locator('.valuation-form'))
        page.get_by_role('button',name='Get my quote',exact=True).click()
        expect(page.locator('.quote-particle-output .red-dot-loader')).to_have_attribute('data-character','cross')
        verify_grid(page,'.quote-particle-output .red-dot-loader')
        page.locator('.quote-particle-output').screenshot(path=str(OUT/f'{theme}-{label}-cross-grid.png'))
        page.screenshot(path=str(OUT/f'{theme}-{label}-quote-loading.png'))
        expect(page.locator('.quote-estimate>strong')).to_have_text('₹28.8 lakh',timeout=10000)
        checks.append(f'{theme}/{label}: equal square-grid pitch and complete rows/columns, fixed centres across animated frames and resize, aligned quote crosses, no prominent photo credits, gallery/quote functioning')
        ctx.close()
    ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=ctx.new_page();page.add_init_script(INSTRUMENT);page.goto(BASE);page.wait_for_load_state('networkidle')
    expect(page.locator('.hero-ambient .red-dot-loader')).to_have_attribute('data-motion','static')
    verify_grid(page,'.hero-ambient .red-dot-loader',animated=False)
    checks.append('Reduced-motion mode keeps the same exact aligned grid with no continuing frames')
    page.goto(BASE+'/legal');page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading',name='Legal information.')).to_be_visible()
    details=page.locator('.image-licences');assert not details.evaluate('e=>e.open')
    details.locator('summary').click()
    expect(page.locator('.image-licence-list li')).to_have_count(37)
    for item in page.locator('.image-licence-list li').all():assert item.locator('a').count()==2
    page.goto(BASE+'/credits');expect(page).to_have_url(BASE+'/legal')
    checks.append('Attribution consolidated into collapsed Legal information; all 37 source/licence records retained and old credits URL redirects')
    ctx.close();assert not errors,errors;assert not console_errors,console_errors

if __name__=='__main__':
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ['VIP_CHROMIUM_EXECUTABLE'])
            try:run(browser)
            finally:browser.close()
    finally:(OUT/'alignment-results.json').write_text(json.dumps({'passed':checks,'geometry':metrics,'runtime_errors':errors,'console_errors':console_errors},indent=2))
    print('Completed alignment/cleanup scenarios:',len(checks))
