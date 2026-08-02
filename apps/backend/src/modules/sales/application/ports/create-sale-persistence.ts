export type SalePaymentMethod =
  | 'CASH'
  | 'PIX'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'OTHER';

export interface PersistedSaleCustomer {
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

export interface PersistedSaleItem {
  id: string;
  productId: string;
  productCode: string;
  productDescription: string;
  quantity: number;
  unitPrice: string;
  unitCostSnapshot: string;
  subtotal: string;
}

export interface PersistedSale {
  id: string;
  customer: PersistedSaleCustomer | null;
  status: 'COMPLETED' | 'CANCELED';
  saleDate: string;
  paymentMethod: SalePaymentMethod | null;
  total: string;
  notes: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  items: PersistedSaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalePersistenceItemInput {
  productId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface CreateSalePersistenceInput {
  actorId: string;
  idempotencyKey: string;
  idempotencyScope: string;
  requestHash: string;
  customerId: string | null;
  paymentMethod: SalePaymentMethod | null;
  notes: string | null;
  confirmNegativeStock: boolean;
  total: string;
  items: CreateSalePersistenceItemInput[];
  requestId?: string;
}

export type CreateSalePersistenceResult =
  | { status: 'created' | 'replayed'; sale: PersistedSale }
  | { status: 'customer_not_found' }
  | { status: 'customer_inactive' }
  | { status: 'product_not_found' }
  | { status: 'product_inactive' }
  | { status: 'negative_stock_confirmation_required' }
  | { status: 'idempotency_conflict' }
  | { status: 'idempotency_in_progress' };

export interface CreateSalePersistence {
  createIdempotently(
    input: CreateSalePersistenceInput,
  ): Promise<CreateSalePersistenceResult>;
}
