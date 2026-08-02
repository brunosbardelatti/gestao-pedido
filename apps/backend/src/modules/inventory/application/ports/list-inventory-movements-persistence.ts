export type InventoryMovementKind =
  | 'PURCHASE'
  | 'SALE'
  | 'SALE_CANCELLATION'
  | 'CORRECTION'
  | 'PERSONAL_USE'
  | 'RETURN';

export interface InventoryMovementRecord {
  id: string;
  productId: string;
  type: InventoryMovementKind;
  quantityDelta: number;
  reason: string | null;
  orderItemId: string | null;
  saleItemId: string | null;
  createdBy: {
    id: string;
    name: string;
    login: string;
    role: 'ADMIN' | 'OPERATOR';
    active: boolean;
  };
  createdAt: string;
}

export interface ListInventoryMovementsPersistenceInput {
  page: number;
  pageSize: number;
  productId?: string;
  type?: InventoryMovementKind;
  startDate?: string;
  endDate?: string;
}

export interface ListInventoryMovementsPersistenceResult {
  items: InventoryMovementRecord[];
  total: number;
}

export interface ListInventoryMovementsPersistence {
  list(
    input: ListInventoryMovementsPersistenceInput,
  ): Promise<ListInventoryMovementsPersistenceResult>;
}
