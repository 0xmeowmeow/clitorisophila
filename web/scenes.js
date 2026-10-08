import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {makeField,REGION_CENTRES,stimulateField} from './surface.js';
const V=p=>new THREE.Vector3(...p);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let shared;
function view(container){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x05090c);
 const camera=new THREE.PerspectiveCamera(34,1,.1,60);camera.position.set(1.4,.5,10.8);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x05090c);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 container.append(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.2,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2;controls.maxDistance=18;controls.autoRotate=!reduced;controls.autoRotateSpeed=.16;
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.36,.65,.6);composer.addPass(bloom);
 composer.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0}},vertexShader:'varying vec2 uvCoord;void main(){uvCoord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;uniform float time;varying vec2 uvCoord;void main(){vec4 c=texture2D(tDiffuse,uvCoord);float v=1.-.35*pow(length((uvCoord-.5)*1.3),1.7);gl_FragColor=vec4(c.rgb*v,c.a);}'}));
 composer.addPass(new OutputPass());
 new ResizeObserver(()=>{const {width:w,height:h}=container.getBoundingClientRect();renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.domElement.style.touchAction=w<650?'pan-y':'none';if(w<650&&!shared?.focused){camera.position.set(.4,.8,15);controls.target.set(0,.8,0)}}).observe(container);
 let last=performance.now(),userUntil=0;
 controls.addEventListener('start',()=>{userUntil=performance.now()+9000});
 const state={scene,camera,renderer,controls,composer,focused:false,shot:'whole',targetCamera:new THREE.Vector3(1.4,.5,10.8),targetLook:new THREE.Vector3(0,.2,0),
  focus(name){this.shot=name;this.focused=name!=='whole';const mobile=container.clientWidth<650;const shots={whole:[[mobile?.4:1.4,mobile?.8:.5,mobile?15:10.8],[0,mobile?.8:.2,0]],touch:[[1.1,-.05,4.7],[0,-.3,.6]],wiring:[[1.4,1.1,6.8],[0,.8,.1]],circuit:[[.8,2.25,4.5],[0,2.1,-.5]],absence:[[0,.5,11],[0,.2,0]]};const [p,t]=shots[name]??shots.whole;this.targetCamera.set(...p);this.targetLook.set(...t);userUntil=0},
  render(){const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(now>userUntil){const k=reduced?1:1-Math.exp(-dt*1.4);camera.position.lerp(this.targetCamera,k);controls.target.lerp(this.targetLook,k)}controls.autoRotate=!reduced&&this.shot==='whole'&&now>userUntil;controls.update(dt);composer.render()}};
 return state;
}
function tube(points,radius,material){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(V)),64,radius,8,false),material)}
function ellipsoid(p,scale,mat){const m=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),mat);m.position.set(...p);m.scale.set(...scale);return m}
async function sculpture(name,material){const response=await fetch('./sculpture/'+name+'.bin');if(!response.ok)throw Error('Sculpture unavailable');const raw=await response.arrayBuffer(),n=new DataView(raw).getUint32(0,true),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(raw,4,n*3),3));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(raw,4+n*12,n*3),3));return new THREE.Mesh(g,material)}

