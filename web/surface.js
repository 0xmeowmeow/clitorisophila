// Original artistic field. These are NOT measured human nerve-ending densities.
export const DENSITY_ASSUMPTIONS={glans:1,hood:.6,surrounding:.25};
export const REGION_CENTRES={glans:[.15,.91,.44],hood:[.12,1.15,.36],surrounding:[.60,-.35,.38]};
export function makeField(){
  let seed=7301;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const regions=[['glans',[.15,.91,.24],[.18,.22,.20],320],['hood',[.12,1.08,.18],[.25,.18,.18],200],['surrounding',[.60,-.35,.20],[.28,.40,.18],180],['surrounding',[-.60,-.35,.20],[.28,.40,.18],180]];
  const field=[];
  for(const [region,centre,scale,count]of regions)for(let i=0;i<count;i++){
    const z=rand(),phi=rand()*Math.PI*2,r=Math.sqrt(1-z*z);
    field.push({region,position:[centre[0]+scale[0]*r*Math.cos(phi),centre[1]+scale[1]*r*Math.sin(phi),centre[2]+scale[2]*z],weight:DENSITY_ASSUMPTIONS[region]});
  }
  // Sparse receptive samples follow the internal branches too, so every
  // visible part of the authored nerve tree can be touched.
  for(const side of [-1,1])for(let i=0;i<160;i++){
    const t=rand(),points=[[0,.42,-.15],[side*.32,.22,-.17],[side*.70,-.32,-.28],[side*1.10,-.95,-.42],[side*1.32,-1.42,-.46]],f=t*4,k=Math.min(3,Math.floor(f)),u=f-k,r=.15*(1-t)+.035,angle=rand()*Math.PI*2;
    const p=points[k].map((v,j)=>v+(points[k+1][j]-v)*u);
    p[0]+=Math.cos(angle)*r*.65;p[1]+=Math.sin(angle)*r*.4;p[2]+=Math.abs(Math.sin(angle))*r;
    field.push({region:'surrounding',position:p,weight:.25});
  }
  for(const side of [-1,1])for(let i=0;i<80;i++){
    const z=rand(),phi=rand()*Math.PI*2,r=Math.sqrt(1-z*z);
    field.push({region:'surrounding',position:[side*.43+.22*r*Math.cos(phi),-.65+.62*r*Math.sin(phi),.01+.245*z],weight:.25});
  }
  for(let i=0;i<70;i++){
    const t=rand(),a=rand()*Math.PI*2;
    field.push({region:'surrounding',branch:'body',position:[.12*Math.cos(a),.42+t*.5,-.10+.16*Math.abs(Math.sin(a))],weight:.25});
  }
  return field;
}
export function stimulateField(field,centre,radius,pressure){
  if(!Array.isArray(centre)||centre.length!==3||!centre.every(Number.isFinite)||!Number.isFinite(radius)||radius<=0||!Number.isFinite(pressure)||pressure<0||pressure>1)throw new Error('Invalid contact patch');
  const channels={glans:0,hood:0,surrounding:0};
  const activated=[];
  field.forEach((p,i)=>{
    const d=Math.hypot(...p.position.map((v,k)=>v-centre[k]));
    if(d<radius){
      const influence=1-d/radius;
      channels[p.region]+=pressure*p.weight*influence/24;
      activated.push([i,pressure*influence]);
    }
  });
  // Compress the authored field range so sparse branches remain touchable.
  // This display/input gain is a design choice, not a sensitivity measurement.
  for(const key of Object.keys(channels))channels[key]=Math.sqrt(Math.min(1,channels[key]));
  return {channels,activated};
}
