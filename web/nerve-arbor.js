import * as THREE from 'three';

// An authored branching field. Its leaves are exactly the input samples in
// surface.js; this is visual connectivity, not measured human nerve anatomy.
export const JUNCTION=[0,.43,.04];
const roots={glans:[.02,.70,.15],hood:[0,.77,.04],left:[-.45,-.05,-.06],right:[.45,-.05,-.06],body:[0,.57,-.06]};
export class NerveArbor extends THREE.Group {
 constructor(field){
  super();this.field=field;this.leafEnergy=new Float32Array(field.length);this.target=new Float32Array(field.length);this.edges=[];
  const root=new THREE.Vector3(...JUNCTION),groups=new Map();
  field.forEach((p,i)=>{const key=p.region==='surrounding'?(p.branch==='body'?'body':p.position[0]<0?'left':'right'):p.region;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i)});
  let group=0;
  const positions=[],distances=[],hints=[];
  const edge=(a,b,ids,d,group)=>{
   const delta=b.clone().sub(a),mid=a.clone().lerp(b,.55);mid.z+=Math.min(.035,delta.length()*.08);
   const curve=new THREE.QuadraticBezierCurve3(a,mid,b),length=curve.getLength(),offset=positions.length/3;
   const steps=ids.length===1?3:8;
   for(let j=0;j<steps;j++)for(const t of [j/steps,(j+1)/steps]){const p=curve.getPoint(t);positions.push(p.x,p.y,p.z);distances.push(d+length*t);hints.push(group)}
   this.edges.push({ids,offset,count:steps*2});return d+length;
  };
  const branch=(ids,parent,d,group,depth=0)=>{
   const centre=new THREE.Vector3();for(const i of ids)centre.add(new THREE.Vector3(...field[i].position));centre.divideScalar(ids.length);
   if(ids.length===1){edge(parent,centre,ids,d,group);return}
   // Centroids move gradually outwards, giving a continuous tree rather than
   // spokes from each point to one hub.
   const node=parent.clone().lerp(centre,depth===0?.58:.76),next=edge(parent,node,ids,d,group);
   let axis=0,spread=-1;
   for(let k=0;k<3;k++){const values=ids.map(i=>field[i].position[k]),range=Math.max(...values)-Math.min(...values);if(range>spread){spread=range;axis=k}}
   const sorted=ids.slice().sort((a,b)=>field[a].position[axis]-field[b].position[axis]),mid=Math.ceil(sorted.length/2);
   branch(sorted.slice(0,mid),node,next,group,depth+1);branch(sorted.slice(mid),node,next,group,depth+1);
  };
  for(const [name,ids]of groups){const p=new THREE.Vector3(...roots[name]);const d=edge(root,p,ids,0,group);branch(ids,p,d,group);group++}
  const geometry=new THREE.BufferGeometry();this.signals=new Float32Array(positions.length/3);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('distanceAlong',new THREE.Float32BufferAttribute(distances,1));geometry.setAttribute('hintGroup',new THREE.Float32BufferAttribute(hints,1));geometry.setAttribute('signal',new THREE.BufferAttribute(this.signals,1));
  this.uniforms={time:{value:0},idle:{value:1},hint:{value:0}};
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:this.uniforms,
   vertexShader:`attribute float distanceAlong;attribute float signal;attribute float hintGroup;varying float d;varying float energy;varying float group;void main(){d=distanceAlong;energy=signal;group=hintGroup;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`uniform float time;uniform float idle;uniform float hint;varying float d;varying float energy;varying float group;void main(){float wave=pow(max(0.,sin(d*15.+time*45.)),16.);float invite=idle*(1.-step(.2,abs(group-hint)))*pow(max(0.,sin(d*5.+time*2.)),8.);float bright=energy*(.3+wave*1.5)+invite*.6;vec3 c=mix(vec3(.67,.63,.46),vec3(.45,1.,.88),min(1.,bright));gl_FragColor=vec4(c,.44+bright*.52);}`});
  this.lines=new THREE.LineSegments(geometry,material);this.add(this.lines);this.groupCount=group;
 }
 activate(activated){this.target.fill(0);for(const [i,value]of activated)this.target[i]=value}
 render(now,dt,idle){
  const fade=Math.exp(-dt*3.5);
  for(let i=0;i<this.leafEnergy.length;i++)this.leafEnergy[i]=Math.max(this.target[i],this.leafEnergy[i]*fade);
  for(const e of this.edges){let level=0;for(const i of e.ids)level=Math.max(level,this.leafEnergy[i]);this.signals.fill(level,e.offset,e.offset+e.count)}
  this.lines.geometry.attributes.signal.needsUpdate=true;
  this.uniforms.time.value=now;const phase=now%5.5;
  this.uniforms.idle.value=idle&&phase<1.5?Math.sin(phase/1.5*Math.PI):0;
  this.uniforms.hint.value=Math.floor(now/5.5)%this.groupCount;
 }
}
