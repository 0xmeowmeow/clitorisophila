import {Specimen,Connectome} from './scenes.js';

const $=id=>document.getElementById(id);
let specimen,connectome,worker,ready=false,auto=false,held=false,paused=false,lastRow=null;
let autoStart=0,nowTime=performance.now(),pointerActive=false,pointerStarted=0,contactUntil=0;
const sensory=[],reward=[];
try{
  specimen=new Specimen($('organism'));
  connectome=new Connectome($('organism'),specimen);
  specimen.onContact=value=>{
    held=value>0;
    if(held){
      if(!pointerActive){pointerStarted=performance.now();pointerActive=true;contactUntil=0}
      markTouched();setAuto(false);if(!ready&&!worker)start();
    }else if(pointerActive){
      pointerActive=false;
      // A short click must survive the worker's next simulation tick.
      // This bounded input pulse is still passed through the full model.
      contactUntil=pointerStarted+140;
    }
    sendInput();
  };
}catch(e){$('progress').textContent='This browser could not create the view. WebGL is required.';console.error(e)}

function markTouched(){document.body.classList.add('has-touched')}
function setAuto(value){
  auto=Boolean(value);autoStart=nowTime;
  $('auto').textContent=auto?'Stop':'Pulse';$('auto').setAttribute('aria-pressed',String(auto));
  if(auto)markTouched();
}
function frame(){
  const intensity=Number($('intensity').value);
  const contact=!paused&&(held||performance.now()<contactUntil||(auto&&((nowTime-autoStart)%2200<350)));
  specimen?.setContact(contact?1:0,undefined,Number($('contact-size').value));
  const encoded=specimen?.encode(contact?intensity:0);
  $('contact-state').textContent=paused?'Paused':contact?'Touch':'Live';
  $('contact-state').classList.toggle('touching',contact);
  return contact?encoded:{};
}
function sendInput(){const channels=frame();if(ready)worker.postMessage({type:'input',channels})}
setInterval(sendInput,20);

