import { cookies } from 'next/headers';

export interface CustomerDetails {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomerResponse {
  data: CustomerDetails;
}

export interface CustomerListQuery {
  search?: string;
  cpf?: string;
  phone?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CustomerListResult {
  customers: CustomerDetails[];
  meta: CustomerListMeta;
}

interface CustomerListResponse {
  data: CustomerDetails[];
  meta: CustomerListMeta;
}

const apiUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getCustomer(
  customerId: string,
): Promise<CustomerDetails | null> {
  const cookieStore = await cookies();

  try {
    const response = await fetch(`${apiUrl}/api/v1/customers/${customerId}`, {
      headers: { Cookie: cookieStore.toString() },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return ((await response.json()) as CustomerResponse).data;
  } catch {
    return null;
  }
}

export async function listCustomers(
  query: CustomerListQuery,
): Promise<CustomerListResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams();
  if (query.search) searchParams.set('search', query.search);
  if (query.cpf) searchParams.set('cpf', query.cpf);
  if (query.phone) searchParams.set('phone', query.phone);
  searchParams.set('page', String(query.page ?? 1));
  searchParams.set('pageSize', String(query.pageSize ?? 20));

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/customers?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as CustomerListResponse;
    return { customers: body.data, meta: body.meta };
  } catch {
    return null;
  }
}
