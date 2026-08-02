import type {
  InventoryMovementKind,
  InventoryMovementRecord,
  ListInventoryMovementsPersistence,
} from '../ports/list-inventory-movements-persistence';

export interface ListInventoryMovementsInput {
  page: number;
  pageSize: number;
  productId?: string;
  type?: InventoryMovementKind;
  startDate?: string;
  endDate?: string;
}

export interface ListInventoryMovementsOutput {
  items: InventoryMovementRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ListInventoryMovementsUseCase {
  constructor(
    private readonly persistence: ListInventoryMovementsPersistence,
  ) {}

  async execute(
    input: ListInventoryMovementsInput,
  ): Promise<ListInventoryMovementsOutput> {
    const result = await this.persistence.list({
      page: input.page,
      pageSize: input.pageSize,
      productId: input.productId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    return {
      items: result.items,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize),
      },
    };
  }
}
