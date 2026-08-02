import { expect, test } from '@playwright/test';

test('requires confirmation and records a negative stock adjustment', async ({
  page,
}) => {
  const suffix = Date.now();
  const brandName = `Marca Ajuste ${suffix}`;
  const categoryName = `Categoria Ajuste ${suffix}`;
  const productCode = `AJU-${suffix}`;
  const apiUrl = 'http://127.0.0.1:3001/api/v1';

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  const brandResponse = await page.request.post(`${apiUrl}/brands`, {
    data: { name: brandName },
  });
  const brandId = (await brandResponse.json()).data.id as string;
  const categoryResponse = await page.request.post(`${apiUrl}/categories`, {
    data: { name: categoryName },
  });
  const categoryId = (await categoryResponse.json()).data.id as string;
  const productResponse = await page.request.post(`${apiUrl}/products`, {
    data: {
      brandId,
      categoryId,
      code: productCode,
      description: 'Produto para ajuste negativo',
      catalogPrice: '100.00',
      purchasePrice: '60.00',
      originalPrice: '120.00',
    },
  });
  expect(productResponse.ok()).toBe(true);

  await page.goto('/inventory/adjustments/new');
  await page
    .getByLabel('Produto')
    .selectOption({ label: `${productCode} · Produto para ajuste negativo` });
  await page.getByLabel('Tipo de ajuste').selectOption('PERSONAL_USE');
  await page.getByLabel('Quantidade').fill('-2');
  await page.getByLabel('Motivo').fill('Uso em demonstração');

  await expect(
    page.getByText('Este ajuste deixará o estoque negativo.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Registrar ajuste' }),
  ).toBeDisabled();
  await page.getByLabel('Confirmo o saldo negativo').check();
  await page.getByRole('button', { name: 'Registrar ajuste' }).click();

  await expect(page.getByRole('status')).toContainText(
    `Ajuste de -2 unidades registrado para ${productCode}.`,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.goto(`/inventory?search=${productCode}`);
  await expect(page.getByText(productCode, { exact: true })).toBeVisible();
  await expect(page.getByText('-2 unidades')).toBeVisible();
  await expect(page.getByText('Estoque negativo')).toBeVisible();
});
