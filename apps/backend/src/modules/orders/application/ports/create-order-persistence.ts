export interface PersistedOrderBrand {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedOrderItem {
  id: string;
  productId: string;
  productCode: string;
  productDescription: string;
  quantityOrdered: number;
  quantityReceived: number;
  catalogUnitPrice: string;
  purchaseUnitPrice: string;
  originalUnitPrice: string;
  expirationDate: string | null;
  notes: string | null;
}

export interface PersistedOrder {
  id: string;
  brand: PersistedOrderBrand;
  cycle: string;
  orderDate: string;
  receivedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  status: 'OPEN' | 'RECEIVED' | 'CANCELED';
  notes: string | null;
  items: PersistedOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPersistenceItemInput {
  productId: string;
  quantityOrdered: number;
  catalogUnitPrice: string;
  purchaseUnitPrice: string;
  originalUnitPrice: string;
  notes: string | null;
}

export interface CreateOrderPersistenceInput {
  actorId: string;
  idempotencyKey: string;
  idempotencyScope: string;
  requestHash: string;
  brandId: string;
  cycle: string;
  orderDate: string;
  notes: string | null;
  items: CreateOrderPersistenceItemInput[];
  requestId?: string;
}

export type CreateOrderPersistenceResult =
  | { status: 'created'; order: PersistedOrder }
  | { status: 'replayed'; order: PersistedOrder }
  | { status: 'brand_not_found' }
  | { status: 'product_not_found' }
  | { status: 'brand_inactive' }
  | { status: 'product_inactive' }
  | { status: 'brand_mismatch' }
  | { status: 'idempotency_conflict' }
  | { status: 'idempotency_in_progress' };

export interface CreateOrderPersistence {
  createIdempotently(
    input: CreateOrderPersistenceInput,
  ): Promise<CreateOrderPersistenceResult>;
}
