import {Specimen,Connectome} from './scenes.js';

const $=(id)=>document.getElementById(id);
let specimen,connectome,worker,ready=false,auto=false,held=false,paused=false,lastRow=null;
let autoStart=0,nowTime=0;
const sensory=[],reward=[];
try{specimen=new Specimen($('specimen'));connectome=new Connectome($('network'))}
catch(e){$('progress').textContent='This browser could not create the 3D view. Try a browser with WebGL enabled.';console.error(e)}

function frame(){
  const intensity=Number($('intensity').value),contact=held||(auto&&((nowTime-autoStart)%2200<350));
  specimen?.setContact(contact?1:0,$('region').value,Number($('contact-size').value));
  const encoded=specimen?.encode(contact?intensity:0);
  const channels=contact?encoded:{};
  $('contact-state').textContent=contact?'STIMULATION → REINFORCEMENT':'INPUT RELEASED';
  $('contact-state').classList.toggle('touching',contact);
  return channels;
}
function sendInput(){if(ready)worker.postMessage({type:'input',channels:paused?{}:frame()})}
setInterval(sendInput,20);

function plot(canvas,values,color){
  const ratio=Math.min(devicePixelRatio,2),w=canvas.clientWidth,h=canvas.clientHeight;
  if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=w*ratio;canvas.height=h*ratio}
  const c=canvas.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
  c.strokeStyle='#203542';c.lineWidth=1;
  for(let y=1;y<=3;y++){c.beginPath();c.moveTo(0,h*y/4);c.lineTo(w,h*y/4);c.stroke()}
  const max=Math.max(10,...values);c.strokeStyle=color;c.lineWidth=1.3;c.beginPath();
  values.forEach((v,i)=>{const x=w-(values.length-i)*w/240,y=h-5-v/max*(h-10);i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();
}
function render(t){nowTime=t;if(!paused)frame();specimen?.render();connectome?.render();plot($('sensory-trace'),sensory,'#69e6dd');plot($('reward-trace'),reward,'#f1be6c');requestAnimationFrame(render)}requestAnimationFrame(render);

function start(){
  if(worker)return;
  $('load').disabled=true;$('load').textContent='Loading…';
  worker=new Worker('./worker.js',{type:'module'});
  worker.onmessage=({data})=>{
    if(data.type==='progress'){$('progress').textContent=data.stage+' · '+Math.round(data.fraction*100)+'%';$('progress-bar').style.width=(data.fraction*100)+'%'}
    else if(data.type==='ready'){
      ready=true;connectome.initialize(data.positions,data.groups,data.drawPositions);$('loading').hidden=true;
      for(const id of ['stimulate','auto','pause','reset'])$(id).disabled=false;
      window.clitorisophila.manifest=data.manifest;
      window.clitorisophila.ready=true;
      worker.postMessage({type:'controls',reward:$('reward-enabled').checked,learning:$('learning').checked});
      $('speed').textContent='Live WASM · full retained graph';
    }else if(data.type==='tick'){
      lastRow=data.row;window.clitorisophila.lastRow=lastRow;
      connectome.spikes(data.indices,data.counts);
      const s=Object.values(lastRow.sensory_spikes).reduce((a,b)=>a+b,0);
      sensory.push(s);reward.push(lastRow.reward_spikes);if(sensory.length>240){sensory.shift();reward.shift()}
      $('sensory-value').textContent=s;$('reward-value').textContent=lastRow.reward_spikes;
      $('sim-time').textContent=(lastRow.sim_ms/1000).toFixed(2)+' s';
      $('changed').textContent=lastRow.changed_edges.toLocaleString()+' / 7,835';
      $('speed').textContent='20 ms simulated / '+lastRow.wall_ms.toFixed(1)+' ms compute';
    }else if(data.type==='reset'){sensory.length=reward.length=0;connectome.clear();$('changed').textContent='0 / 7,835';$('sim-time').textContent='0.00 s'}
    else if(data.type==='error')fail(data.message);
  };
  worker.onerror=(e)=>fail('Simulation could not start: '+e.message);
  worker.postMessage({type:'load'});
}
function fail(message){
  ready=false;held=false;auto=false;window.clitorisophila.ready=false;
  worker?.terminate();worker=null;$('loading').hidden=false;$('progress').textContent=message;
  $('load').disabled=false;$('load').textContent='Retry live simulation';
  for(const id of ['stimulate','auto','pause','reset'])$(id).disabled=true;
  console.error(message);
}
$('load').onclick=start;
$('stimulate').onpointerdown=(e)=>{held=true;$('stimulate').setPointerCapture(e.pointerId);sendInput()};
$('stimulate').onpointerup=$('stimulate').onpointercancel=()=>{held=false;sendInput()};
window.addEventListener('blur',()=>{held=false;auto=false;sendInput()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){held=false;auto=false;sendInput()}});
document.addEventListener('keydown',(e)=>{if(e.code==='Space'&&ready&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();held=true;sendInput()}});
document.addEventListener('keyup',(e)=>{if(e.code==='Space'){held=false;sendInput()}});
$('auto').onclick=()=>{auto=!auto;autoStart=nowTime;$('auto').textContent=auto?'Stop finger demo':'Run finger demo';$('auto').setAttribute('aria-pressed',auto);sendInput()};
$('pause').onclick=()=>{paused=!paused;held=false;auto=false;$('auto').textContent='Run finger demo';$('pause').textContent=paused?'Resume simulation':'Pause simulation';worker.postMessage({type:'pause',paused});sendInput()};
$('reset').onclick=()=>{auto=false;held=false;worker.postMessage({type:'reset'});$('auto').textContent='Run finger demo'};
for(const id of ['reward-enabled','learning'])$(id).onchange=()=>{worker?.postMessage({type:'controls',reward:$('reward-enabled').checked,learning:$('learning').checked})};
$('intensity').oninput=()=>{$('intensity-label').textContent=Math.round(Number($('intensity').value)*100)+'%';sendInput()};
$('contact-size').oninput=()=>{const n=Number($('contact-size').value);$('size-label').textContent=n<.1?'Small':n>.25?'Large':'Medium';sendInput()};
$('density').onchange=()=>{if(specimen)specimen.fieldPoints.visible=$('density').checked};
let placing=false;
$('place').onclick=()=>{placing=!placing;specimen?.placeMode(placing);$('place').setAttribute('aria-pressed',placing);$('place').textContent=placing?'Drag on anatomy':'Move contact'};
$('focus').onclick=()=>{const on=connectome?.toggleFocus?.();$('focus').textContent=on?'Show whole nervous system':'Focus stimulated circuit'};
window.clitorisophila={ready:false,lastRow:null,start,setInput(channels){if(ready)worker.postMessage({type:'input',channels})},setAuto(value){auto=value;autoStart=nowTime},pause(value){paused=value;worker?.postMessage({type:'pause',paused:value})}};
if(new URLSearchParams(location.search).has('autoload'))start();
