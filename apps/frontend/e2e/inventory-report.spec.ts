import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

test('consults the inventory report with search and ordering', async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const api = 'http://127.0.0.1:3001/api/v1';

  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  const brandName = `Marca relatório estoque ${suffix}`;
  const brand = (await (
    await page.request.post(`${api}/brands`, { data: { name: brandName } })
  ).json()) as { data: { id: string } };
  const category = (await (
    await page.request.post(`${api}/categories`, {
      data: { name: `Categoria relatório estoque ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const productCode = `REL-EST-${suffix}`;
  const product = (await (
    await page.request.post(`${api}/products`, {
      data: {
        brandId: brand.data.id,
        categoryId: category.data.id,
        code: productCode,
        description: `Produto relatório estoque ${suffix}`,
        catalogPrice: '25.00',
        purchasePrice: '12.00',
        originalPrice: '25.00',
        suggestedSalePrice: '22.50',
      },
    })
  ).json()) as { data: { id: string } };
  await page.request.post(`${api}/inventory/adjustments`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      productId: product.data.id,
      type: 'CORRECTION',
      quantityDelta: 7,
      reason: 'Estoque para validar relatório',
    },
  });

  await page.getByRole('link', { name: 'Posição de estoque' }).click();
  await expect(page).toHaveURL('/reports/inventory');
  await expect(page.getByRole('heading', { name: 'Posição de estoque' })).toBeVisible();

  await page.getByLabel('Produto ou marca').fill(brandName);
  await page.getByLabel('Ordenar por').selectOption('balance');
  await page.getByLabel('Direção').selectOption('desc');
  await page.getByRole('button', { name: 'Aplicar' }).click();

  await expect(page).toHaveURL(/search=Marca.*sortBy=balance.*sortOrder=desc/);
  await expect(page.getByText(productCode, { exact: true })).toBeVisible();
  await expect(page.getByText(brandName, { exact: true })).toBeVisible();
  await expect(page.getByText('7 unidades', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 22,50', { exact: true })).toBeVisible();
});
