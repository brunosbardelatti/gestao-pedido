import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DeactivateCategoryButton } from '@/components/categories/deactivate-category-button';
import { UpdateCategoryForm } from '@/components/categories/update-category-form';
import { AppHeader } from '@/components/layout/app-header';
import { getCurrentUser } from '@/lib/auth';

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    name?: string | string[];
    active?: string | string[];
  }>;
}

export default async function EditCategoryPage({
  params,
  searchParams,
}: EditCategoryPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const query = await searchParams;
  const initialName = typeof query.name === 'string' ? query.name.slice(0, 100) : '';
  const initialActive = query.active !== 'false';

  return (
    <main className="min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/categories/new"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para cadastro
        </Link>
        <div className="mt-8">
          <p className="section-kicker">Catálogo</p>
          <h1 className="mt-2 text-2xl font-semibold">Editar categoria</h1>
          <UpdateCategoryForm
            key={`${id}-${initialActive}`}
            categoryId={id}
            initialName={initialName}
            initialActive={initialActive}
          />
          <DeactivateCategoryButton
            categoryId={id}
            categoryName={initialName}
            initialActive={initialActive}
          />
        </div>
      </section>
    </main>
  );
}
