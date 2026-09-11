/**
 * Creates a deterministic, locally served set of distinct real-photo fixtures.
 *
 * Source: Wikimedia Commons, "Featured pictures on Wikimedia Commons".
 * The API response supplies the page URL and the license metadata retained in
 * fixture-manifest.json. JPEG photographs require public-domain, CC0, CC BY, or CC BY-SA license metadata. The manifest retains required attribution.
 *
 * Usage: node scripts/build-real-ux-fixtures.mjs [--count 1000] [--seed text]
 *        Add --dry-run to only collect and validate candidate metadata.
 */
import { createHash } from 'node:crypto';
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
};
const targetCount = Number.parseInt(option('--count', '1000'), 10);
const seed = option('--seed', 'photomap-real-ux-v1-2026-09-10');
const dryRun = args.includes('--dry-run');
if (!Number.isSafeInteger(targetCount) || targetCount < 1 || targetCount > 5000) {
  throw new Error('--count must be an integer from 1 through 5000');
}

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const fixtureRoot = path.join(frontendRoot, 'public', 'real-fixtures', 'v1');
const manifestPath = path.join(fixtureRoot, 'fixture-manifest.json');
const api = new URL('https://commons.wikimedia.org/w/api.php');
const sourceCategory = 'Category:Featured pictures on Wikimedia Commons';
const userAgent = 'PhotoMapRealUXFixtureBuilder/1.0 (local UX research fixture builder)';
const sourcePolicy = {
  provider: 'Wikimedia Commons',
  category: sourceCategory,
  category_url: 'https://commons.wikimedia.org/wiki/Commons:Featured_pictures',
  api_documentation: 'https://www.mediawiki.org/wiki/API:Imageinfo',
  reuse_policy: 'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia',
  license_policy: 'JPEG only; license field must be pd, cc0, CC BY, or CC BY-SA and is retained with source-page provenance',
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const htmlToText = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const hasReusableLicense = (metadata) => {
  const license = (metadata.License?.value ?? '').toLowerCase();
  const shortName = (metadata.LicenseShortName?.value ?? '').toLowerCase();
  const usage = (metadata.UsageTerms?.value ?? '').toLowerCase();
  return ['pd', 'cc0'].includes(license) || license.startsWith('cc-by') || shortName.includes('public domain') || shortName.startsWith('cc by') || usage.includes('public domain');
};
const isLikelyDerivative = (title) => /\b(crop(?:ped)?|edit(?:ed)?|restor(?:ed|ation)|detail|version)\b/i.test(title);
const stableRank = (candidate) => sha256(`${seed}\0${candidate.pageid}\0${candidate.title}`);
const fetchJson = async (parameters) => {
  const url = new URL(api);
  for (const [key, value] of Object.entries({ format: 'json', formatversion: '2', origin: '*', ...parameters })) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`Commons API ${response.status}: ${url}`);
  return response.json();
};

async function collectCandidates(required) {
  const candidates = [];
  const seenPageIds = new Set();
  let continuation;
  // The surplus accommodates unavailable thumbnails, corrupt files, and visual duplicates.
  const desiredPool = Math.max(required * 3, required + 250);
  while (candidates.length < desiredPool) {
    const response = await fetchJson({
      action: 'query', generator: 'categorymembers', gcmtitle: sourceCategory,
      gcmtype: 'file', gcmlimit: '500', prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata', iiurlwidth: '2000',
      ...(continuation ?? {}),
    });
    for (const page of response.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      const metadata = info?.extmetadata ?? {};
      if (!info || seenPageIds.has(page.pageid) || info.mime !== 'image/jpeg' || !info.thumburl ||
          Math.max(info.width ?? 0, info.height ?? 0) < 1600 || !hasReusableLicense(metadata) || isLikelyDerivative(page.title)) continue;
      seenPageIds.add(page.pageid);
      candidates.push({
        pageid: page.pageid,
        title: page.title,
        source_original_url: info.url,
        source_download_url: info.thumburl,
        source_page_url: info.descriptionurl,
        original_dimensions: { width: info.width, height: info.height },
        license: htmlToText(metadata.LicenseShortName?.value || metadata.UsageTerms?.value || 'Public domain'),
        license_url: metadata.LicenseUrl?.value || null,
        attribution_required: htmlToText(metadata.AttributionRequired?.value || 'false') === 'true',
        creator: htmlToText(metadata.Artist?.value || 'Unknown'),
        credit: htmlToText(metadata.Credit?.value || ''),
      });
    }
    continuation = response.continue;
    if (!continuation) break;
    // Pace metadata pagination to avoid bursting requests at Commons.
    await sleep(1100);
  }
  return candidates.sort((left, right) => stableRank(left).localeCompare(stableRank(right)));
}

