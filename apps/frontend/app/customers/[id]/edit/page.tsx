import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { UpdateCustomerForm } from '@/components/customers/update-customer-form';
import { AppHeader } from '@/components/layout/app-header';
import { getCurrentUser } from '@/lib/auth';
import { getCustomer } from '@/lib/customers';

interface EditCustomerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({
  params,
}: EditCustomerPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <main className="min-h-screen min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/customers/new"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para cadastro
        </Link>
        <div className="mt-8">
          <p className="section-kicker">Clientes</p>
          <h1 className="mt-2 text-2xl font-semibold">Editar cliente</h1>
          <UpdateCustomerForm
            customerId={customer.id}
            initialValues={{
              name: customer.name,
              cpf: customer.cpf ?? '',
              phone: customer.phone ?? '',
              addressLine: customer.addressLine ?? '',
              city: customer.city ?? '',
              state: customer.state ?? '',
              postalCode: customer.postalCode ?? '',
            }}
          />
        </div>
      </section>
    </main>
  );
}
