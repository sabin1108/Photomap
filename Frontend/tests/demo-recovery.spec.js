const { test, expect } = require('@playwright/test');
const baseUrl = 'http://127.0.0.1:4191';

async function openDemoPhotos(page) {
  await page.getByRole('button', { name: '관계 보기', exact: true }).click();
  await page.getByRole('button', { name: 'Demo 태그 사진 보기', exact: true }).press('Enter');
  await expect(page.locator('.d3-drag-node img')).toHaveCount(16);
  await expect(page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true })).toBeEnabled();
}

for (const response of ['unavailable', 'empty']) {
  test(`public demo remains usable when DB is ${response}`, async ({ page }) => {
    await page.route('**/*.supabase.co/**', route => response === 'unavailable'
      ? route.abort('failed') : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto(baseUrl);
    await expect(page.getByText('16 memories', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: '선택', exact: true })).toHaveCount(0);
    await openDemoPhotos(page);
    await expect.poll(() => page.locator('.d3-drag-node img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    await page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true }).press('Enter');
    await page.getByRole('button', { name: '좋아요', exact: true }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();
    await page.reload();
    await openDemoPhotos(page);
    await page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true }).press('Enter');
    await expect(page.getByRole('button', { name: '좋아요됨', exact: true })).toBeVisible();
  });
}

test('healthy remote list replaces examples without mixing IDs', async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => {
    const isMedia = new URL(route.request().url()).pathname.endsWith('/media');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isMedia ? [{
      media_id: 99, file_url: '/demo-images/v1/1-display.webp', thumbnail_url: '/demo-images/v1/1-thumb.webp',
      take_time: '2026-01-01', created_time: '2026-01-01', location: { address_text: 'Seoul', lat: 37.56, lon: 126.97 },
      category: { name: 'Travel' }, media_description: { description_text: 'Remote photo' },
    }] : []) });
  });
  await page.goto(baseUrl);
  await expect(page.getByText('1 memories', { exact: false })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Remote photo', exact: true })).toBeVisible();
  await expect(page.getByText('예시 사진', { exact: false })).toHaveCount(0);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`map and album searches work at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/*.supabase.co/**', route => route.abort('failed'));
    await page.goto(baseUrl);
    async function navigate(name) {
      if (viewport.width < 768) await page.getByRole('button', { name: '메뉴 열기' }).click();
      await page.getByRole('button', { name, exact: true }).click();
    }
    await navigate('지도');
    await expect(page.getByText('지도 표시 16장', { exact: true })).toBeVisible();
    const mapSearch = page.getByRole('searchbox', { name: '장소, 제목, 설명 검색' });
    await mapSearch.fill(' Seoul ');
    await expect(page.getByText('지도 표시 3장', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '검색어 지우기' }).click();
    await expect(page.getByText('지도 표시 16장', { exact: true })).toBeVisible();
    await navigate('앨범');
    await page.getByRole('searchbox', { name: '앨범 검색' }).fill(' Seoul ');
    await expect(page.getByText('Seoul', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '검색어 지우기' }).click();
    await expect(page.getByText('밤하늘', { exact: true })).toBeVisible();
    await expect(page.getByText('자연', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/demo-albums-${viewport.width}.png` });
  });
}

test('performance preview keeps its original six-photo fixture', async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.abort('failed'));
  await page.goto(baseUrl + '/?perfImageMode=optimized');
  await expect(page.getByText('6 memories', { exact: false })).toBeVisible();
});
