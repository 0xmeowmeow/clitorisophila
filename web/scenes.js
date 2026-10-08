import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {makeField,REGION_CENTRES,stimulateField} from './surface.js';

const vector=(p)=>new THREE.Vector3(...p);
function view(container,position,target){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);
  camera.position.set(...position);camera.lookAt(...target);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x061019,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  container.append(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(...target);controls.enableDamping=true;controls.enablePan=false;
  const observer=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()});observer.observe(container);
  return {scene,camera,renderer,controls,render(){controls.update();renderer.render(scene,camera)}};
}

function tube(points,radius,material){
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(vector)),60,radius,14,false),material);
}
function ellipsoid(position,scale,material){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),material);mesh.position.set(...position);mesh.scale.set(...scale);return mesh;
}

export class Specimen {
  constructor(container){
    this.view=view(container,[3.0,1.2,6.8],[0,-.15,0]);
    const s=this.view.scene;
    s.add(new THREE.HemisphereLight(0xc5e5ff,0x27132b,2.5));
    const light=new THREE.DirectionalLight(0xffc8d3,3.4);light.position.set(-3,5,5);s.add(light);
    const rim=new THREE.DirectionalLight(0x6bdde1,2);rim.position.set(2,-1,-4);s.add(rim);
    this.root=new THREE.Group();s.add(this.root);
    const tissue=new THREE.MeshPhysicalMaterial({color:0x9c4f68,roughness:.38,metalness:.03,transparent:true,opacity:.67,side:THREE.DoubleSide,depthWrite:false});
    const bulb=new THREE.MeshPhysicalMaterial({color:0xa15c79,roughness:.5,transparent:true,opacity:.32,depthWrite:false});
    const glans=new THREE.MeshPhysicalMaterial({color:0xd893aa,roughness:.34,clearcoat:.32,emissive:0x532032,emissiveIntensity:.15});
    this.glansMaterial=glans;
    // Original schematic geometry, not a segmented medical specimen.
    this.root.add(tube([[0,.37,-.06],[-.48,.05,-.25],[-.88,-.73,-.42],[-1.05,-1.50,-.48]],.18,tissue));
    this.root.add(tube([[0,.37,-.06],[.48,.05,-.25],[.88,-.73,-.42],[1.05,-1.50,-.48]],.18,tissue));
    for(const side of [-1,1])this.root.add(ellipsoid([side*1.05,-1.50,-.48],[.18,.22,.18],tissue));
    const lb=ellipsoid([-.46,-.72,.04],[.27,.66,.25],bulb);lb.rotation.z=-.16;this.root.add(lb);
    const rb=ellipsoid([.46,-.72,.04],[.27,.66,.25],bulb);rb.rotation.z=.16;this.root.add(rb);
    this.root.add(tube([[0,.30,-.06],[0,.72,-.16],[.07,.99,-.02],[.14,1.01,.13]],.16,tissue));
    this.root.add(ellipsoid([.15,.91,.24],[.18,.22,.20],glans));
    const hood=new THREE.Mesh(new THREE.SphereGeometry(.24,36,20,0,Math.PI*1.4,0,Math.PI*.65),tissue.clone());
    hood.material.opacity=.22;hood.position.set(.12,1.02,.22);hood.rotation.z=.8;this.root.add(hood);
    const nerve=new THREE.MeshBasicMaterial({color:0xf2be64,transparent:true,opacity:.85});
    for(const side of [-1,1]){
      this.root.add(tube([[side*1.05,-1.5,-.28],[side*.86,-.68,-.22],[side*.43,.09,.04],[side*.12,.43,.12],[side*.06,.72,.10],[.14,.92,.41]],.012,nerve));
      for(const off of [-.08,.03,.12])this.root.add(tube([[side*.07,.72,.11],[.14+off,.81,.38],[.14+off,.98,.39]],.007,nerve));
    }
    this.finger=new THREE.Group();s.add(this.finger);
    const skin=new THREE.MeshPhysicalMaterial({color:0xcba78f,roughness:.45,clearcoat:.12});
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.21,.24,3.60,36),skin);shaft.rotation.z=Math.PI/2;shaft.position.x=1.885;this.finger.add(shaft);
    this.finger.add(ellipsoid([.1,0,0],[.28,.22,.23],skin));
    const nail=ellipsoid([.13,.185,.075],[.20,.035,.14],new THREE.MeshPhysicalMaterial({color:0xdfbeb4,roughness:.26,clearcoat:.6}));this.finger.add(nail);
    const crease=new THREE.MeshBasicMaterial({color:0x977e70,transparent:true,opacity:.45});
    for(const x of [.71,.78]){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.217,.007,6,40),crease);ring.rotation.y=Math.PI/2;ring.position.x=x;this.finger.add(ring);
    }
    this.contactRing=new THREE.Mesh(new THREE.TorusGeometry(.26,.006,8,64),new THREE.MeshBasicMaterial({color:0x68ece4,transparent:true,opacity:.6}));
    this.contactRing.position.set(.15,.91,.48);this.root.add(this.contactRing);
    this.region='glans';this.contact=0;this.goal=0;
    this.finger.position.set(.9,1.08,.8);this.finger.rotation.z=.12;
    this.field=makeField();this.contactCentre=REGION_CENTRES.glans.slice();this.radius=.15;
    const positions=new Float32Array(this.field.flatMap(p=>p.position));
    this.fieldColour=new Float32Array(this.field.length*3);
    this.fieldGeometry=new THREE.BufferGeometry();this.fieldGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.fieldGeometry.setAttribute('color',new THREE.BufferAttribute(this.fieldColour,3));
    this.fieldPoints=new THREE.Points(this.fieldGeometry,new THREE.PointsMaterial({size:.014,vertexColors:true,transparent:true,opacity:.85,depthWrite:false}));
    this.root.add(this.fieldPoints);
    this.patch=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:0x5de6dc,transparent:true,opacity:.08,depthWrite:false,side:THREE.DoubleSide}));this.root.add(this.patch);
    this.contactRing.geometry.dispose();this.contactRing.geometry=new THREE.TorusGeometry(1,.025,8,64);
    this.raycaster=new THREE.Raycaster();this.placing=false;
    const place=(event)=>{
      if(!this.placing)return;
      const rect=this.view.renderer.domElement.getBoundingClientRect();
      this.raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),this.view.camera);
      const meshes=[];this.root.traverse(o=>{if(o.isMesh&&o!==this.patch&&o!==this.contactRing)meshes.push(o)});
      const hit=this.raycaster.intersectObjects(meshes,false)[0];
      if(hit)this.contactCentre=this.root.worldToLocal(hit.point.clone()).toArray();
    };
    this.view.renderer.domElement.addEventListener('pointerdown',e=>{if(this.placing){this.view.renderer.domElement.setPointerCapture(e.pointerId);place(e)}});
    this.view.renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons)place(e)});
  }
  setContact(value,region='glans',radius=.15){
    this.goal=value;this.radius=radius;
    if(region!==this.region){this.region=region;this.contactCentre=REGION_CENTRES[region].slice()}
  }
  placeMode(on){this.placing=on;this.view.controls.enabled=!on}
  encode(pressure){
    const result=stimulateField(this.field,this.contactCentre,this.radius,pressure);
    this.fieldColour.fill(0);
    for(let i=0;i<this.field.length;i++){this.fieldColour[i*3]=.45;this.fieldColour[i*3+1]=.26;this.fieldColour[i*3+2]=.10}
    for(const [i,value]of result.activated){this.fieldColour[i*3]=.25+value*.5;this.fieldColour[i*3+1]=.5+value*.5;this.fieldColour[i*3+2]=.45+value*.5}
    this.fieldGeometry.attributes.color.needsUpdate=true;
    return result.channels;
  }
  render(){
    const t=performance.now(),dt=Math.min(100,t-(this.lastRender??t));this.lastRender=t;
    this.contact+=(this.goal-this.contact)*(1-Math.exp(-dt/55));
    const target=this.contactCentre;
    this.finger.position.set(target[0]+.2+(1-this.contact)*.63,target[1]+.04,target[2]+.1);
    this.contactRing.position.set(...target);this.contactRing.material.opacity=this.contact*.8;
    this.contactRing.scale.setScalar(this.radius);this.patch.position.set(target[0],target[1],target[2]+.004);this.patch.scale.setScalar(this.radius);this.patch.material.opacity=this.contact*.12;
    this.glansMaterial.emissiveIntensity=.12+this.contact*.55;
    this.view.render();
  }
}

