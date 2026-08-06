import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const profile = __ENV.LOAD_PROFILE || 'smoke';
const profileScenarios = {
  smoke: { executor: 'constant-arrival-rate', rate: 1, timeUnit: '1s', duration: __ENV.LOAD_DURATION || '5m', preAllocatedVUs: 5 },
  normal: { executor: 'constant-arrival-rate', rate: 3, timeUnit: '1s', duration: __ENV.LOAD_DURATION || '30m', preAllocatedVUs: 15 },
  peak: { executor: 'constant-arrival-rate', rate: 8, timeUnit: '1s', duration: __ENV.LOAD_DURATION || '30m', preAllocatedVUs: 40 },
  spike: {
    executor: 'ramping-arrival-rate',
    startRate: 8,
    timeUnit: '1s',
    preAllocatedVUs: 100,
    stages: [
      { target: 20, duration: '30s' },
      { target: 20, duration: __ENV.LOAD_DURATION || '5m' },
      { target: 3, duration: '30s' },
    ],
  },
  soak: { executor: 'constant-arrival-rate', rate: 5, timeUnit: '1s', duration: __ENV.LOAD_DURATION || '2h', preAllocatedVUs: 25 },
};

if (!profileScenarios[profile]) throw new Error(`Unknown LOAD_PROFILE: ${profile}`);

export const options = {
  scenarios: { [profile]: profileScenarios[profile] },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    load_server_errors: ['rate==0'],
    load_rate_limited: ['rate==0'],
    dropped_iterations: ['count==0'],
  },
};

const serverErrors = new Rate('load_server_errors');
const rateLimited = new Rate('load_rate_limited');

function requireStagingConfiguration() {
  const baseUrl = (__ENV.LOAD_SUPABASE_URL || '').replace(/\/$/, '');
  const apiKey = __ENV.LOAD_SUPABASE_ANON_KEY || '';
  const userId = __ENV.LOAD_USER_ID || '';
  if (__ENV.LOAD_TEST_CONFIRM !== 'staging-only') fail('Set LOAD_TEST_CONFIRM=staging-only after verifying isolated staging.');
  if (!baseUrl || !apiKey || !userId) fail('LOAD_SUPABASE_URL, LOAD_SUPABASE_ANON_KEY, and LOAD_USER_ID are required.');
  if (baseUrl.includes('wmxdaprqassvwboiownd')) fail('Known PhotoMap production Supabase project is blocked.');
  if (apiKey.startsWith('sb_secret_')) fail('Secret/service keys are forbidden. Use a staging publishable or anon key.');
  return { baseUrl, apiKey, userId };
}

export function setup() {
  return requireStagingConfiguration();
}

export default function ({ baseUrl, apiKey, userId }) {
  const headers = { apikey: apiKey, Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
  const mediaSelect = [
    'media_id', 'file_url', 'thumbnail_url', 'take_time', 'created_time',
    'location(address_text,lat,lon)', 'category(name)',
    'media_description(description_text)',
  ].join(',');
  const requests = [
    ['GET', `${baseUrl}/rest/v1/category?select=name&user_id=eq.${userId}&order=name.asc`, null, { headers, tags: { endpoint: 'categories' } }],
    ['GET', `${baseUrl}/rest/v1/media?select=${encodeURIComponent(mediaSelect)}&user_id=eq.${userId}&order=created_time.desc&limit=50`, null, { headers, tags: { endpoint: 'photos' } }],
    ['GET', `${baseUrl}/rest/v1/favorites?select=media_id&user_id=eq.${userId}`, null, { headers, tags: { endpoint: 'favorites' } }],
  ];
  const responses = http.batch(requests);
  for (const response of responses) {
    serverErrors.add(response.status >= 500);
    rateLimited.add(response.status === 429);
    check(response, {
      'read endpoint returns 2xx': (result) => result.status >= 200 && result.status < 300,
      'read endpoint returns JSON': (result) => (result.headers['Content-Type'] || '').includes('application/json'),
    });
  }
  sleep(0.15 + Math.random() * 0.35);
}
