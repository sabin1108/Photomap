import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Artificial analysis-contract fixture. Never included in measured evidence.
const dir = mkdtempSync(path.join(tmpdir(), 'photomap-ux-summary-test-'));
mkdirSync(path.join(dir, 'raw'));
try {
  const run = { id:'test-only',scenario:'click',mode:'all',pair:1,instrumentation:true,valid:true,inputs:[{ackAt:0}],pointer:{pressSentAt:50},path:{maxSendLatenessMs:1,peak:1800,end:1800},externalStart:0,externalEnd:3000,prepared:{cards:1000},final:{cards:1000},probe:{enabled:true,supported:['event','long-animation-frame','longtask'],marks:{idleStart:0,scrollStart:10,scrollEnd:20,recoveryEnd:30},raf:[9,10,12,15,19,20,22],entries:{'long-animation-frame':[{startTime:9,duration:3,blockingDuration:99},{startTime:10,duration:2,blockingDuration:5},{startTime:19.5,duration:2,blockingDuration:7},{startTime:20,duration:2,blockingDuration:200}],longtask:[{startTime:14,duration:60}],event:[{name:'pointerdown',startTime:24,duration:32,processingStart:25,interactionId:7},{name:'click',startTime:25,duration:24,processingStart:28,interactionId:7},{name:'pointerover',startTime:25,duration:999,processingStart:25,interactionId:0}]},modal:{click:{eventTime:25,receivedAt:28,photoId:'fixture-0056'},readyAt:45,twoRafAt:70}}};
  writeFileSync(path.join(dir,'raw/run.json'),JSON.stringify(run));
  const script=fileURLToPath(new URL('./summarize-ux-performance.mjs',import.meta.url));
  execFileSync(process.execPath,[script,dir],{stdio:'pipe'});
  const [m]=JSON.parse(readFileSync(path.join(dir,'run-metrics.json'),'utf8'));
  assert.equal(m.scroll.loafBlockingSum,12,'Use browser blockingDuration and start-inclusive/end-exclusive membership');
  assert.equal(m.scroll.loafCount,2);
  assert.equal(m.scroll.loafCrossingBoundary.length,2,'Cross-boundary diagnostics separate from primary membership');
  assert.deepEqual(m.scroll.rafGaps,[2,3,4]);
  assert.equal(m.scroll.rafP95,3.9);
  assert.equal(m.modalReadyMs,20);
  assert.equal(m.clickInputDelayMs,3);
  assert.equal(m.interactionDurationMs,32,'One interaction takes max duration, excludes interactionId zero');
  run.probe.entries.event=[];
  run.probe.entries.longtask=null;
  writeFileSync(path.join(dir,'raw/run.json'),JSON.stringify(run));
  execFileSync(process.execPath,[script,dir],{stdio:'pipe'});
  const [missing]=JSON.parse(readFileSync(path.join(dir,'run-metrics.json'),'utf8'));
  assert.equal(missing.clickInputDelayMs,null,'Missing Event Timing is not zero');
  assert.equal(missing.interactionDurationMs,null);
  assert.equal(missing.scroll.longTaskSum,null,'Unsupported metric is not zero');
  console.log('PASS: interval membership, rAF boundaries, interaction grouping, missing-vs-zero');
} finally {
  // Only the exact directory returned by mkdtempSync is removed.
  if(path.dirname(dir)!==path.resolve(tmpdir())||!path.basename(dir).startsWith('photomap-ux-summary-test-'))throw Error('Unexpected temporary path');
  rmSync(dir,{recursive:true,force:true});
}