export class Connectome {
  constructor(container){
    this.view=view(container,[.25,.1,5.8],[0,0,0]);
    this.geometry=new THREE.BufferGeometry();this.points=null;this.activity=null;this.kind=null;this.active=new Set();
    this.uniforms={scale:{value:Math.min(devicePixelRatio,2)},size:{value:1.45}};
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:this.uniforms,
      vertexShader:`attribute float activity;attribute float kind;varying float energy;varying float cellKind;uniform float scale;uniform float size;void main(){vec4 p=modelViewMatrix*vec4(position,1.);energy=activity;cellKind=kind;gl_PointSize=clamp((size+activity*9.)*scale*(7./-p.z),1.,23.);gl_Position=projectionMatrix*p;}`,
      fragmentShader:`varying float energy;varying float cellKind;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;vec3 c=cellKind>1.5?vec3(1.,.68,.24):cellKind>.5?vec3(.26,.96,.88):vec3(.38,.58,.72);c=mix(c,vec3(.8,1.,1.),energy*.3);float alpha=(.32+min(energy,1.)*.65)*exp(-d*d*3.);gl_FragColor=vec4(c,alpha);}`});
  }
  initialize(positions,groups,drawPositions){
    this.activity=new Float32Array(positions.length/3);this.kind=new Float32Array(this.activity.length);
    for(const g of groups.sensory)for(const i of g)this.kind[i]=1;
    for(const i of groups.reward)this.kind[i]=2;
    this.positions=positions;this.groups=groups;
    this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.geometry.setAttribute('activity',new THREE.BufferAttribute(this.activity,1));
    this.geometry.setAttribute('kind',new THREE.BufferAttribute(this.kind,1));
    this.points=new THREE.Points(this.geometry,this.material);this.points.rotation.y=-.17;this.view.scene.add(this.points);
    if(drawPositions){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(drawPositions,3));
      const lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x5c8da0,transparent:true,opacity:.04,depthWrite:false,blending:THREE.AdditiveBlending}));
      lines.rotation.y=this.points.rotation.y;this.view.scene.add(lines);
    }
    // Thin outline of the full observed/estimated soma cloud, never activity.
    const bounds=new THREE.Box3().setFromBufferAttribute(this.geometry.attributes.position);
    const center=bounds.getCenter(new THREE.Vector3());this.view.controls.target.copy(center);this.view.camera.lookAt(center);
    this.wholeTarget=center.clone();this.wholeCamera=this.view.camera.position.clone();
    this.focused=false;
    this.focusTarget=new THREE.Vector3();
    const chosen=[...groups.sensory.flat(),...groups.reward];
    for(const i of chosen)this.focusTarget.add(new THREE.Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]));
    this.focusTarget.divideScalar(chosen.length);
  }
  toggleFocus(){
    if(!this.points)return false;
    this.focused=!this.focused;
    this.view.controls.target.copy(this.focused?this.focusTarget:this.wholeTarget);
    this.view.camera.position.copy(this.focused?this.focusTarget.clone().add(new THREE.Vector3(0,.05,1.6)):this.wholeCamera);
    return this.focused;
  }
  spikes(indices,counts){
    if(!this.activity)return;
    for(let k=0;k<indices.length;k++){this.activity[indices[k]]=Math.min(1,.35+counts[k]*.35);this.active.add(indices[k])}
  }
  clear(){if(this.activity)this.activity.fill(0);this.active.clear()}
  render(){
    if(this.activity){for(const i of this.active){this.activity[i]*=.93;if(this.activity[i]<.015){this.activity[i]=0;this.active.delete(i)}}this.geometry.attributes.activity.needsUpdate=true}
    this.view.render();
  }
}
