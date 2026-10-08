import * as THREE from 'three';

// Hearts are an artistic readout of computed PAM11 spikes. They never supply
// current, reward or a preference variable to the model.
export class RewardHearts {
 constructor(scene,camera){
  this.scene=scene;this.camera=camera;this.particles=[];this.credit=0;this.serial=0;this.lastReward=-100;
  const shape=new THREE.Shape();shape.moveTo(0,-.42);shape.bezierCurveTo(-.10,-.28,-.53,.00,-.48,.27);shape.bezierCurveTo(-.44,.57,-.10,.59,0,.32);shape.bezierCurveTo(.10,.59,.44,.57,.48,.27);shape.bezierCurveTo(.53,.00,.10,-.28,0,-.42);
  this.geometry=new THREE.ShapeGeometry(shape,20);
 }
 receive(count,origins){
  if(count<=0||!origins.length)return;
  const now=performance.now()/1000;this.credit+=count/65;
  if(now-this.lastReward>.4&&this.credit<1)this.credit=1;
  this.lastReward=now;
  while(this.credit>=1){this.credit--;if(this.particles.length>=40)continue;
   const n=this.serial++,seed=(n*.61803398875)%1,origin=origins[n%origins.length].clone();
   origin.x+=(seed-.5)*.10;origin.z+=.14;
   const material=new THREE.MeshBasicMaterial({color:n%3===0?0xf0bbab:0xef8eae,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(this.geometry,material);mesh.position.copy(origin);this.scene.add(mesh);
   this.particles.push({mesh,origin,born:now,life:2.4+seed*.6,size:.13+seed*.065,sway:(seed-.5)*.7,spin:(seed-.5)*.65});
  }
 }
 clear(){for(const p of this.particles){this.scene.remove(p.mesh);p.mesh.material.dispose()}this.particles=[];this.credit=0;this.lastReward=-100}
 render(now){for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i],age=now-p.born,t=age/p.life;if(t>=1){this.scene.remove(p.mesh);p.mesh.material.dispose();this.particles.splice(i,1);continue}p.mesh.position.copy(p.origin);p.mesh.position.x+=p.sway*age*.30+Math.sin(age*2+p.born)*.025;p.mesh.position.y+=age*.35;p.mesh.quaternion.copy(this.camera.quaternion);p.mesh.rotateZ(p.spin);p.mesh.scale.setScalar(p.size*Math.min(1,age/.12)*(1+t*.18));p.mesh.material.opacity=Math.min(1,age/.12)*Math.pow(1-t,1.2)*.88}}
}
