export interface InventoryBalance {
  productId: string;
  productCode: string;
  description: string;
  brandName: string;
  balance: number;
  suggestedSalePrice?: string;
}

export interface GetCurrentStockPersistenceInput {
  page: number;
  pageSize: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  negativeOnly: boolean;
}

export interface GetCurrentStockPersistenceResult {
  items: InventoryBalance[];
  total: number;
}

export interface GetCurrentStockPersistence {
  listBalances(
    input: GetCurrentStockPersistenceInput,
  ): Promise<GetCurrentStockPersistenceResult>;
}
