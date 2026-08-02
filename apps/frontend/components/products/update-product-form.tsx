import type { CatalogOption } from '@/lib/catalog';

import {
  ProductForm,
  type ProductFormInitialValues,
} from './product-form';

interface UpdateProductFormProps {
  productId: string;
  brands: CatalogOption[];
  categories: CatalogOption[];
  initialValues: ProductFormInitialValues;
  referenceError?: string;
}

export function UpdateProductForm({
  productId,
  ...props
}: UpdateProductFormProps): React.JSX.Element {
  return <ProductForm intent="update" productId={productId} {...props} />;
}