const hammingDistance = (left, right) => {
  let differing = 0;
  for (let i = 0; i < left.length; i += 1) if (left[i] !== right[i]) differing += 1;
  return differing;
};
async function perceptualHash(buffer) {
  const pixels = await sharp(buffer).rotate().resize(9, 8, { fit: 'fill' }).grayscale().raw().toBuffer();
  let hash = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) hash += pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? '1' : '0';
  }
  return hash;
}
async function saveFixture(candidate, index) {
  const fixtureId = `real-${String(index).padStart(4, '0')}`;
  const download = await fetch(candidate.source_download_url, { headers: { 'User-Agent': userAgent } });
  if (!download.ok) throw new Error(`${candidate.title}: thumbnail download HTTP ${download.status}`);
  const source = Buffer.from(await download.arrayBuffer());
  if (source.length === 0 || source.length > 20 * 1024 * 1024) throw new Error(`${candidate.title}: invalid thumbnail size ${source.length}`);
  const inputMetadata = await sharp(source, { failOn: 'error' }).metadata();
  if (!inputMetadata.width || !inputMetadata.height) throw new Error(`${candidate.title}: missing decoded dimensions`);
  const [display, thumbnail, visual_hash] = await Promise.all([
    sharp(source, { failOn: 'error' }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    sharp(source, { failOn: 'error' }).rotate().resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer(),
    perceptualHash(source),
  ]);
  const [displayMetadata, thumbnailMetadata] = await Promise.all([sharp(display).metadata(), sharp(thumbnail).metadata()]);
  const metadataStripped = !displayMetadata.exif && !displayMetadata.iptc && !displayMetadata.xmp &&
    !thumbnailMetadata.exif && !thumbnailMetadata.iptc && !thumbnailMetadata.xmp;
  if (!metadataStripped) throw new Error(`${candidate.title}: generated output retains metadata`);
  const displayName = `${fixtureId}-display.webp`;
  const thumbnailName = `${fixtureId}-thumb.webp`;
  await Promise.all([
    writeFile(path.join(fixtureRoot, displayName), display),
    writeFile(path.join(fixtureRoot, thumbnailName), thumbnail),
  ]);
  return {
    id: fixtureId,
    title: candidate.title.replace(/^File:/, ''),
    url: `/real-fixtures/v1/${displayName}`,
    thumbnail_url: `/real-fixtures/v1/${thumbnailName}`,
    source: candidate,
    bytes: { display: display.length, thumbnail: thumbnail.length },
    dimensions: {
      source_download: { width: inputMetadata.width, height: inputMetadata.height },
      display: { width: displayMetadata.width, height: displayMetadata.height },
      thumbnail: { width: thumbnailMetadata.width, height: thumbnailMetadata.height },
    },
    hashes: { source_download_sha256: sha256(source), display_sha256: sha256(display), thumbnail_sha256: sha256(thumbnail), dhash_64: visual_hash },
    exif_stripped: true,
  };
}

await mkdir(fixtureRoot, { recursive: true });
const candidates = await collectCandidates(targetCount);
if (candidates.length < targetCount) throw new Error(`Only ${candidates.length} eligible reusable JPEG candidates found; need ${targetCount}`);
const runDescriptor = {
  schema_version: 1, generated_at: new Date().toISOString(), seed, target_count: targetCount,
  candidate_pool_count: candidates.length, candidate_pool_sha256: sha256(JSON.stringify(candidates.map(({ pageid, title }) => ({ pageid, title })))),
  source_policy: sourcePolicy, fixtures: [],
};
if (dryRun) {
  console.log(JSON.stringify({ ...runDescriptor, eligible_candidates: candidates.length }, null, 2));
  process.exit(0);
}

const displayHashes = new Set();
const thumbnailHashes = new Set();
const visualHashes = [];
for (const candidate of candidates) {
  if (runDescriptor.fixtures.length === targetCount) break;
  try {
    const fixture = await saveFixture(candidate, runDescriptor.fixtures.length + 1);
    const nearDuplicate = visualHashes.some((hash) => hammingDistance(hash, fixture.hashes.dhash_64) <= 3);
    if (displayHashes.has(fixture.hashes.display_sha256) || thumbnailHashes.has(fixture.hashes.thumbnail_sha256) || nearDuplicate) {
      console.warn(`skip visual duplicate: ${candidate.title}`);
      continue;
    }
    displayHashes.add(fixture.hashes.display_sha256);
    thumbnailHashes.add(fixture.hashes.thumbnail_sha256);
    visualHashes.push(fixture.hashes.dhash_64);
    runDescriptor.fixtures.push(fixture);
    console.log(`generated ${fixture.id} (${runDescriptor.fixtures.length}/${targetCount})`);
  } catch (error) {
    console.warn(`skip unavailable candidate ${candidate.title}: ${error.message}`);
  }
}
if (runDescriptor.fixtures.length !== targetCount) {
  throw new Error(`Generated ${runDescriptor.fixtures.length}/${targetCount}; retained candidate pool was insufficient after validation`);
}
const tempManifestPath = `${manifestPath}.tmp`;
await writeFile(tempManifestPath, `${JSON.stringify(runDescriptor, null, 2)}\n`);
await rename(tempManifestPath, manifestPath);
const manifestStat = await stat(manifestPath);
console.log(`wrote ${manifestPath} (${manifestStat.size} bytes), ${runDescriptor.fixtures.length} distinct real-photo fixtures`);
