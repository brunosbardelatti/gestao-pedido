import type { CatalogOption } from '@/lib/catalog';

import { ProductForm } from './product-form';

interface CreateProductFormProps {
  brands: CatalogOption[];
  categories: CatalogOption[];
  referenceError?: string;
}

export function CreateProductForm(
  props: CreateProductFormProps,
): React.JSX.Element {
  return <ProductForm intent="create" {...props} />;
}
