import type { CustomerDetails } from './customers';
import { listCustomers } from './customers';
import { getCurrentStock } from './inventory';
import { listProducts } from './products';

export interface SaleProductReference {
  id: string;
  code: string;
  description: string;
  suggestedSalePrice: string;
  balance: number;
}

export interface SaleCustomerReference {
  id: string;
  name: string;
}

export interface SaleCatalog {
  products: SaleProductReference[];
  customers: SaleCustomerReference[];
}

export async function getSaleCatalog(): Promise<SaleCatalog | null> {
  const [firstProducts, firstStock, firstCustomers] = await Promise.all([
    listProducts({ active: true, page: 1, pageSize: 100 }),
    getCurrentStock({ page: 1, pageSize: 100 }),
    listCustomers({ page: 1, pageSize: 100 }),
  ]);
  if (!firstProducts || !firstStock || !firstCustomers) return null;

  const [productPages, stockPages, customerPages] = await Promise.all([
    Promise.all(
      Array.from({ length: firstProducts.meta.totalPages - 1 }, (_, index) =>
        listProducts({ active: true, page: index + 2, pageSize: 100 }),
      ),
    ),
    Promise.all(
      Array.from({ length: firstStock.meta.totalPages - 1 }, (_, index) =>
        getCurrentStock({ page: index + 2, pageSize: 100 }),
      ),
    ),
    Promise.all(
      Array.from({ length: firstCustomers.meta.totalPages - 1 }, (_, index) =>
        listCustomers({ page: index + 2, pageSize: 100 }),
      ),
    ),
  ]);
  if (
    productPages.some((page) => !page) ||
    stockPages.some((page) => !page) ||
    customerPages.some((page) => !page)
  ) {
    return null;
  }

  const balances = new Map(
    [
      ...firstStock.balances,
      ...stockPages.flatMap((page) => page?.balances ?? []),
    ].map((balance) => [balance.productId, balance.balance]),
  );
  const products = [
    ...firstProducts.products,
    ...productPages.flatMap((page) => page?.products ?? []),
  ];
  const customers: CustomerDetails[] = [
    ...firstCustomers.customers,
    ...customerPages.flatMap((page) => page?.customers ?? []),
  ];

  return {
    products: products.map((product) => ({
      id: product.id,
      code: product.code,
      description: product.description,
      suggestedSalePrice:
        product.suggestedSalePrice ?? product.catalogPrice,
      balance: balances.get(product.id) ?? 0,
    })),
    customers: customers
      .filter((customer) => customer.active)
      .map((customer) => ({ id: customer.id, name: customer.name })),
  };
}
