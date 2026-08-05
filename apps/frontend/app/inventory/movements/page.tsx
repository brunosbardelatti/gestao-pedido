import { AlertCircle, ArrowLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { InventoryMovementList } from '@/components/inventory/inventory-movement-list';
import { AppHeader } from '@/components/layout/app-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { getCurrentUser } from '@/lib/auth';
import {
  getInventoryProducts,
  listInventoryMovements,
  type InventoryMovementQuery,
  type InventoryMovementResult,
  type InventoryMovementType,
} from '@/lib/inventory';

interface InventoryMovementsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const movementTypes: InventoryMovementType[] = [
  'PURCHASE',
  'SALE',
  'SALE_CANCELLATION',
  'CORRECTION',
  'PERSONAL_USE',
  'RETURN',
];

function parseType(value: string | undefined): InventoryMovementType | undefined {
  return movementTypes.find((type) => type === value);
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): InventoryMovementQuery {
  const rawPage = Number(stringParam(params.page));

  return {
    productId: stringParam(params.productId) || undefined,
    type: parseType(stringParam(params.type)),
    startDate: stringParam(params.startDate) || undefined,
    endDate: stringParam(params.endDate) || undefined,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: 20,
  };
}

const emptyResult: InventoryMovementResult = {
  movements: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function InventoryMovementsPage({
  searchParams,
}: InventoryMovementsPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const [result, productsResult] = await Promise.all([
    listInventoryMovements(query),
    getInventoryProducts(),
  ]);
  const history = result ?? {
    ...emptyResult,
    meta: { ...emptyResult.meta, page: query.page ?? 1 },
  };
  const products = productsResult ?? [];

  return (
    <main className="min-h-screen min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/inventory"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para saldos
        </Link>

        <div className="mt-8">
          <p className="section-kicker">Estoque</p>
          <h1 className="mt-2 text-2xl font-semibold">Movimentações</h1>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.4fr)_1fr_0.9fr_0.9fr_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="movement-product-filter">Produto</Label>
            <NativeSelect
              id="movement-product-filter"
              name="productId"
              defaultValue={query.productId ?? ''}
            >
              <option value="">Todos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} · {product.description}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="movement-type-filter">Tipo</Label>
            <NativeSelect
              id="movement-type-filter"
              name="type"
              defaultValue={query.type ?? ''}
            >
              <option value="">Todos</option>
              <option value="PURCHASE">Compra</option>
              <option value="SALE">Venda</option>
              <option value="SALE_CANCELLATION">Cancelamento de venda</option>
              <option value="CORRECTION">Correção</option>
              <option value="PERSONAL_USE">Uso pessoal</option>
              <option value="RETURN">Devolução</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="movement-start-date-filter">Data inicial</Label>
            <Input
              id="movement-start-date-filter"
              name="startDate"
              type="date"
              defaultValue={query.startDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="movement-end-date-filter">Data final</Label>
            <Input
              id="movement-end-date-filter"
              name="endDate"
              type="date"
              defaultValue={query.endDate}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Filtrar
            </Button>
            <Link
              href="/inventory/movements"
              aria-label="Limpar filtros"
              title="Limpar filtros"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <X className="size-4" aria-hidden />
            </Link>
          </div>
        </form>

        {!result ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Não foi possível carregar as movimentações.</span>
          </div>
        ) : null}

        <div className="mt-7">
          <InventoryMovementList
            movements={history.movements}
            products={products}
            meta={history.meta}
            query={query}
          />
        </div>
      </section>
    </main>
  );
}
