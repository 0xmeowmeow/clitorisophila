import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url=process.env.ARTWORK_URL??'http://127.0.0.1:8771/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(url);await page.waitForFunction(()=>window.clitorisophila?.ready,null,{timeout:180000});
 // A real browser click, not a direct stimulation-frame call.
 await page.waitForTimeout(1800);
 await page.evaluate(()=>{window.probe={reward:0,maxInput:0,tick:-1};window.probeTimer=setInterval(()=>{const r=window.clitorisophila.lastRow;if(r&&r.tick!==window.probe.tick){window.probe.tick=r.tick;window.probe.reward+=r.reward_spikes;window.probe.maxInput=Math.max(window.probe.maxInput,...Object.values(r.input))}},5)});
 const p=await page.evaluate(()=>window.clitorisophila.projectContact([.15,.91,.44]));await page.mouse.click(p.x,p.y);await page.waitForTimeout(1200);
 const tap=await page.evaluate(()=>window.probe);assert(tap.maxInput>0,'Quick click was lost');assert(tap.reward>0,'Quick click produced no reward response');
 await page.screenshot({path:'/tmp/clitorisophila-touch-final.png'});
 await page.locator('#about-open').click();await page.locator('.instruments summary').click();await page.locator('#pause').click();await page.waitForTimeout(400);
 const tick=await page.evaluate(()=>window.clitorisophila.lastRow.tick);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.clitorisophila.lastRow.tick),tick);
 await page.locator('#reset').click();await page.waitForTimeout(200);assert.equal(await page.locator('#sim-time').textContent(),'0.00 s');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
 await page.screenshot({path:'/tmp/clitorisophila-mobile-final.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({url,automaticLoad:true,tap,pauseStable:true,reset:true,mobileOverflow:false,errors}));
}finally{await browser.close()}
