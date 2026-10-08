// Full retained graph + unchanged native kernel + explicit JS port of rule.py.
// Rendering never supplies spike counts or changes synapses.
import engineFactory from './engine.mjs';

const types={'<i8':BigInt64Array,'<i4':Int32Array,'<f4':Float32Array,'<f8':Float64Array,'|u1':Uint8Array,'|i1':Int8Array};

export async function loadModel(base='./model/', progress=()=>{}) {
  const response=await fetch(base+'manifest.json');
  if(!response.ok) throw new Error('Model manifest unavailable');
  const manifest=await response.json();
  if(manifest.schema!=='clitorisophila.browser-model.v1'||manifest.neurons!==166700||manifest.connections!==25582938) throw new Error('Unexpected model release');
  progress('Downloading full connectome',0);
  const payload=await fetch(base+'connectome.bin.gz');
  if(!payload.ok) throw new Error('Connectome download failed');
  let received=0;
  const tracked=payload.body.pipeThrough(new TransformStream({transform(chunk,controller){received+=chunk.length;progress('Downloading full connectome',received/manifest.compressed_bytes);controller.enqueue(chunk)}}));
  const raw=await new Response(tracked.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  progress('Verifying graph',1);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==manifest.payload_sha256||raw.byteLength!==manifest.uncompressed_bytes) throw new Error('Connectome checksum mismatch');
  const arrays={};
  for(const [key,spec] of Object.entries(manifest.arrays)) {
    const Type=types[spec.dtype];
    if(!Type)throw new Error('Unsupported model array type');
    arrays[key]=new Type(raw,spec.offset,spec.bytes/Type.BYTES_PER_ELEMENT);
  }
  const engine=await engineFactory();
  progress('Starting native simulation',1);
  return new Brain(engine,manifest,arrays);
}

export class Brain {
  constructor(engine,manifest,arrays) {
    this.engine=engine;this.manifest=manifest;this.n=manifest.neurons;this.p=manifest.plastic_edges;
    this.source=arrays;this.a={};this.address={};
    const alloc=(name,Type,n,source=null,fill=null)=>{
      const ptr=engine._malloc(n*Type.BYTES_PER_ELEMENT);
      if(!ptr)throw new Error('Not enough memory for full connectome');
      this.address[name]=ptr;
      const view=new Type(engine.HEAPU8.buffer,ptr,n);
      if(source)view.set(source);else view.fill(fill??(Type===BigInt64Array?0n:0));
      this.a[name]=view;return view;
    };
    for(const key of ['ptr','post','weight','edges','pre','gain','kc_mask','dan_index','modulation_mask'])alloc(key,arrays[key].constructor,arrays[key].length,arrays[key]);
    for(const key of ['v','g','drive','previous_drive','modulation','rest','adaptation'])alloc(key,Float32Array,this.n,null,['v','rest'].includes(key)?-52:0);
    alloc('refractory',Int16Array,this.n);alloc('queue',Int32Array,this.n*19);alloc('queue_count',Int32Array,19);alloc('clock',BigInt64Array,1);
    for(const key of ['counts','active'])alloc(key,Int32Array,this.n);
    alloc('active_flag',Uint8Array,this.n);alloc('nactive',Int32Array,1);
    for(const key of ['last','eligibility_last','modulation_last'])alloc(key,BigInt64Array,this.n,null,key==='last'?-1n:0n);
    alloc('eligibility',Float64Array,this.n);
    const baseline=alloc('baseline_plastic',Float32Array,this.p);
    for(let e=0;e<this.p;e++)baseline[e]=this.a.weight[Number(arrays.edges[e])];
    for(const i of arrays.kc)this.a.rest[i]=this.a.v[i]=-60;
    this.rateKC=new Float64Array(this.p);this.rateDAN=new Float64Array(arrays.dan.length);
    this.u=new Float64Array(this.p);this.w=new Float64Array(this.p);
    const lookup=new Map(Array.from(arrays.ids,(v,i)=>[v.toString(),i]));
    this.channels=manifest.mapping.channels.map(c=>({...c,indices:c.source_ids.map(i=>lookup.get(i))}));
    this.reward=manifest.mapping.reward_ids.map(i=>lookup.get(i));
    this.adaptation=this.channels.map(()=>0);this.rewardQueue=[0,0,0,0,0];this.tick=0;
    this.learning=true;this.rewardEnabled=true;
    this.lastCounts=new Int32Array(this.n);
    // Capture a baseline for exact reset without rebuilding the graph.
    this.reset();
  }

