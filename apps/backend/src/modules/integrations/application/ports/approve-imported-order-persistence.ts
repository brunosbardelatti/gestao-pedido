export interface ApproveImportedOrderItem {
  productId: string;
  quantityOrdered: number;
  catalogUnitPrice: string;
  purchaseUnitPrice: string;
  originalUnitPrice: string;
  expirationDate?: string;
}

export interface ApproveImportedOrderPersistenceInput {
  importedOrderId: string;
  userId: string;
  brandId: string;
  cycle: string;
  orderDate: string;
  notes?: string;
  items: ApproveImportedOrderItem[];
  requestId: string;
}

export interface ApproveImportedOrderResult {
  importedOrderId: string;
  orderId: string;
  status: string;
}

export interface ApproveImportedOrderPersistence {
  approve(
    input: ApproveImportedOrderPersistenceInput,
  ): Promise<ApproveImportedOrderResult>;
}
