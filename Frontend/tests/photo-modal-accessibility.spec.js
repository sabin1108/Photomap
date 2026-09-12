const { test, expect } = require('@playwright/test');
const baseUrl = 'http://127.0.0.1:4191';

async function openRelationshipDemo(page) {
  await page.route('**/*.supabase.co/**', route => route.abort('failed'));
  await page.goto(baseUrl);
  await page.getByRole('button', { name: '관계 보기', exact: true }).click();
  await page.getByRole('button', { name: 'Demo 태그 사진 보기', exact: true }).press('Enter');
  const opener = page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true });
  await expect(opener).toBeEnabled();
  return opener;
}

test('photo modal traps focus, closes with Escape, and restores opener focus', async ({ page }) => {
  const opener = await openRelationshipDemo(page);
  await opener.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Bangkok Night Road', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-photo-modal-id', /.+/);

  const closeButton = dialog.getByRole('button', { name: 'Close', exact: true });
  await expect(closeButton).toBeFocused();

  await closeButton.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: '좋아요', exact: true })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('photo modal close button restores opener focus', async ({ page }) => {
  const opener = await openRelationshipDemo(page);
  await opener.click();

  const dialog = page.getByRole('dialog', { name: 'Bangkok Night Road', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
