const { test, expect } = require('@playwright/test');
const baseUrl = 'http://127.0.0.1:4191';

async function openAlbums(page) {
  await page.route('**/*.supabase.co/**', route => route.abort('failed'));
  await page.goto(baseUrl);
  await page.getByRole('button', { name: '앨범', exact: true }).click();
}

test('album cards expose native keyboard actions without nested controls', async ({ page }) => {
  await openAlbums(page);
  const search = page.getByRole('searchbox', { name: '앨범 검색' });
  await search.fill('Seoul');
  await expect(page).toHaveURL(/albumSearch=Seoul/);

  const seoulAlbum = page.getByRole('button', { name: /Seoul.*앨범/ }).first();
  await expect(seoulAlbum).toBeVisible();
  await expect(page.locator('article button button')).toHaveCount(0);
  await expect(page.locator('article img[alt="Seoul 앨범 표지"][loading="lazy"]')).toHaveCount(1);

  await seoulAlbum.press('Enter');
  await expect(page).toHaveURL(/album=loc_Seoul/);
  await expect(page.getByRole('heading', { name: 'Seoul' })).toBeVisible();

  await page.getByRole('button', { name: '앨범 목록으로 돌아가기' }).click();
  await expect(page).not.toHaveURL(/album=loc_Seoul/);
});

test('album tabs expose pressed state and empty search can reset all filters', async ({ page }) => {
  await openAlbums(page);
  const allTab = page.getByRole('button', { name: '전체 보기' });
  const systemTab = page.getByRole('button', { name: '시스템' });
  await expect(allTab).toHaveAttribute('aria-pressed', 'true');

  await systemTab.click();
  await expect(systemTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/albumTab=system/);

  await page.getByRole('searchbox', { name: '앨범 검색' }).fill('no matching album');
  await expect(page.getByText('조건에 맞는 앨범이 없습니다')).toBeVisible();
  await page.getByRole('button', { name: '검색과 탭 초기화' }).click();

  await expect(allTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('searchbox', { name: '앨범 검색' })).toHaveValue('');
  await expect(page).not.toHaveURL(/albumTab=system|albumSearch=/);
});
