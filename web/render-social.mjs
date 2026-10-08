/** Capture the running artwork for a square social export. No simulation values are mocked.
 * CHROMIUM_EXECUTABLE=/path/to/chrome node web/render-social.mjs [--preview]
 * Then: python3 tools/encode-social.py
 */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const output=path.resolve(process.env.SOCIAL_OUTPUT ?? 'assets/social');
const preview=process.argv.includes('--preview');
const url=process.env.ARTWORK_URL ?? 'http://127.0.0.1:8771/?autoload';
const size=960;
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
// Settle the presentation camera immediately; neuron/nerve/heart animation is
// still driven by the live application and is not affected by this preference.
const context=await browser.newContext({viewport:{width:size,height:size},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:preview?undefined:{dir:'/tmp/clitorisophila-social-video',size:{width:size,height:size}}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const started=Date.now();
try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.clitorisophila?.ready,null,{timeout:180000});
  await page.locator('#contact-size').fill('0.25');await page.locator('#contact-size').dispatchEvent('input');
  await page.addStyleTag({content:`
    html,body{width:960px!important;height:960px!important;overflow:hidden!important;background:#000!important}
    body>*:not(#social-capture){visibility:hidden!important}
    #social-capture{position:fixed;inset:0;z-index:100;background:#000;color:#eadfcf;visibility:visible!important}
    #social-capture #organism{position:absolute!important;inset:0!important;width:960px!important;height:960px!important;visibility:visible!important}
    .social-header{position:absolute;left:46px;top:32px;right:46px;z-index:2;pointer-events:none}
    .social-header h1{font:400 76px/1 Georgia,serif;letter-spacing:-.052em;margin:0;color:#eadfcf}
    .social-footer{position:absolute;left:46px;right:46px;bottom:28px;z-index:2;color:#9aa99e;font:17px/1.4 ui-monospace,monospace}
  `});
  await page.evaluate(()=>{
    window.scrollTo(0,0);
    const capture=document.createElement('div');capture.id='social-capture';
    capture.innerHTML='<header class="social-header"><h1>Clitorisophila</h1></header><div class="social-footer">meow-meow.io/clitorisophila</div>';
    capture.prepend(document.getElementById('organism'));document.body.append(capture);
    window.clitorisophila.focus('social');
    window.clitorisophila.setAuto(false);
  });
  await page.waitForTimeout(2400);
  const contact=async(point,radius,pressure=.9)=>page.evaluate(({point,radius,pressure})=>{if(!window.clitorisophila.setContact)throw Error('The artwork must expose setContact for direct touch capture.');window.clitorisophila.setContact({point,radius,pressure})},{point,radius,pressure});
  const release=async()=>page.evaluate(()=>window.clitorisophila.releaseContact());
  await contact([.15,.91,.44],.28);
  await page.waitForFunction(()=>window.clitorisophila.lastRow?.reward_spikes>0,null,{timeout:15000});
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(output,'clitorisophila-facebook-preview.png')});
  await release();
  if(!preview){
    // The standalone poster uses a warm-up pulse. Start the film from the
    // simulator's real reset state, rather than carrying that pulse into it.
    await page.evaluate(()=>document.getElementById('reset').click());
    await page.waitForFunction(()=>window.clitorisophila.lastRow?.sim_ms<500,null,{timeout:10000});
    await page.waitForTimeout(600);
    // Three direct contacts; every rise and decay comes from the running worker.
    const clipStart=(Date.now()-started)/1000;
    let maxReward=0,maxPleasure=0,rows=0;
    const contacts=[[[.15,.91,.44],.16],[[-.60,-.35,.38],.43],[[.15,.91,.44],.38]];
    for(const [cycle,[point,radius]]of contacts.entries()){
      await page.waitForTimeout(350);
      await contact(point,radius);
      await page.waitForTimeout(800);
      const state=await page.evaluate(()=>window.clitorisophila.lastRow);
      maxReward=Math.max(maxReward,state.reward_spikes);maxPleasure=Math.max(maxPleasure,state.interior?.pleasure_hz??0);rows++;
      await release();
      await page.waitForTimeout(cycle===contacts.length-1?4000:1300);
    }
    const duration=(Date.now()-started)/1000-clipStart;
    const state=await page.evaluate(()=>({ready:window.clitorisophila.ready,row:window.clitorisophila.lastRow,neurons:window.clitorisophila.manifest.neurons,connections:window.clitorisophila.manifest.connections}));
    const video=page.video();await page.close();await context.close();const videoPath=await video.path();
    const metadata={source:videoPath,start:clipStart,duration,width:size,height:size,contacts,maxReward,maxPleasure,sampledRows:rows,errors,state};
    await fs.writeFile('/tmp/clitorisophila-social-capture.json',JSON.stringify(metadata,null,2)+'\n');
    console.log(JSON.stringify(metadata));
    if(errors.length)throw Error(errors.join('\n'));
    if(!maxPleasure)throw Error('The recording did not observe a live reward response.');
  }else console.log(JSON.stringify({preview:path.join(output,'clitorisophila-facebook-preview.png'),errors}));
}finally{await browser.close()}
