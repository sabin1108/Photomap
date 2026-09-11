import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const output = path.resolve(process.argv[2]);
const quantile = (values, p) => { const a = values.filter(Number.isFinite).sort((a,b) => a-b); if (!a.length) return null; const i = (a.length-1)*p, lo = Math.floor(i); return a[lo]+(a[Math.ceil(i)]-a[lo])*(i-lo); };
const dist = values => { const a = values.filter(Number.isFinite); return { n: a.length, missing: values.length-a.length, median: quantile(a,.5), p95: quantile(a,.95), q1: quantile(a,.25), q3: quantile(a,.75), min: a.length ? Math.min(...a) : null, max: a.length ? Math.max(...a) : null }; };
const sum = a => a.reduce((s,x) => s+x,0);
function interval(probe, start, end) {
  const types = probe.entries;
  const loaf = types['long-animation-frame']?.filter(e => e.startTime >= start && e.startTime < end) ?? null;
  const tasks = types.longtask?.filter(e => e.startTime >= start && e.startTime < end) ?? null;
  const gaps = probe.enabled ? probe.raf.slice(1).flatMap((t,i) => probe.raf[i] >= start && t < end ? [t-probe.raf[i]] : []) : null;
  return { start, end, duration: end-start, loafCount: loaf?.length ?? null, loafBlockingSum: loaf ? sum(loaf.map(e=>e.blockingDuration)) : null, loafLongest: loaf ? Math.max(0,...loaf.map(e=>e.duration)) : null, longTaskCount: tasks?.length ?? null, longTaskSum: tasks ? sum(tasks.map(e=>e.duration)) : null, longTaskMax: tasks ? Math.max(0,...tasks.map(e=>e.duration)) : null, rafCount: gaps?.length ?? null, rafP95: gaps?.length ? quantile(gaps,.95) : null, rafMax: gaps?.length ? Math.max(...gaps) : null, rafGaps: gaps, delayedGaps: [50,100,250].map(threshold=>({ threshold, count: gaps ? gaps.filter(g=>g>threshold).length : null, ratio: gaps?.length ? gaps.filter(g=>g>threshold).length/gaps.length : null })), loafCrossingBoundary: types['long-animation-frame']?.filter(e => (e.startTime < start && e.startTime+e.duration > start) || (e.startTime < end && e.startTime+e.duration > end)) ?? null, excludedRafBoundaryPairs: probe.raf.slice(1).flatMap((t,i) => (probe.raf[i]<start&&t>=start)||(probe.raf[i]<end&&t>=end) ? [[probe.raf[i],t]] : []) };
}
const runs = readdirSync(path.join(output,'raw')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(output,'raw',f),'utf8')));
const metrics = runs.map(r => {
  if (!r.probe) return { id:r.id, scenario:r.scenario, mode:r.mode, pair:r.pair, instrumentation:r.instrumentation, valid:false, failure:r.failure };
  const p=r.probe, m=p.marks;
  const clicks = p.entries.event?.filter(e=>e.name==='click' && e.interactionId>0) ?? null;
  const click = clicks?.find(e=>Math.abs(e.startTime-(p.modal?.click.eventTime ?? -10000))<5) ?? null;
  const interaction = click ? p.entries.event.filter(e=>e.interactionId===click.interactionId) : [];
  return { id:r.id, scenario:r.scenario, mode:r.mode, pair:r.pair, instrumentation:r.instrumentation, valid:r.valid, failure:r.failure ?? null, idle:interval(p,m.idleStart,m.scrollStart), scroll:interval(p,m.scrollStart,m.scrollEnd), recovery:interval(p,m.scrollEnd,m.recoveryEnd), modalReadyMs:p.modal?.readyAt != null ? p.modal.readyAt-p.modal.click.eventTime : null, modalTwoRafMs:p.modal?.twoRafAt != null ? p.modal.twoRafAt-p.modal.click.eventTime : null, eventTimeAlignmentMs:p.modal ? p.modal.click.receivedAt-p.modal.click.eventTime : null, clickInputDelayMs:click ? click.processingStart-click.startTime : null, interactionDurationMs:interaction.length ? Math.max(...interaction.map(e=>e.duration)) : null, interactionId:click?.interactionId ?? null, eventTimingMissingReason:click ? null : !p.enabled ? 'instrumentation-off' : !p.supported.includes('event') ? 'unsupported' : 'no matching exposed click; threshold-censored or browser omission', clickId:p.modal?.click.photoId ?? null, actualClickDelayMs:r.pointer ? r.pointer.pressSentAt-r.inputs.at(-1).ackAt : null, inputMaxLatenessMs:r.path.maxSendLatenessMs, externalScrollMs:r.externalEnd-r.externalStart, peak:r.path.peak, finalTop:r.path.end, boundaryCardCounts:[r.prepared.cards,r.final.cards], supported:p.supported };
});
const summaries=[];
for(const scenario of ['scroll','click']) for(const instrumentation of [false,true]) for(const mode of ['all','virtual']) {
  const selected=metrics.filter(r=>r.scenario===scenario&&r.instrumentation===instrumentation&&r.mode===mode);
  if(!selected.length) continue;
  const valid=selected.filter(r=>r.valid);
  const getters={ loafBlockingSum:r=>r.scroll.loafBlockingSum, loafCount:r=>r.scroll.loafCount, loafLongest:r=>r.scroll.loafLongest, rafRunP95:r=>r.scroll.rafP95, rafRunMax:r=>r.scroll.rafMax, longTaskSum:r=>r.scroll.longTaskSum, rafGap50Ratio:r=>r.scroll.delayedGaps[0].ratio, rafGap100Ratio:r=>r.scroll.delayedGaps[1].ratio, rafGap250Ratio:r=>r.scroll.delayedGaps[2].ratio, rafGap50Count:r=>r.scroll.delayedGaps[0].count, rafGap100Count:r=>r.scroll.delayedGaps[1].count, rafGap250Count:r=>r.scroll.delayedGaps[2].count, modalReadyMs:r=>r.modalReadyMs, clickInputDelayMs:r=>r.clickInputDelayMs, interactionDurationMs:r=>r.interactionDurationMs, actualClickDelayMs:r=>r.actualClickDelayMs, inputMaxLatenessMs:r=>r.inputMaxLatenessMs, externalScrollMs:r=>r.externalScrollMs };
  summaries.push({scenario,instrumentation,mode,attempts:selected.length,valid:valid.length,failures:selected.filter(r=>!r.valid).map(r=>({id:r.id,failure:r.failure})),metrics:Object.fromEntries(Object.entries(getters).map(([k,fn])=>[k,dist(valid.map(fn))]))});
}
const paired=[];
for(const scenario of ['scroll','click']) for(const pair of [...new Set(metrics.map(r=>r.pair))]) {
  const a=metrics.find(r=>r.scenario===scenario&&r.pair===pair&&r.instrumentation&&r.mode==='all');
  const b=metrics.find(r=>r.scenario===scenario&&r.pair===pair&&r.instrumentation&&r.mode==='virtual');
  if(!a||!b)continue;
  const comparable=a.valid&&b.valid&&(scenario!=='click'||a.clickId===b.clickId);
  paired.push({scenario,pair,a:a.id,b:b.id,comparable,deltaLoafBlocking:comparable&&a.scroll.loafBlockingSum!==null&&b.scroll.loafBlockingSum!==null?a.scroll.loafBlockingSum-b.scroll.loafBlockingSum:null,deltaRafP95:comparable&&a.scroll.rafP95!==null&&b.scroll.rafP95!==null?a.scroll.rafP95-b.scroll.rafP95:null,deltaModalReady:comparable&&a.modalReadyMs!==null&&b.modalReadyMs!==null?a.modalReadyMs-b.modalReadyMs:null,deltaClickDispatchDelay:comparable&&a.actualClickDelayMs!==null&&b.actualClickDelayMs!==null?a.actualClickDelayMs-b.actualClickDelayMs:null});
}
const pairSummary={};for(const scenario of ['scroll','click']){const p=paired.filter(p=>p.scenario===scenario&&p.comparable);pairSummary[scenario]={pairs:p.length,deltaLoafBlocking:dist(p.map(p=>p.deltaLoafBlocking)),deltaRafP95:dist(p.map(p=>p.deltaRafP95)),deltaModalReady:dist(p.map(p=>p.deltaModalReady)),deltaClickDispatchDelay:dist(p.map(p=>p.deltaClickDispatchDelay)),modalPairsFavoringB:p.filter(p=>p.deltaModalReady>0).length,modalPairsFavoringA:p.filter(p=>p.deltaModalReady<0).length};}
writeFileSync(path.join(output,'run-metrics.json'),JSON.stringify(metrics,null,2));
writeFileSync(path.join(output,'summary.json'),JSON.stringify({summaries,pairSummary,paired,quantileMethod:'linear interpolation (n-1)*p',eventDurationResolutionMs:8},null,2));
const rows=['scenario,instrumentation,mode,metric,attempts,valid,observed,missing,median,p95,q1,q3,min,max'];
for(const s of summaries)for(const [name,v]of Object.entries(s.metrics)) rows.push([s.scenario,s.instrumentation,s.mode,name,s.attempts,s.valid,v.n,v.missing,v.median,v.p95,v.q1,v.q3,v.min,v.max].join(','));
writeFileSync(path.join(output,'summary.csv'),rows.join('\n'));
console.log(JSON.stringify({runs:metrics.length,valid:metrics.filter(r=>r.valid).length,summaries:summaries.map(s=>({scenario:s.scenario,on:s.instrumentation,mode:s.mode,valid:s.valid,loaf:s.metrics.loafBlockingSum,modal:s.metrics.modalReadyMs,inputLate:s.metrics.inputMaxLatenessMs,externalScroll:s.metrics.externalScrollMs})),pairSummary},null,2));
