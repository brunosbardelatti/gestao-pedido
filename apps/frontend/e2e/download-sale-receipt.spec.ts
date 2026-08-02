import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

test('downloads the non-fiscal receipt of a completed sale', async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const api = 'http://127.0.0.1:3001/api/v1';

  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  const brandResponse = await page.request.post(`${api}/brands`, {
    data: { name: `Marca recibo ${suffix}` },
  });
  expect(brandResponse.ok()).toBe(true);
  const brand = (await brandResponse.json()) as { data: { id: string } };
  const categoryResponse = await page.request.post(`${api}/categories`, {
    data: { name: `Categoria recibo ${suffix}` },
  });
  expect(categoryResponse.ok()).toBe(true);
  const category = (await categoryResponse.json()) as { data: { id: string } };
  const productResponse = await page.request.post(`${api}/products`, {
    data: {
      brandId: brand.data.id,
      categoryId: category.data.id,
      code: `REC-VEN-${suffix}`,
      description: `Produto recibo ${suffix}`,
      catalogPrice: '15.00',
      purchasePrice: '6.00',
      originalPrice: '15.00',
      suggestedSalePrice: '12.00',
    },
  });
  expect(productResponse.ok()).toBe(true);
  const product = (await productResponse.json()) as { data: { id: string } };
  const adjustmentResponse = await page.request.post(`${api}/inventory/adjustments`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      productId: product.data.id,
      type: 'CORRECTION',
      quantityDelta: 1,
      reason: 'Estoque para recibo',
    },
  });
  expect(adjustmentResponse.ok()).toBe(true);

  await page.goto('/sales/new');
  await page.getByLabel('Produto do item 1').selectOption(product.data.id);
  await page.getByRole('button', { name: 'Registrar venda' }).click();
  await expect(page.getByRole('status')).toContainText('Venda registrada');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar recibo' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^recibo-venda-[0-9a-f-]{36}\.pdf$/,
  );
  expect(await download.failure()).toBeNull();
});
