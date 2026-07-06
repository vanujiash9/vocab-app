import { expect, test } from '@playwright/test';

test.describe('auth and protected routing smoke', () => {
  test('renders the auth screen and primary copy', async ({ page }) => {
    await page.goto('/#/auth');

    await expect(page.getByRole('heading', { name: 'Vào học ngay' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByText('Một điểm vào duy nhất để quay lại đúng tiến độ học của bạn.')).toBeVisible();
  });

  test('redirects protected dashboard route to auth when signed out', async ({ page }) => {
    await page.goto('/#/dashboard');

    await expect(page).toHaveURL(/#\/auth$/);
    await expect(page.getByRole('heading', { name: 'Vào học ngay' })).toBeVisible();
  });

  test('keeps teacher-only import route behind auth', async ({ page }) => {
    await page.goto('/#/import-excel');

    await expect(page).toHaveURL(/#\/auth$/);
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });
});
