import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {makeField,REGION_CENTRES,stimulateField} from './surface.js';
import {NerveArbor,JUNCTION} from './nerve-arbor.js';
import {RewardHearts} from './reward-hearts.js';
const V=p=>new THREE.Vector3(...p);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let shared;
function view(container){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x05090c);
 const camera=new THREE.PerspectiveCamera(34,1,.1,60);camera.position.set(1.4,.5,10.8);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x05090c);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 container.append(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.2,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2;controls.maxDistance=18;controls.autoRotate=false;controls.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};controls.touches={ONE:null,TWO:THREE.TOUCH.DOLLY_ROTATE};
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.36,.65,.6);composer.addPass(bloom);
 composer.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0}},vertexShader:'varying vec2 uvCoord;void main(){uvCoord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;uniform float time;varying vec2 uvCoord;void main(){vec4 c=texture2D(tDiffuse,uvCoord);float v=1.-.35*pow(length((uvCoord-.5)*1.3),1.7);gl_FragColor=vec4(c.rgb*v,c.a);}'}));
 composer.addPass(new OutputPass());
 new ResizeObserver(()=>{const {width:w,height:h}=container.getBoundingClientRect();renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.domElement.style.touchAction='none';if(shared?.shot==='whole')shared.focus('whole')}).observe(container);
 let last=performance.now(),userUntil=0,animating=true;
 controls.addEventListener('start',()=>{userUntil=Infinity;animating=false});
 const state={scene,camera,renderer,controls,composer,focused:false,shot:'whole',targetCamera:new THREE.Vector3(1.4,.5,10.8),targetLook:new THREE.Vector3(0,.2,0),
  focus(name){this.shot=name;this.focused=name!=='whole';const mobile=container.clientWidth<650;const shots={social:[[.7,.9,12.4],[0,.65,0]],whole:[[mobile?.4:1.4,mobile?.8:.5,Math.max(10.8,7.15/camera.aspect)],[0,mobile?.8:.45,0]],touch:[[1.1,-.05,4.7],[0,-.3,.6]],wiring:[[1.4,1.1,6.8],[0,.8,.1]],circuit:[[.8,2.25,4.5],[0,2.1,-.5]],absence:[[0,.5,11],[0,.2,0]]};const [p,t]=shots[name]??shots.whole;this.targetCamera.set(...p);this.targetLook.set(...t);userUntil=0;animating=true},
  render(){const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(animating&&now>userUntil){const k=reduced?1:1-Math.exp(-dt*1.4);camera.position.lerp(this.targetCamera,k);controls.target.lerp(this.targetLook,k)}if(camera.position.distanceTo(this.targetCamera)<.005&&controls.target.distanceTo(this.targetLook)<.005)animating=false;controls.update(dt);composer.render()}};
 return state;
}
async function sculpture(name,material){const response=await fetch('./sculpture/'+name+'.bin');if(!response.ok)throw Error('Sculpture unavailable');const raw=await response.arrayBuffer(),n=new DataView(raw).getUint32(0,true),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(raw,4,n*3),3));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(raw,4+n*12,n*3),3));return new THREE.Mesh(g,material)}

