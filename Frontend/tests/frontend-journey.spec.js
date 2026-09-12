const { test, expect } = require('@playwright/test');
const baseUrl = 'http://127.0.0.1:4191';

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.abort('failed'));
});

test('navigation preserves map query through reload and browser history', async ({ page }) => {
  await page.goto(baseUrl + '/?campaign=demo');
  await page.getByRole('button', { name: '지도', exact: true }).click();
  await page.getByRole('searchbox', { name: '장소, 제목, 설명 검색' }).fill('Seoul');
  await expect(page.getByText('지도 표시 3장', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '앨범', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('searchbox', { name: '장소, 제목, 설명 검색' })).toHaveValue('Seoul');
  await page.reload();
  await expect(page.getByText('지도 표시 3장', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/campaign=demo/);
  await page.goForward();
  await expect(page.getByRole('searchbox', { name: '앨범 검색' })).toBeVisible();
});

test('photo can be opened with keyboard, liked and found again', async ({ page }) => {
  await page.goto(baseUrl);
  const card = page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true });
  await card.focus();
  await card.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '좋아요', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await page.getByRole('button', { name: '좋아요', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Bangkok Night Road', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('img', { name: 'Bangkok Night Road', exact: true })).toBeVisible();
});

test('album deep link restores search and detail across reload and back', async ({ page }) => {
  await page.goto(baseUrl + '/?view=albums');
  const search = page.getByRole('searchbox', { name: '앨범 검색' });
  await search.fill('Seoul');
  await page.getByRole('button', { name: /Seoul.*앨범/ }).click();
  await expect(page.getByRole('heading', { name: 'Seoul', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Seoul', exact: true })).toBeVisible();
  await page.goBack();
  await expect(search).toHaveValue('Seoul');
});

test('feed restores scroll after navigating away', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl);
  const feed = page.locator('[data-photo-feed]');
  await expect(page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true })).toBeVisible();
  await feed.evaluate(node => { node.scrollTop = 480; });
  await expect.poll(() => feed.evaluate(node => node.scrollTop)).toBeGreaterThan(100);
  const previous = await feed.evaluate(node => node.scrollTop);
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  await page.getByRole('button', { name: '앨범', exact: true }).click();
  await page.goBack();
  await expect.poll(() => feed.evaluate(node => node.scrollTop)).toBeCloseTo(previous, -1);
});

test('map tag keyboard selection connects detail to favorites', async ({ page }) => {
  await page.goto(baseUrl + '/?view=map');
  await page.getByRole('button', { name: '지도 필터 열기', exact: true }).click();
  await page.getByRole('button', { name: '밤하늘', exact: true }).press('Enter');
  await expect(page).toHaveURL(/mapTag=/);
  await page.getByRole('button', { name: '사진 상세 보기', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '좋아요', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '좋아요 취소', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: '좋아요 모아보기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '좋아요', exact: true })).toBeVisible();
  await expect(page.locator('[data-photo-feed] img')).toHaveCount(1);
  await page.goBack();
  await expect(page.getByRole('button', { name: '지도 필터 열기', exact: true })).toContainText('밤하늘');
});

test('empty map search has a recovery action', async ({ page }) => {
  await page.goto(baseUrl + '/?view=map&mapSearch=no-such-photo');
  await expect(page.getByText('이 조건에는 지도에 표시할 사진이 없습니다.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '검색·필터 초기화', exact: true }).click();
  await expect(page.getByText('지도 표시 16장', { exact: true })).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`completed exploration layout at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(baseUrl);
    await expect(page.getByRole('button', { name: '장소로 찾기', exact: true })).toBeVisible();
    await expect.poll(() => page.locator('[data-photo-feed] img').evaluateAll(images => images.length > 0 && images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    if (viewport.width < 768) {
      const menu = await page.getByRole('button', { name: '메뉴 열기' }).boundingBox();
      const title = await page.getByRole('heading', { name: 'Photomap Public Archive' }).boundingBox();
      expect(title.y).toBeGreaterThan(menu.y + menu.height);
    }
    await page.screenshot({ path: `test-results/frontend-home-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true }).press('Space');
    await expect(page.getByRole('dialog')).toBeVisible();
    const bounds = await page.getByRole('dialog').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    const favorite = await page.getByRole('dialog').getByRole('button', { name: '좋아요', exact: true }).boundingBox();
    expect(favorite.y + favorite.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    await page.screenshot({ path: `test-results/frontend-modal-${viewport.width}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '앨범 둘러보기', exact: true }).click();
    await expect(page.getByRole('searchbox', { name: '앨범 검색' })).toBeVisible();
    await page.screenshot({ path: `test-results/frontend-albums-${viewport.width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}