export class Specimen {
 constructor(container){
  this.view=shared=view(container);const s=shared.scene;
  s.add(new THREE.HemisphereLight(0x99b8bc,0x241511,1.1));
  for(const [color,intensity,position]of [[0xffcf9c,7,[-3,3,4]],[0x65ddd7,5,[3,0,-3]],[0xe89b92,2.5,[0,-4,2]]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...position);s.add(l)}
  this.root=new THREE.Group();this.root.position.set(0,-.8,.7);s.add(this.root);
  const tissue=new THREE.MeshPhysicalMaterial({color:0xa96952,roughness:.24,metalness:.08,clearcoat:.8,transparent:true,opacity:.58,side:THREE.DoubleSide,depthWrite:false});
  const bulbs=tissue.clone();bulbs.color.set(0x73555e);bulbs.opacity=.27;bulbs.roughness=.34;
  this.glansMaterial=tissue;
  this.meshes=[];
  this.assetReady=Promise.all([sculpture('corpora',tissue),sculpture('bulbs',bulbs)]).then(ms=>{for(const m of ms){this.root.add(m);this.meshes.push(m)}}).catch(e=>{console.error(e);document.getElementById('progress').textContent=e.message});
  // Fine branching internal fibres are original schematic routes, not scan data.
  const nerveMat=new THREE.MeshBasicMaterial({color:0xebbf84,transparent:true,opacity:.68,depthWrite:false});
  for(const side of [-1,1]){
   const main=[[side*1.28,-1.35,-.43],[side*.96,-.7,-.34],[side*.46,.08,-.12],[side*.12,.5,.015],[.06,.85,.07],[.15,.94,.3]];
   for(let j=0;j<5;j++){const offset=(j-2)*.015;this.root.add(tube(main.map(p=>[p[0]+offset,p[1],p[2]+.08]),.0045,nerveMat))}
   for(let j=0;j<24;j++){
    const t=j/23,angle=j*2.399,rad=Math.sqrt(t)*.17;
    const end=[.15+Math.cos(angle)*rad,.91+Math.sin(angle)*rad*1.12,.24+Math.sqrt(Math.max(0,1-t))*.20];
    this.root.add(tube([[side*.06,.6,.1],[side*.065,.76,.19],[end[0]*.7,end[1]-.05,end[2]-.03],end],.0025,nerveMat));
   }
   for(let j=0;j<12;j++){const y=-1.15+j*.075;this.root.add(tube([[side*.76,y,-.22],[side*.53,y+.1,.05],[side*(.40+.12*Math.sin(j)),y+.16,.19]],.002,nerveMat))}
  }
  const hood=new THREE.Mesh(new THREE.SphereGeometry(1,40,24,0,Math.PI*1.45,0,Math.PI*.6),bulbs.clone());hood.material.opacity=.19;hood.position.set(.12,1.01,.27);hood.scale.set(.23,.23,.18);hood.rotation.z=.7;this.root.add(hood);this.meshes.push(hood);
  this.finger=new THREE.Group();this.root.add(this.finger);
  const skin=new THREE.MeshPhysicalMaterial({color:0x8e7567,roughness:.62,clearcoat:.08,metalness:.02});
  // A sculpted distal finger: curved profile, taper and knuckle, rather than a rod.
  const curve=new THREE.CatmullRomCurve3([V([.16,0,0]),V([.55,.01,-.025]),V([1.15,.035,-.10]),V([1.7,.13,-.15]),V([4.8,.52,-.35])]);
  const g=new THREE.TubeGeometry(curve,80,1,40,false),pa=g.attributes.position,centres=curve.getSpacedPoints(80);
  for(let i=0;i<=80;i++){const t=i/80,r=.18+.04*t+.025*Math.exp(-(((t-.33)/.06)**2));for(let j=0;j<=40;j++){const k=i*41+j,p=V([pa.getX(k),pa.getY(k),pa.getZ(k)]);p.sub(centres[i]).multiplyScalar(r).add(centres[i]);pa.setXYZ(k,p.x,p.y,p.z)}}g.computeVertexNormals();
  this.finger.add(new THREE.Mesh(g,skin));this.finger.add(ellipsoid([.16,0,0],[.23,.183,.185],skin));
  const nail=ellipsoid([.28,.015,.163],[.205,.12,.025],new THREE.MeshPhysicalMaterial({color:0xd3b3a1,roughness:.32,clearcoat:.8}));nail.rotation.y=-.12;this.finger.add(nail);
  for(const x of [1.45,1.52]){const m=new THREE.Mesh(new THREE.TorusGeometry(.194,.003,6,40,Math.PI*1.4),new THREE.MeshBasicMaterial({color:0x735c50,transparent:true,opacity:.27}));m.rotation.y=Math.PI/2;m.position.set(x,.08,-.13);this.finger.add(m)}
  this.finger.rotation.y=-.2;this.finger.rotation.z=.09;
  this.field=makeField();this.contactCentre=REGION_CENTRES.glans.slice();this.region='glans';this.radius=.15;this.contact=0;this.goal=0;this.channels={};
  this.fieldColour=new Float32Array(this.field.length*3);this.fieldGeometry=new THREE.BufferGeometry();this.fieldGeometry.setAttribute('position',new THREE.Float32BufferAttribute(this.field.flatMap(p=>p.position),3));this.fieldGeometry.setAttribute('color',new THREE.BufferAttribute(this.fieldColour,3));
  this.fieldPoints=new THREE.Points(this.fieldGeometry,new THREE.PointsMaterial({size:.009,vertexColors:true,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}));this.root.add(this.fieldPoints);
  this.contactRing=new THREE.Mesh(new THREE.TorusGeometry(1,.012,8,80),new THREE.MeshBasicMaterial({color:0x8cf6e4,transparent:true,opacity:0,depthWrite:false}));this.root.add(this.contactRing);
  this.patch=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:0x8cf6e4,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));this.root.add(this.patch);
  this.raycaster=new THREE.Raycaster();this.placing=false;
  const place=e=>{if(!this.placing)return;const r=shared.renderer.domElement.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),shared.camera);const hit=this.raycaster.intersectObjects(this.meshes,false)[0];if(hit)this.contactCentre=this.root.worldToLocal(hit.point.clone()).toArray()};
  shared.renderer.domElement.addEventListener('pointerdown',e=>{if(this.placing){shared.renderer.domElement.setPointerCapture(e.pointerId);place(e)}});shared.renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons)place(e)});
 }
 setContact(value,region='glans',radius=.15){this.goal=value;this.radius=radius;if(region!==this.region){this.region=region;this.contactCentre=REGION_CENTRES[region].slice()}}
 placeMode(on){this.placing=on;shared.controls.enabled=!on}
 encode(pressure){const result=stimulateField(this.field,this.contactCentre,this.radius,pressure);this.fieldColour.fill(0);for(let i=0;i<this.field.length;i++){this.fieldColour[i*3]=.30;this.fieldColour[i*3+1]=.19;this.fieldColour[i*3+2]=.09}for(const [i,v]of result.activated){this.fieldColour[i*3]=.4+v*.6;this.fieldColour[i*3+1]=.6+v*.4;this.fieldColour[i*3+2]=.5+v*.5}this.fieldGeometry.attributes.color.needsUpdate=true;this.channels=result.channels;return result.channels}
 render(){const now=performance.now(),dt=Math.min(100,now-(this.lastRender??now));this.lastRender=now;this.contact+=(this.goal-this.contact)*(1-Math.exp(-dt/70));const p=this.contactCentre;this.finger.position.set(p[0]+.02+(1-this.contact)*.6,p[1]-.035,p[2]+.02);this.contactRing.position.set(...p);this.contactRing.scale.setScalar(this.radius);this.contactRing.material.opacity=this.contact*.6;this.patch.position.set(p[0],p[1],p[2]+.008);this.patch.scale.setScalar(this.radius);this.patch.material.opacity=this.contact*.07;this.glansMaterial.emissive.set(0x164239);this.glansMaterial.emissiveIntensity=this.contact*.13}
}

