import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

function utcDate(offset: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function formatBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

test('lists received items near expiration within the default window', async ({
  page,
}) => {
  const suffix = Date.now().toString().slice(-8);
  const api = 'http://127.0.0.1:3001/api/v1';

  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  const brand = (await (
    await page.request.post(`${api}/brands`, {
      data: { name: `Marca vencimento ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const category = (await (
    await page.request.post(`${api}/categories`, {
      data: { name: `Categoria vencimento ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const productCode = `REL-VEN-${suffix}`;
  const product = (await (
    await page.request.post(`${api}/products`, {
      data: {
        brandId: brand.data.id,
        categoryId: category.data.id,
        code: productCode,
        description: `Produto vencimento ${suffix}`,
        catalogPrice: '20.00',
        purchasePrice: '8.00',
        originalPrice: '20.00',
      },
    })
  ).json()) as { data: { id: string } };

  const expirationDate = utcDate(3);
  const order = (await (
    await page.request.post(`${api}/orders`, {
      headers: { 'Idempotency-Key': randomUUID() },
      data: {
        brandId: brand.data.id,
        cycle: `Ciclo vencimento ${suffix}`,
        orderDate: utcDate(-5),
        items: [
          {
            productId: product.data.id,
            quantityOrdered: 5,
            expirationDate,
          },
        ],
      },
    })
  ).json()) as { data: { id: string } };

  await page.request.post(`${api}/orders/${order.data.id}/receive`, {
    data: {
      items: [
        {
          productId: product.data.id,
          quantityReceived: 5,
        },
      ],
    },
  });

  await page
    .getByRole('link', { name: 'Produtos próximos do vencimento' })
    .click();
  await expect(page).toHaveURL('/reports/expirations');
  await expect(
    page.getByRole('heading', { name: 'Produtos próximos do vencimento' }),
  ).toBeVisible();

  await expect(page.getByText(productCode, { exact: true })).toBeVisible();
  await expect(
    page.getByText(formatBR(expirationDate), { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('5 unidades', { exact: true })).toBeVisible();
  await expect(page.getByText('3 dias', { exact: true })).toBeVisible();
  await expect(page.getByText('Vencimento iminente')).toBeVisible();
});
