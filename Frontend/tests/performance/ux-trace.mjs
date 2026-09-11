import { writeFileSync } from 'node:fs';

export async function startTrace(cdp) {
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline,disabled-by-default-v8.cpu_profiler', transferMode: 'ReturnAsStream' });
}

export async function finishTrace(cdp, filename) {
  const completed = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  const { stream } = await completed;
  const chunks = [];
  while (true) {
    const part = await cdp.send('IO.read', { handle: stream });
    chunks.push(Buffer.from(part.data, part.base64Encoded ? 'base64' : 'utf8'));
    if (part.eof) break;
  }
  await cdp.send('IO.close', { handle: stream });
  writeFileSync(filename, Buffer.concat(chunks));
}
