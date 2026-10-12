export function summarizeNutrition(rows, start, end) {
  const days = new Map();
  for(const row of rows) { const list=days.get(row.entry_date)||[]; list.push(row); days.set(row.entry_date,list); }
  const daily=[];
  for(let d=new Date(start+'T00:00:00Z'); d<=new Date(end+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+1)) {
    const day=d.toISOString().slice(0,10), entries=days.get(day)||[];
    const result={entry_date:day,entry_count:entries.length,logging_completeness:'unknown'};
    for(const key of ['calories','protein','carbs','fat','fiber']) {
      const observed=entries.filter(e=>e[key]!=null);
      result[key]=!entries.length || observed.length!==entries.length ? null : observed.reduce((s,e)=>s+Number(e[key]),0);
      result[key+'_known_subtotal']=observed.length ? observed.reduce((s,e)=>s+Number(e[key]),0) : null;
    }
    daily.push(result);
  }
  const recorded=daily.filter(d=>d.protein!=null);
  return {daily,logged_days:days.size,range_days:daily.length,protein_average_on_fully_recorded_days:recorded.length?recorded.reduce((s,d)=>s+d.protein,0)/recorded.length:null,protein_average_denominator_days:recorded.length,interpretation:'Logged intake only; a logged day may still be incomplete. Missing days and unknown values are not zero.'};
}
export function summarizeWeight(rows) {
  const sorted=[...rows].sort((a,b)=>a.entry_date.localeCompare(b.entry_date));
  const mean=rs=>rs.length?rs.reduce((s,r)=>s+Number(r.weight),0)/rs.length:null;
  return {unit:'lb',record_count:rows.length,first:sorted[0]??null,last:sorted.at(-1)??null,change:rows.length>1?Number(sorted.at(-1).weight)-Number(sorted[0].weight):null,average:mean(rows),interpretation:'Recorded measurements; no interpolation. Legacy With weights are stored in pounds.'};
}
