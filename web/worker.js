import {loadModel} from './brain.js';
let brain=null,input={},running=true;
let nextTimer=null;
const tick=()=>{
  if(!brain)return;
  if(running){
    const row=brain.step(input),indices=[],counts=[];
    for(let i=0;i<brain.n;i++)if(brain.lastCounts[i]){indices.push(i);counts.push(brain.lastCounts[i])}
    postMessage({type:'tick',row,indices,counts});
  }
  nextTimer=setTimeout(tick,20);
};
self.onmessage=async({data})=>{
  try{
    if(data.type==='load'){
      if(brain)return;
      brain=await loadModel('./model/',(stage,fraction)=>postMessage({type:'progress',stage,fraction}));
      postMessage({type:'ready',manifest:brain.manifest,positions:brain.source.position,drawPositions:brain.source.draw_positions,groups:{sensory:brain.channels.map(c=>c.indices),reward:brain.reward,outputs:Array.from(brain.source.mb)}});
      tick();
    }else if(data.type==='input')input=data.channels;
    else if(data.type==='pause')running=!data.paused;
    else if(data.type==='reset'&&brain){brain.reset();input={};postMessage({type:'reset'})}
    else if(data.type==='controls'&&brain){brain.rewardEnabled=data.reward;brain.learning=data.learning}
  }catch(e){postMessage({type:'error',message:e.message});if(nextTimer)clearTimeout(nextTimer)}
};
