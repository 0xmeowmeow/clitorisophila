import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import engineFactory from './engine.mjs';
import {Brain} from './brain.js';
const manifest=JSON.parse(fs.readFileSync('web/public/model/manifest.json'));
const bytes=zlib.gunzipSync(fs.readFileSync('web/public/model/connectome.bin.gz'));
const raw=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const types={'<i8':BigInt64Array,'<i4':Int32Array,'<f4':Float32Array,'<f8':Float64Array,'|u1':Uint8Array,'|i1':Int8Array};
const arrays={};for(const [key,spec]of Object.entries(manifest.arrays))arrays[key]=new types[spec.dtype](raw,spec.offset,spec.bytes/types[spec.dtype].BYTES_PER_ELEMENT);
const b=new Brain(await engineFactory(),manifest,arrays),rows=[];
for(let i=0;i<40;i++){
 const row=b.step(i<10?{glans:1}:{});
 const hash=crypto.createHash('sha256').update(Buffer.from(b.lastCounts.buffer)).digest('hex');
 rows.push({...row,spike_sha256:hash});
}
const plastic=new Float32Array(b.p);for(let e=0;e<b.p;e++)plastic[e]=b.a.weight[Number(b.source.edges[e])];
rows.at(-1).plastic_sha256=crypto.createHash('sha256').update(Buffer.from(plastic.buffer)).digest('hex');
fs.writeFileSync('/tmp/clitorisophila-wasm-assay.json',JSON.stringify(rows));
console.log(JSON.stringify({sensory:rows.reduce((s,r)=>s+r.sensory_spikes.glans,0),reward:rows.reduce((s,r)=>s+r.reward_spikes,0),changed:rows.at(-1).changed_edges,total:rows.reduce((s,r)=>s+r.total_spikes,0)}));
