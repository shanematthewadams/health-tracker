import {z} from 'zod';
// Import preparation only. Device authorization and durable sync are separate.
const units={steps:['count'],distance:['m','km','mi'],heart_rate:['bpm'],resting_heart_rate:['bpm'],hrv:['ms'],sleep:['min','s'],active_energy:['kcal','kJ'],weight:['kg','lb'],workout:['s']};
const sampleSchema=z.object({source:z.enum(['apple_health','garmin_export']),source_id:z.string().min(1).max(200),kind:z.enum(Object.keys(units)),start:z.iso.datetime({offset:true}),end:z.iso.datetime({offset:true}),time_zone:z.string().refine(t=>{try{new Intl.DateTimeFormat('en',{timeZone:t});return true;}catch{return false;}}),value:z.number().finite().nonnegative().nullable(),unit:z.string(),activity_type:z.string().max(80).optional(),upstream_source:z.string().max(100).optional(),related_source_ids:z.array(z.string().max(240)).max(20).default([])}).strict().refine(s=>Date.parse(s.start)<=Date.parse(s.end)&&units[s.kind].includes(s.unit),'Invalid interval or unit');
export function sampleKey(s){return JSON.stringify([s.source,s.source_id]);}
export function workoutCandidate(a,b){
 if(a.kind!=='workout'||b.kind!=='workout'||!a.activity_type||a.activity_type!==b.activity_type)return false;
 const startDelta=Math.abs(Date.parse(a.start)-Date.parse(b.start));
 const durationA=Date.parse(a.end)-Date.parse(a.start),durationB=Date.parse(b.end)-Date.parse(b.start);
 // Similar times are a review candidate, never permission to merge two workouts.
 return startDelta<=120000&&Math.abs(durationA-durationB)<=Math.max(60000,0.05*Math.max(durationA,durationB));
}
export function planHealthImport(incoming,existing,authorizedKinds){
 if(incoming.length>500||existing.length>5000)throw Error('Use bounded import batches');
 const authorized=new Set(authorizedKinds),known=new Map(existing.map(s=>[sampleKey(s),s]));
 const plans=[];
 for(const raw of incoming){const sample=sampleSchema.parse(raw);if(!authorized.has(sample.kind))throw Error('This data category was not authorized');
  // Do not route API-derived Strava data into With or its coaching pipeline.
  if(/strava/i.test(sample.upstream_source||''))throw Error('Strava-sourced imports require a separate permitted integration');
  const key=sampleKey(sample),old=known.get(key);
  if(old){const same=['kind','start','end','time_zone','value','unit','activity_type','upstream_source'].every(k=>old[k]===sample[k]);plans.push({sample,disposition:same?'already_imported':'source_changed_review',candidates:[]});continue;}
  const candidates=[...known.values()].filter(s=>s.source!==sample.source&&(workoutCandidate(sample,s)||sample.related_source_ids.includes(s.source+':'+s.source_id))).map(s=>({source:s.source,source_id:s.source_id}));
  plans.push({sample,disposition:candidates.length?'possible_duplicate_review':'new',candidates});known.set(key,sample);
 }
 return {plans,policy:'Retain originals. Exact source IDs are idempotent. Cross-source candidates require reconciliation; do not add overlapping steps, energy, distance or workouts together.'};
}