export class Connectome {
 constructor(container,specimen){this.view=shared;this.specimen=specimen;this.active=new Set();this.group=new THREE.Group();this.group.position.set(0,2.1,-.65);this.group.rotation.set(.88,-.18,0);this.group.scale.setScalar(1.24);shared.scene.add(this.group);this.routes=[];this.live=false;
  this.previewReady=Promise.all(['soma.bin','fibres.bin','binding.json'].map(async file=>{const r=await fetch('./sculpture/'+file);if(!r.ok)throw Error('Display data unavailable');return file.endsWith('json')?r.json():new Float32Array(await r.arrayBuffer())})).then(([p,e,g])=>{if(!this.live)this.initialize(p,g,e,false)}).catch(console.error);
 }
 initialize(positions,groups,drawPositions,live=true){
  this.live=live;if(this.points){this.group.remove(this.points);this.geometry.dispose();this.material.dispose()}if(this.lines){this.group.remove(this.lines);this.lines.geometry.dispose();this.lines.material.dispose()}
  this.positions=positions;this.groups=groups;this.activity=new Float32Array(positions.length/3);const kind=new Float32Array(this.activity.length);for(const g of groups.sensory)for(const i of g)kind[i]=1;for(const i of groups.reward)kind[i]=2;
  this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setAttribute('activity',new THREE.BufferAttribute(this.activity,1));this.geometry.setAttribute('kind',new THREE.BufferAttribute(kind,1));
  this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{pixelRatio:{value:Math.min(devicePixelRatio,1.5)},densityScale:{value:1}},vertexShader:`attribute float activity;attribute float kind;varying float energy;varying float cellKind;varying float depth;uniform float pixelRatio;void main(){vec4 p=modelViewMatrix*vec4(position,1.);energy=activity;cellKind=kind;depth=position.z;gl_PointSize=clamp((1.1+activity*8.)*pixelRatio*(7./-p.z),1.,20.);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying float energy;varying float cellKind;varying float depth;uniform float densityScale;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;vec3 c=mix(vec3(.95,.71,.45),vec3(.20,.63,.66),smoothstep(.35,1.7,depth));if(cellKind>.5)c=vec3(.24,.92,.84);if(cellKind>1.5)c=vec3(1.,.55,.13);c=mix(c,vec3(1.,.95,.75),energy*.5);float a=(.26*densityScale+energy*.72)*exp(-d*d*3.);gl_FragColor=vec4(c,a);}`});
  this.points=new THREE.Points(this.geometry,this.material);this.group.add(this.points);
  if(drawPositions){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(drawPositions,3));this.lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xb29873,transparent:true,opacity:.027,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.lines)}
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
   const source=this.specimen.root.localToWorld(V(REGION_CENTRES[['glans','hood','surrounding','glans'][region]]));
   const target=this.group.localToWorld(V(Array.from(this.positions.slice(index*3,index*3+3))));
   const curve=new THREE.CatmullRomCurve3([source,V([side*(.09+t*.045),-.08,.70]),V([side*(.12+t*.045),.45,.15]),V([side*(.28+t*.07),1.0,-.15]),target]);
   const g=new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
   const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:region===3?0xf2b267:region===1?0x95d4cd:region===2?0xab8e68:0x72d6c7,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending}));shared.scene.add(line);this.routes.push({curve,line,index,region,phase:j/32});
  }
  const n=this.routes.length*3;this.pulsePositions=new Float32Array(n*3);this.pulseColors=new Float32Array(n*3);const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(this.pulsePositions,3));pg.setAttribute('color',new THREE.BufferAttribute(this.pulseColors,3));this.pulses=new THREE.Points(pg,new THREE.PointsMaterial({size:.034,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));shared.scene.add(this.pulses);
 }
 toggleFocus(){const on=shared.shot!=='circuit';this.focus(on?'circuit':'whole');return on}
 focus(shot){shared.focus(shot);if(shot==='circuit'&&this.focusTarget){shared.targetLook.copy(this.focusTarget);shared.targetCamera.copy(this.focusTarget).add(new THREE.Vector3(.65,.15,3.3))}}
 spikes(indices,counts){if(!this.activity)return;for(let k=0;k<indices.length;k++){this.activity[indices[k]]=Math.min(1,.35+counts[k]*.35);this.active.add(indices[k])}}
 clear(){this.activity?.fill(0);this.active.clear()}
 render(){if(this.material)this.material.uniforms.densityScale.value=Math.min(1,Math.pow(shared.renderer.domElement.clientWidth/1300,1.2));const time=performance.now()/1000,dt=Math.min(.05,time-(this.last??time));this.last=time;if(this.activity){const decay=Math.exp(-dt*7);for(const i of this.active){this.activity[i]*=decay;if(this.activity[i]<.015){this.activity[i]=0;this.active.delete(i)}}this.geometry.attributes.activity.needsUpdate=true}
  if(this.circuitLines){for(let e=0;e<this.circuit.pre.length;e++){const a=this.activity[this.circuit.pre[e]]??0,b=this.activity[this.circuit.post[e]]??0,energy=Math.max(a,b);const level=.002+energy*.20;this.circuitColors.set([level*.7,level*.9,level*.68,level*.7,level*.9,level*.68],e*6)}this.circuitLines.geometry.attributes.color.needsUpdate=true}
  const channels=this.specimen.channels;
  for(let i=0;i<this.routes.length;i++){const r=this.routes[i],level=r.region===3?(this.rewardDelivered??0):(channels[['glans','hood','surrounding'][r.region]]??0);r.line.material.opacity=.055+level*.28+(this.activity[r.index]??0)*.3;
   for(let k=0;k<3;k++){const p=r.curve.getPoint((time*.8+r.phase+k/3)%1),at=(i*3+k)*3;this.pulsePositions.set([p.x,p.y,p.z],at);const strength=this.live?Math.sqrt(Math.min(1,level*2)):0;this.pulseColors.set(r.region===3?[strength,.58*strength,.19*strength]:[.38*strength,.95*strength,.80*strength],at)}
  }
  if(this.pulses){this.pulses.geometry.attributes.position.needsUpdate=true;this.pulses.geometry.attributes.color.needsUpdate=true}shared.render();
 }
}
