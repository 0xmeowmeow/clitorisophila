// Original implicit sculpture. Educational proportions inform the silhouette;
// no reference mesh or human scan is copied into this asset.
import {MarchingCubes} from '../web/node_modules/three/examples/jsm/objects/MarchingCubes.js';
import {MeshBasicMaterial,Vector3,CatmullRomCurve3} from '../web/node_modules/three/build/three.module.js';
import fs from 'node:fs';
const res=100,volume=new MarchingCubes(res,new MeshBasicMaterial(),false,false,300000);
volume.isolation=1;
const lobes=[];
function sweep(points,radii){const c=new CatmullRomCurve3(points.map(p=>new Vector3(...p)));for(let i=0;i<=40;i++){const t=i/40,p=c.getPoint(t),f=t*(radii.length-1),a=Math.min(radii.length-2,Math.floor(f)),r=radii[a]+(radii[a+1]-radii[a])*(f-a);lobes.push([p.x,p.y,p.z,r,r,r]);}}
// Paired, tapering crura merging into a curved body and anterior glans.
for(const side of [-1,1])sweep([[side*1.32,-1.42,-.46],[side*1.10,-.95,-.42],[side*.70,-.32,-.28],[side*.32,.22,-.17],[0,.42,-.15]],[.055,.10,.16,.21,.20]);
sweep([[0,.32,-.16],[0,.65,-.18],[.035,.99,-.05],[.12,1.04,.13],[.15,.91,.24]],[.21,.19,.15,.12,.15]);
// Vestibular bulbs are deliberately separate from the clitoral corpora.
const bulbs=[[-.43,-.65,.01,.235,.65,.245],[.43,-.65,.01,.235,.65,.245]];
function make(shapes,name){
 const bounds=2.0;
 for(let z=0;z<res;z++)for(let y=0;y<res;y++)for(let x=0;x<res;x++){
  const px=(x/res*2-1)*bounds,py=(y/res*2-1)*bounds,pz=(z/res*2-1)*bounds;
  // Smooth union by maximum of Gaussian fields, plus a soft transition.
  let top=0,sum=0;
  for(const [cx,cy,cz,rx,ry,rz]of shapes){const d=((px-cx)/rx)**2+((py-cy)/ry)**2+((pz-cz)/rz)**2;if(d<5){const q=Math.exp(-d*1.45);top=Math.max(top,q);sum+=q**8;}}
  volume.field[z*res*res+y*res+x]=Math.pow(sum,1/8)*Math.exp(1.45);
 }
 volume.update();const n=volume.count;
 const p=volume.geometry.attributes.position.array.slice(0,n*3);for(let i=0;i<p.length;i++)p[i]*=bounds;
 const normal=volume.geometry.attributes.normal.array.slice(0,n*3);
 const out=Buffer.alloc(4+p.byteLength+normal.byteLength);out.writeUInt32LE(n);Buffer.from(p.buffer).copy(out,4);Buffer.from(normal.buffer).copy(out,4+p.byteLength);
 fs.writeFileSync(new URL('../web/public/sculpture/'+name+'.bin',import.meta.url),out);console.log(name,n,out.length);
}
make(lobes,'corpora');make(bulbs,'bulbs');
