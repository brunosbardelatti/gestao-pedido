import { expect, test } from '@playwright/test';

test('cancels a completed sale and restores its stock', async ({ page }) => {
  test.setTimeout(90_000);
  const suffix = Date.now().toString().slice(-8);
  const brandName = `Marca estorno ${suffix}`;
  const categoryName = `Categoria estorno ${suffix}`;
  const productCode = `EST-VEN-${suffix}`;

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
  await page.getByLabel('Descrição').fill(`Produto estorno ${suffix}`);
  await page.getByLabel('Preço de catálogo').fill('15');
  await page.getByLabel('Preço de compra').fill('6');
  await page.getByLabel('Preço original').fill('15');
  await page.getByLabel('Preço sugerido de venda').fill('12');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();

  await page.goto('/inventory/adjustments/new');
  const productId = await page
    .getByLabel('Produto')
    .locator('option', { hasText: productCode })
    .getAttribute('value');
  await page.getByLabel('Produto').selectOption(productId!);
  await page.getByLabel('Quantidade', { exact: true }).fill('2');
  await page.getByLabel('Motivo').fill('Estoque para testar estorno');
  await page.getByRole('button', { name: 'Registrar ajuste' }).click();

  await page.goto('/sales/new');
  await page.getByLabel('Produto do item 1').selectOption(productId!);
  await page.getByLabel('Quantidade do item 1').fill('2');
  await page.getByRole('button', { name: 'Registrar venda' }).click();
  await expect(page.getByRole('status')).toContainText('Venda registrada');
  await page.getByRole('button', { name: 'Cancelar venda' }).click();
  await page.getByLabel('Motivo do cancelamento').fill('Cliente desistiu');
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'cancelada' }),
  ).toContainText('Venda de R$ 24,00 cancelada. O estoque foi recomposto.');

  await page.goto(`/inventory?search=${productCode}`);
  await expect(page.getByText('2 unidades', { exact: true })).toBeVisible();
});
