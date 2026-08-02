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

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