export class Specimen {
 constructor(container){
  this.view=shared=view(container);this.onContact=null;this.lastTouch=-100;this.goal=0;this.contact=0;this.region='glans';this.radius=.15;
  this.root=new THREE.Group();this.root.position.set(0,-.8,.7);shared.scene.add(this.root);
  // A grazing-angle shell gives the nerves spatial context without burying them.
  const shell=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
   vertexShader:`varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
   fragmentShader:`varying vec3 n;varying vec3 eye;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),2.2);gl_FragColor=vec4(.30,.45,.43,.012+rim*.10);}`});
  const bulb=shell.clone();
  this.meshes=[];
  this.assetReady=Promise.all([sculpture('corpora',shell),sculpture('bulbs',bulb)]).then(ms=>{for(const m of ms){this.root.add(m);this.meshes.push(m)}}).catch(e=>{console.error(e);document.getElementById('progress').textContent=e.message});
  this.field=makeField();this.contactCentre=REGION_CENTRES.glans.slice();this.channels={};
  this.arbor=new NerveArbor(this.field);this.root.add(this.arbor);
  // There are no disconnected receptor dots. Every endpoint belongs to the arbor.
  this.fieldPoints=this.arbor;
  this.contactRing=new THREE.Mesh(new THREE.TorusGeometry(this.radius,.008,6,80),new THREE.MeshBasicMaterial({color:0xa7f3da,transparent:true,opacity:0,depthWrite:false}));this.root.add(this.contactRing);
  this.patch=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:0x80d9c8,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));this.root.add(this.patch);
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.hover=false;this.down=false;
  const canvas=shared.renderer.domElement;
  const pick=e=>{
   const rect=canvas.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,shared.camera);
   // Hit test the rendered nerve endpoints in screen space: the faint shell
   // cannot steal touch from the visible receptor tree behind it.
   let closest=null,best=Infinity;const candidates=[];
   this.root.updateWorldMatrix(true,false);
   const radius=Math.max(18,Math.min(38,this.radius*95));
   for(const p of this.field){const world=this.root.localToWorld(V(p.position));const clip=world.project(shared.camera),dx=(clip.x-this.pointer.x)*rect.width/2,dy=(clip.y-this.pointer.y)*rect.height/2,d=dx*dx+dy*dy;if(d<radius*radius){best=Math.min(best,d);candidates.push({p:p.position,d,z:clip.z})}}
   const front=candidates.filter(c=>c.d<=best+100).sort((a,b)=>a.z-b.z||a.d-b.d)[0];if(front)closest=front.p;
   if(closest){this.contactCentre=closest.slice();this.hover=true;canvas.style.cursor='crosshair';return true}
   this.hover=false;canvas.style.cursor='default';return false;
  };
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false)return;if(pick(e)){e.preventDefault();this.down=true;this.lastTouch=performance.now()/1000;canvas.setPointerCapture(e.pointerId);this.onContact?.(1)}});
  canvas.addEventListener('pointermove',e=>{if(this.down&&e.pointerType==='mouse'&&!(e.buttons&1)){release();return}const hit=pick(e);if(this.down){this.lastTouch=performance.now()/1000;this.onContact?.(hit?1:0)}});
  const release=()=>{if(this.down){this.down=false;this.onContact?.(0)}};
  window.addEventListener('blur',()=>{this.down=false;this.hover=false});
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);canvas.addEventListener('pointerleave',()=>{this.hover=false});
 }
 setContact(value,region,radius=.15){this.goal=value;if(radius!==this.radius){this.contactRing.geometry.dispose();this.contactRing.geometry=new THREE.TorusGeometry(radius,.008,6,80)}this.radius=radius;if(region&&region!==this.region){this.region=region;this.contactCentre=REGION_CENTRES[region].slice()}if(value>0)this.lastTouch=performance.now()/1000}
 projectContact(point){const p=this.root.localToWorld(V(point)).project(shared.camera),r=shared.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}}
 placeMode(){}
 encode(pressure){const result=stimulateField(this.field,this.contactCentre,this.radius,pressure);this.arbor.activate(result.activated);this.channels=result.channels;return result.channels}
 render(){
  const now=performance.now()/1000,dt=Math.min(.1,now-(this.lastRender??now));this.lastRender=now;
  this.contact+=(this.goal-this.contact)*(1-Math.exp(-dt*15));
  this.arbor.render(now,dt,now-this.lastTouch>4);
  const p=V(this.contactCentre);this.contactRing.position.copy(p);this.contactRing.material.opacity=this.contact*.85+(this.hover?.28:0);
  this.contactRing.quaternion.copy(shared.camera.quaternion);this.patch.quaternion.copy(shared.camera.quaternion);this.patch.position.copy(p).add(V([0,0,.006]));this.patch.scale.setScalar(this.radius);this.patch.material.opacity=this.contact*.075;
 }
}

export class Connectome {
 constructor(container,specimen){this.view=shared;this.specimen=specimen;this.active=new Set();this.group=new THREE.Group();this.group.position.set(0,2.1,-.65);this.group.rotation.set(.88,-.18,0);this.group.scale.setScalar(1.24);shared.scene.add(this.group);this.routes=[];this.live=false;this.hearts=new RewardHearts(shared.scene,shared.camera);
  this.previewReady=Promise.all(['soma.bin','fibres.bin','binding.json'].map(async file=>{const r=await fetch('./sculpture/'+file);if(!r.ok)throw Error('Display data unavailable');return file.endsWith('json')?r.json():new Float32Array(await r.arrayBuffer())})).then(([p,e,g])=>{if(!this.live)this.initialize(p,g,e,false)}).catch(console.error);
 }
 initialize(positions,groups,drawPositions,live=true){
  this.live=live;if(this.points){this.group.remove(this.points);this.geometry.dispose();this.material.dispose()}if(this.lines){this.group.remove(this.lines);this.lines.geometry.dispose();this.lines.material.dispose()}
  this.positions=positions;this.groups=groups;this.rewardSet=new Set(groups.reward);this.rewardOrigins=groups.reward.map(i=>this.group.localToWorld(V(Array.from(positions.slice(i*3,i*3+3)))));this.activity=new Float32Array(positions.length/3);const kind=new Float32Array(this.activity.length);for(const g of groups.sensory)for(const i of g)kind[i]=1;for(const i of groups.reward)kind[i]=2;
  this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setAttribute('activity',new THREE.BufferAttribute(this.activity,1));this.geometry.setAttribute('kind',new THREE.BufferAttribute(kind,1));
  this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{pixelRatio:{value:Math.min(devicePixelRatio,1.5)},densityScale:{value:1}},vertexShader:`attribute float activity;attribute float kind;varying float energy;varying float cellKind;varying float depth;uniform float pixelRatio;void main(){vec4 p=modelViewMatrix*vec4(position,1.);energy=activity;cellKind=kind;depth=position.z;gl_PointSize=clamp((1.1+activity*8.)*pixelRatio*(7./-p.z),1.,20.);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying float energy;varying float cellKind;varying float depth;uniform float densityScale;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;vec3 c=mix(vec3(.95,.71,.45),vec3(.20,.63,.66),smoothstep(.35,1.7,depth));if(cellKind>.5)c=vec3(.24,.92,.84);if(cellKind>1.5)c=vec3(1.,.55,.13);c=mix(c,vec3(1.,.95,.75),energy*.5);float a=(.26*densityScale*mix(1.,.12,smoothstep(.65,2.1,depth))+energy*.72)*exp(-d*d*3.);gl_FragColor=vec4(c,a);}`});
  this.points=new THREE.Points(this.geometry,this.material);this.group.add(this.points);
  if(drawPositions){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(drawPositions,3));this.lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xb29873,transparent:true,opacity:.012,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.lines)}
  this.makeRoutes();
  if(this.circuitLines){this.group.remove(this.circuitLines);this.circuitLines.geometry.dispose();this.circuitLines.material.dispose()}
  if(groups.circuit){
   this.circuit=groups.circuit;const n=groups.circuit.pre.length,cp=new Float32Array(n*6);this.circuitColors=new Float32Array(n*6);
   for(let e=0;e<n;e++)for(let side=0;side<2;side++){const i=side?groups.circuit.post[e]:groups.circuit.pre[e];cp.set(positions.slice(i*3,i*3+3),e*6+side*3)}
   const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.BufferAttribute(cp,3));cg.setAttribute('color',new THREE.BufferAttribute(this.circuitColors,3));
   this.circuitLines=new THREE.LineSegments(cg,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.circuitLines);
  }
  const selected=[...groups.sensory.flat(),...groups.reward];this.focusTarget=new THREE.Vector3();for(const i of selected)this.focusTarget.add(V(Array.from(positions.slice(i*3,i*3+3))));this.focusTarget.divideScalar(selected.length);this.group.localToWorld(this.focusTarget);
 }
 makeRoutes(){
  for(const route of this.routes){shared.scene.remove(route.line);route.line.geometry.dispose();route.line.material.dispose()}this.routes=[];
  if(this.pulses){shared.scene.remove(this.pulses);this.pulses.geometry.dispose();this.pulses.material.dispose()}
  shared.scene.updateMatrixWorld(true);
  for(let region=0;region<4;region++)for(let j=0;j<(region<3?this.groups.sensory[region]:this.groups.reward).length;j++){
   const index=(region<3?this.groups.sensory[region]:this.groups.reward)[j],side=j%2?1:-1,t=(j%16)/15;
   const source=this.specimen.root.localToWorld(V(JUNCTION));
   const target=this.group.localToWorld(V(Array.from(this.positions.slice(index*3,index*3+3))));
   const curve=new THREE.CatmullRomCurve3([source,V([side*(.035+t*.018),-.08,.69]),V([side*(.12+t*.045),.45,.15]),V([side*(.28+t*.07),1.0,-.15]),target]);
   const g=new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
   const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:region===3?0xf2b267:region===1?0x95d4cd:region===2?0xab8e68:0x72d6c7,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending}));shared.scene.add(line);this.routes.push({curve,line,index,region,phase:j/32});
  }
  const n=this.routes.length;this.pulsePositions=new Float32Array(n*3);this.pulseColors=new Float32Array(n*3);const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(this.pulsePositions,3));pg.setAttribute('color',new THREE.BufferAttribute(this.pulseColors,3));this.pulses=new THREE.Points(pg,new THREE.PointsMaterial({size:.034,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));shared.scene.add(this.pulses);
 }
 toggleFocus(){const on=shared.shot!=='circuit';this.focus(on?'circuit':'whole');return on}
 focus(shot){shared.focus(shot);if(shot==='circuit'&&this.focusTarget){shared.targetLook.copy(this.focusTarget);shared.targetCamera.copy(this.focusTarget).add(new THREE.Vector3(.65,.15,3.3))}}
 spikes(indices,counts){if(!this.activity)return;let rewardCount=0;for(let k=0;k<indices.length;k++){this.activity[indices[k]]=Math.min(1,.35+counts[k]*.35);this.active.add(indices[k]);if(this.rewardSet.has(indices[k]))rewardCount+=counts[k]}this.hearts.receive(rewardCount,this.rewardOrigins)}
 clear(){this.activity?.fill(0);this.active.clear();this.hearts.clear();this.rewardDelivered=0}
 render(){if(this.material)this.material.uniforms.densityScale.value=Math.min(1,Math.pow(shared.renderer.domElement.clientWidth/1300,1.2));const time=performance.now()/1000,dt=Math.min(.05,time-(this.last??time));this.last=time;if(this.activity){const decay=Math.exp(-dt*7);for(const i of this.active){this.activity[i]*=decay;if(this.activity[i]<.015){this.activity[i]=0;this.active.delete(i)}}this.geometry.attributes.activity.needsUpdate=true}
  if(this.circuitLines){for(let e=0;e<this.circuit.pre.length;e++){const a=this.activity[this.circuit.pre[e]]??0,b=this.activity[this.circuit.post[e]]??0,energy=Math.max(a,b);const level=.002+energy*.20;this.circuitColors.set([level*.7,level*.9,level*.68,level*.7,level*.9,level*.68],e*6)}this.circuitLines.geometry.attributes.color.needsUpdate=true}
  const channels=this.specimen.channels;
  for(let i=0;i<this.routes.length;i++){const r=this.routes[i],level=r.region===3?(this.rewardDelivered??0):(channels[['glans','hood','surrounding'][r.region]]??0);r.line.material.opacity=.028+level*.09+(this.activity[r.index]??0)*.1;
   for(let k=0;k<1;k++){const p=r.curve.getPoint((time*2.8+r.phase+k/3)%1),at=(i+k)*3;this.pulsePositions.set([p.x,p.y,p.z],at);const strength=this.live?Math.sqrt(Math.min(1,level*2)):0;this.pulseColors.set(r.region===3?[strength,.58*strength,.19*strength]:[.38*strength,.95*strength,.80*strength],at)}
  }
  if(this.pulses){this.pulses.geometry.attributes.position.needsUpdate=true;this.pulses.geometry.attributes.color.needsUpdate=true}this.hearts.render(time);shared.render();
 }
}