function plot(canvas,values,color){
  const ratio=Math.min(devicePixelRatio,2),w=canvas.clientWidth,h=canvas.clientHeight;
  if(!w||!h)return;
  if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=w*ratio;canvas.height=h*ratio}
  const c=canvas.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
  c.strokeStyle='#23352c';c.lineWidth=1;c.beginPath();c.moveTo(0,h-1);c.lineTo(w,h-1);c.stroke();
  const max=Math.max(10,...values);c.strokeStyle=color;c.lineWidth=1;c.beginPath();
  values.forEach((v,i)=>{const x=w-(values.length-i)*w/240,y=h-3-v/max*(h-6);i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();
}
function render(t){
  nowTime=t;frame();specimen?.render();connectome?.render();
  if($('about').open&&document.querySelector('.instruments').open){plot($('sensory-trace'),sensory,'#83d9cf');plot($('reward-trace'),reward,'#e3b57e')}
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

function start(){
  if(worker)return;
  if(!specimen||!connectome){fail('This browser could not create the view. Try a browser with WebGL enabled.');return}
  $('load').disabled=true;$('load').hidden=true;document.querySelector('.loading-title').textContent='Waking up…';$('loading').dataset.loading='true';$('progress').textContent='';$('progress-bar').style.width='0%';
  worker=new Worker('./worker.js?v=touch-20261009b',{type:'module'});
  worker.onmessage=({data})=>{
    if(data.type==='progress'){
      $('progress').textContent=Math.round(data.fraction*100)+'%';
      $('progress-bar').style.width=(data.fraction*100)+'%';
    }else if(data.type==='ready'){
      ready=true;connectome.initialize(data.positions,{...data.groups,circuit:data.circuit},data.drawPositions);
      $('loading').hidden=true;document.body.dataset.ready='true';
      for(const id of ['stimulate','auto','pause','reset'])$(id).disabled=false;
      window.clitorisophila.manifest=data.manifest;window.clitorisophila.ready=true;
      worker.postMessage({type:'controls',reward:$('reward-enabled').checked,learning:$('learning').checked});
      $('speed').textContent='Live · full retained graph';
    }else if(data.type==='tick'){
      lastRow=data.row;window.clitorisophila.lastRow=lastRow;
      connectome.spikes(data.indices,data.counts);connectome.rewardDelivered=lastRow.reward_delivered;
      const s=Object.values(lastRow.sensory_spikes).reduce((a,b)=>a+b,0);
      sensory.push(s);reward.push(lastRow.reward_spikes);if(sensory.length>240){sensory.shift();reward.shift()}
      const interior=lastRow.interior;
      if(interior)for(const [label,key,scale]of [['pleasure','pleasure_hz',150],['drive','drive_hz',100],['danger','danger_hz',150]]){
        $(label+'-value').textContent=interior[key].toFixed(1);
        $(label+'-value').setAttribute('aria-label',interior[key].toFixed(1)+' hertz');
        $(label+'-meter').style.width=Math.min(100,interior[key]/scale*100)+'%';
      }
      $('sensory-value').textContent=s;$('reward-value').textContent=lastRow.reward_spikes;
      $('sim-time').textContent=(lastRow.sim_ms/1000).toFixed(2)+' s';
      $('changed').textContent=lastRow.changed_edges.toLocaleString()+' / 7,835';
      $('speed').textContent='20 ms simulated / '+lastRow.wall_ms.toFixed(1)+' ms compute';
    }else if(data.type==='reset'){
      sensory.length=reward.length=0;connectome.clear();$('sensory-value').textContent='0';$('reward-value').textContent='0';
      for(const name of ['pleasure','drive','danger']){$(name+'-value').textContent='0.0';$(name+'-meter').style.width='0%'}
      $('changed').textContent='0 / 7,835';$('sim-time').textContent='0.00 s';
    }else if(data.type==='error')fail(data.message);
  };
  worker.onerror=e=>fail('The simulation could not start. '+e.message);
  worker.postMessage({type:'load'});
}
function fail(message){
  ready=false;clearContact();setAuto(false);window.clitorisophila.ready=false;document.body.dataset.ready='false';
  worker?.terminate();worker=null;$('loading').hidden=false;$('loading').dataset.loading='false';$('progress').textContent=message;
  $('load').disabled=false;$('load').hidden=false;$('load').textContent='Try again';document.querySelector('.loading-title').textContent='A little help waking up.';
  for(const id of ['stimulate','auto','pause','reset'])$(id).disabled=true;
  console.error(message);
}
function clearContact(){held=false;pointerActive=false;contactUntil=0}
function release(){clearContact();setAuto(false);sendInput()}
function setPaused(value){
  paused=Boolean(value);clearContact();setAuto(false);
  $('pause').textContent=paused?'Resume':'Pause';worker?.postMessage({type:'pause',paused});sendInput();
}
$('load').onclick=start;
$('stimulate').onpointerdown=e=>{held=true;markTouched();setAuto(false);$('stimulate').setPointerCapture(e.pointerId);sendInput()};
$('stimulate').onpointerup=$('stimulate').onpointercancel=()=>{held=false;sendInput()};
window.addEventListener('blur',release);
document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&ready&&!$('about').open&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)){
    e.preventDefault();held=true;setAuto(false);markTouched();sendInput();
  }else if(e.code==='Space'&&e.target.id==='stimulate'){
    e.preventDefault();held=true;setAuto(false);markTouched();sendInput();
  }
});
document.addEventListener('keyup',e=>{if(e.code==='Space'){held=false;sendInput()}});
$('auto').onclick=()=>{clearContact();setAuto(!auto);sendInput()};
$('pause').onclick=()=>setPaused(!paused);
$('reset').onclick=()=>{release();worker?.postMessage({type:'reset'})};
for(const id of ['reward-enabled','learning'])$(id).onchange=()=>worker?.postMessage({type:'controls',reward:$('reward-enabled').checked,learning:$('learning').checked});
$('intensity').oninput=()=>{$('intensity-label').textContent=Math.round(Number($('intensity').value)*100)+'%';sendInput()};
$('contact-size').oninput=()=>{const n=Number($('contact-size').value);$('size-label').textContent=n<.1?'Small':n>.25?'Large':'Medium';sendInput()};
$('about-open').onclick=()=>{$('about').showModal();clearContact();sendInput()};
$('about').addEventListener('click',e=>{if(e.target===$('about')){const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close()}});
$('focus').onclick=()=>{connectome?.focus('circuit');$('about').close()};
$('whole').onclick=()=>{connectome?.focus('whole');$('about').close()};
window.clitorisophila={
  ready:false,lastRow:null,start,
  setInput(channels){if(ready)worker.postMessage({type:'input',channels})},
  setAuto(value){setAuto(value);sendInput()},
  pause:setPaused,
  setContact({point,radius,pressure=1}={}){
    clearContact();
    if(point&&specimen)specimen.contactCentre=point.slice();
    if(radius!==undefined){$('contact-size').value=String(radius);$('contact-size').oninput()}
    if(pressure>0)$('intensity').value=String(Math.max(0,Math.min(1,pressure)));
    setAuto(false);held=pressure>0;if(held)markTouched();sendInput();
  },
  releaseContact(){clearContact();sendInput()},
  focus(shot){connectome?.focus(shot)},
  projectContact(point){return specimen?.projectContact(point)},
};
start();