  reset() {
    for(const key of ['g','drive','previous_drive','modulation','adaptation','refractory','queue','queue_count','clock','counts','active','active_flag','nactive','eligibility','eligibility_last','modulation_last'])this.a[key].fill(typeof this.a[key][0]==='bigint'?0n:0);
    this.a.last.fill(-1n);this.a.v.set(this.a.rest);
    for(let e=0;e<this.p;e++)this.a.weight[Number(this.source.edges[e])]=this.a.baseline_plastic[e];
    for(const x of [this.rateKC,this.rateDAN,this.u,this.w,this.lastCounts])x.fill(0);
    this.adaptation.fill(0);this.rewardQueue=[0,0,0,0,0];this.tick=0;
  }

  nativeStep(ms) {
    const p=this.address,E=this.engine;
    this.a.counts.fill(0);
    E._memory_advance(this.n,p.ptr,p.post,p.weight,p.v,p.g,p.refractory,p.drive,p.previous_drive,p.queue,p.queue_count,p.clock,
      Math.round(ms/.1),.1,p.counts,p.active,p.active_flag,p.nactive,p.last,p.kc_mask,p.dan_index,p.eligibility,p.eligibility_last,
      this.p,p.edges,p.pre,p.baseline_plastic,p.gain,.001,1000,.1,0,p.modulation,p.modulation_last,p.modulation_mask,p.rest,p.adaptation,8,200);
  }

  rule(ms) {
    // Same closed forms, midpoint traces, bounds and gain matrix as rule.py.
    const h=ms/1000,ak=Math.exp(-h),half=Math.sqrt(ak),eu=Math.exp(-h/1800),ew=Math.exp(-h/.05);
    const c=1800/(1800-.05)*(eu-ew),du=1800*(-Math.expm1(-h/1800)),dw=1800*(-Math.expm1(-h/.05)-c);
    const danHz=new Float64Array(this.source.dan.length),dmid=new Float64Array(danHz.length);
    for(let d=0;d<danHz.length;d++){danHz[d]=this.a.counts[this.source.dan[d]]/h;dmid[d]=this.rateDAN[d]*half+danHz[d]*(1-half);this.rateDAN[d]=this.rateDAN[d]*ak+danHz[d]*(1-ak)}
    for(let e=0;e<this.p;e++){
      const kh=this.a.counts[this.source.pre[e]]/h,km=this.rateKC[e]*half+kh*(1-half);
      this.rateKC[e]=this.rateKC[e]*ak+kh*(1-ak);
      if(!this.learning)continue;
      let gm=0,gh=0;
      for(let d=0;d<danHz.length;d++){const g=this.a.gain[d*this.p+e];gm+=g*dmid[d];gh+=g*danHz[d]}
      const drive=.001*(kh*gm-gh*km),old=this.u[e];
      this.u[e]=Math.max(-.9,Math.min(1,old*eu+drive*du));
      this.w[e]=Math.max(-.9,Math.min(1,this.w[e]*ew+old*c+drive*dw));
      this.a.weight[Number(this.source.edges[e])]=this.a.baseline_plastic[e]*(1+this.w[e]);
    }
  }

  step(input={}) {
    for(const [name,value]of Object.entries(input))if(!this.channels.some(c=>c.name===name)||!Number.isFinite(value)||value<0||value>1)throw new Error('Invalid stimulation frame');
    const start=performance.now(),decay=Math.exp(-20/300),response={};let reward=0;
    this.a.drive.fill(0);
    this.channels.forEach((c,k)=>{
      const raw=input[c.name]??0,r=raw*(1-.5*this.adaptation[k]);response[c.name]=r;
      this.adaptation[k]=decay*this.adaptation[k]+(1-decay)*raw;
      for(const i of c.indices)this.a.drive[i]+=r*30;
      reward+=r*c.reward_weight;
    });
    reward=this.rewardEnabled?Math.min(1,reward):0;
    this.rewardQueue.push(reward);const delivered=this.rewardQueue.shift();
    for(const i of this.reward)this.a.drive[i]+=delivered*30;
    this.lastCounts.fill(0);
    for(let bin=0;bin<2;bin++){this.nativeStep(10);this.rule(10);for(let i=0;i<this.n;i++)this.lastCounts[i]+=this.a.counts[i]}
    let total=0,rewardSpikes=0,changed=0;
    for(const v of this.lastCounts)total+=v;
    for(const i of this.reward)rewardSpikes+=this.lastCounts[i];
    for(let e=0;e<this.p;e++)if(this.a.weight[Number(this.source.edges[e])]!==this.a.baseline_plastic[e])changed++;
    const sensory=Object.fromEntries(this.channels.map(c=>[c.name,c.indices.reduce((sum,i)=>sum+this.lastCounts[i],0)]));
    this.tick++;
    return {tick:this.tick,sim_ms:this.tick*20,input,sensory_response:response,reward_input:reward,reward_delivered:delivered,reward_spikes:rewardSpikes,sensory_spikes:sensory,total_spikes:total,changed_edges:changed,wall_ms:performance.now()-start};
  }
}
