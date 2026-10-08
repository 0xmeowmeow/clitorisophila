import assert from 'node:assert/strict';
import {makeField,REGION_CENTRES,stimulateField} from './surface.js';
const field=makeField();
assert.deepEqual(field,makeField());
for(const region of Object.keys(REGION_CENTRES)){
  const values=[.06,.15,.35].map(r=>stimulateField(field,REGION_CENTRES[region],r,.85).channels[region]);
  assert(values[0]<values[1]&&values[1]<=values[2]);
  const zero=stimulateField(field,REGION_CENTRES[region],.15,0).channels;
  assert(Object.values(zero).every(v=>v===0));
}
const out=stimulateField(field,[100,100,100],.2,1);
assert(Object.values(out.channels).every(v=>v===0));
assert.throws(()=>stimulateField(field,[0,0,0],0,1));
console.log('Schematic field: deterministic, pressure-sensitive, area-sensitive and bounded.');
