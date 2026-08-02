import { expect, test } from '@playwright/test';

test('registers a sale and requires confirmation for negative stock', async ({ page }) => {
  test.setTimeout(90_000);
  const suffix = Date.now().toString().slice(-8);
  const brandName = `Marca venda ${suffix}`;
  const categoryName = `Categoria venda ${suffix}`;
  const productCode = `VEN-${suffix}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/brands/new');
  await page.getByLabel('Nome da marca').fill(brandName);
  await page.getByRole('button', { name: 'Cadastrar marca' }).click();
  await page.goto('/categories/new');
  await page.getByLabel('Nome da categoria').fill(categoryName);
  await page.getByRole('button', { name: 'Cadastrar categoria' }).click();
  await page.goto('/products/new');
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Categoria').selectOption({ label: categoryName });
  await page.getByLabel('Código').fill(productCode);
  await page.getByLabel('Descrição').fill(`Produto venda ${suffix}`);
  await page.getByLabel('Preço de catálogo').fill('15');
  await page.getByLabel('Preço de compra').fill('6');
  await page.getByLabel('Preço original').fill('15');
  await page.getByLabel('Preço sugerido de venda').fill('12');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();

  await page.goto('/inventory/adjustments/new');
  const adjustmentProductId = await page
    .getByLabel('Produto')
    .locator('option', { hasText: productCode })
    .getAttribute('value');
  await page.getByLabel('Produto').selectOption(adjustmentProductId!);
  await page.getByLabel('Quantidade', { exact: true }).fill('1');
  await page.getByLabel('Motivo').fill('Estoque inicial para venda');
  await page.getByRole('button', { name: 'Registrar ajuste' }).click();

  await page.goto('/');
  await page.getByRole('link', { name: 'Registrar venda' }).click();
  await expect(page).toHaveURL('/sales/new');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel('Forma de pagamento').selectOption('PIX');
  const saleProductId = await page
    .getByLabel('Produto do item 1')
    .locator('option', { hasText: productCode })
    .getAttribute('value');
  await page.getByLabel('Produto do item 1').selectOption(saleProductId!);
  await page.getByLabel('Quantidade do item 1').fill('2');
  await expect(
    page.getByRole('alert').filter({ hasText: 'A venda deixará' }),
  ).toContainText('A venda deixará 1 unidade abaixo de zero.');
  await expect(page.getByRole('button', { name: 'Registrar venda' })).toBeDisabled();
  await page.getByLabel('Confirmo a venda mesmo com estoque negativo.').check();
  await page.getByRole('button', { name: 'Registrar venda' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Venda registrada no total de R$ 24,00.',
  );

  await page.goto(`/inventory?search=${productCode}`);
  await expect(page.getByText('-1 unidade', { exact: true })).toBeVisible();
});
