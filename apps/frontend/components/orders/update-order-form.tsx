'use client';

import { useRouter } from 'next/navigation';

import {
  OrderForm,
  type OrderFormInitialValues,
  type OrderFormProps,
} from './create-order-form';

interface UpdateOrderFormProps
  extends Pick<OrderFormProps, 'brands' | 'products' | 'referenceError'> {
  orderId: string;
  initialValues: OrderFormInitialValues;
}

export function UpdateOrderForm({
  orderId,
  ...props
}: UpdateOrderFormProps): React.JSX.Element {
  const router = useRouter();

  return (
    <OrderForm
      intent="update"
      orderId={orderId}
      onUpdated={() => router.refresh()}
      {...props}
    />
  );
}
