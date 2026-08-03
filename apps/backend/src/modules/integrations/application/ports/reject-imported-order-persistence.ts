export interface RejectImportedOrderPersistenceInput {
  importedOrderId: string;
  userId: string;
  reason: string;
  requestId: string;
}

export interface RejectImportedOrderPersistence {
  reject(input: RejectImportedOrderPersistenceInput): Promise<void>;
}
