import { expect, test } from '@playwright/test';

test('receives an open order and locks further changes', async ({ page }) => {
  const suffix = Date.now();
  const brandName = `Marca Recebimento ${suffix}`;
  const categoryName = `Categoria Recebimento ${suffix}`;
  const productCode = `REC-PED-${suffix}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/brands/new');
  await page.getByLabel('Nome da marca').fill(brandName);
  await page.getByRole('button', { name: 'Cadastrar marca' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Marca ${brandName} cadastrada.`,
  );

  await page.goto('/categories/new');
  await page.getByLabel('Nome da categoria').fill(categoryName);
  await page.getByRole('button', { name: 'Cadastrar categoria' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Categoria ${categoryName} cadastrada.`,
  );

  await page.goto('/products/new');
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Categoria').selectOption({ label: categoryName });
  await page.getByLabel('Código do produto').fill(productCode);
  await page.getByLabel('Descrição').fill('Produto para recebimento');
  await page.getByLabel('Preço de catálogo').fill('149,90');
  await page.getByLabel('Preço de compra').fill('89,00');
  await page.getByLabel('Preço original').fill('179,90');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Produto ${productCode} cadastrado.`,
  );

  await page.goto('/orders/new');
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Ciclo').fill('14/2026');
  await page
    .getByLabel('Produto do item 1')
    .selectOption({ label: `${productCode} · Produto para recebimento` });
  await page.getByLabel('Quantidade do item 1').fill('3');
  await page.getByRole('button', { name: 'Criar pedido' }).click();
  await page.getByRole('link', { name: 'Editar pedido' }).click();
  await page.getByRole('link', { name: 'Receber pedido' }).click();

  await expect(page.getByRole('heading', { name: 'Receber pedido' })).toBeVisible();
  await expect(
    page.getByLabel(`Quantidade recebida de ${productCode}`),
  ).toHaveValue('3');
  await page.getByLabel(`Validade de ${productCode}`).fill('2027-12-31');
  await page
    .getByRole('button', { name: 'Confirmar recebimento' })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Pedido do ciclo 14/2026 recebido.',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByRole('link', { name: 'Voltar para o pedido' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Este pedido já foi recebido.',
  );
  await expect(
    page.getByRole('button', { name: 'Salvar alterações' }),
  ).toHaveCount(0);
});
