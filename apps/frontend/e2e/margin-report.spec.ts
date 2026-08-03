import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

test('calculates product margin from sale snapshots', async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const api = 'http://127.0.0.1:3001/api/v1';
  const today = new Date().toISOString().slice(0, 10);

  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  const brand = (await (
    await page.request.post(`${api}/brands`, {
      data: { name: `Marca relatório margem ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const category = (await (
    await page.request.post(`${api}/categories`, {
      data: { name: `Categoria relatório margem ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const productCode = `REL-MAR-${suffix}`;
  const product = (await (
    await page.request.post(`${api}/products`, {
      data: {
        brandId: brand.data.id,
        categoryId: category.data.id,
        code: productCode,
        description: `Produto relatório margem ${suffix}`,
        catalogPrice: '15.00',
        purchasePrice: '6.00',
        originalPrice: '15.00',
        suggestedSalePrice: '11.25',
      },
    })
  ).json()) as { data: { id: string } };
  await page.request.post(`${api}/inventory/adjustments`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      productId: product.data.id,
      type: 'CORRECTION',
      quantityDelta: 2,
      reason: 'Estoque para validar relatório de margem',
    },
  });
  await page.request.post(`${api}/sales`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      items: [{ productId: product.data.id, quantity: 2, unitPrice: '11.25' }],
    },
  });

  await page.getByRole('link', { name: 'Margem por produto' }).click();
  await page.getByLabel('Data inicial').fill(today);
  await page.getByLabel('Data final').fill(today);
  await page.getByLabel('Produto').selectOption(product.data.id);
  await page.getByRole('button', { name: 'Consultar' }).click();

  await expect(page).toHaveURL(
    new RegExp(`startDate=${today}.*endDate=${today}.*productId=${product.data.id}`),
  );
  await expect(page.getByText(productCode, { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 22,50', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 12,00', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 10,50', { exact: true })).toBeVisible();
  await expect(page.getByText('46,67%', { exact: true })).toBeVisible();
});
