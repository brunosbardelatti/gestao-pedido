import type {
  NormalizedOrderItem,
} from '../normalize-order-input';
import type { PersistedOrder } from './create-order-persistence';

export interface UpdateOrderPersistenceInput {
  actorId: string;
  orderId: string;
  brandId: string;
  cycle: string;
  orderDate: string;
  notes: string | null;
  items: NormalizedOrderItem[];
  requestId?: string;
}

export type UpdateOrderPersistenceResult =
  | { status: 'updated'; order: PersistedOrder }
  | { status: 'not_found' }
  | { status: 'not_editable' }
  | { status: 'brand_not_found' }
  | { status: 'brand_inactive' }
  | { status: 'product_not_found' }
  | { status: 'product_inactive' }
  | { status: 'brand_mismatch' };

export interface UpdateOrderPersistence {
  updateWithAudit(
    input: UpdateOrderPersistenceInput,
  ): Promise<UpdateOrderPersistenceResult>;
}
