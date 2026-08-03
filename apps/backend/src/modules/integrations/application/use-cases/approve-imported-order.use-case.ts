import type {
  ApproveImportedOrderItem,
  ApproveImportedOrderPersistence,
  ApproveImportedOrderResult,
} from '../ports/approve-imported-order-persistence';

export interface ApproveImportedOrderInput {
  importedOrderId: string;
  userId: string;
  brandId: string;
  cycle: string;
  orderDate: string;
  notes?: string;
  items: ApproveImportedOrderItem[];
  requestId: string;
}

export class ApproveImportedOrderUseCase {
  constructor(
    private readonly persistence: ApproveImportedOrderPersistence,
  ) {}

  async execute(
    input: ApproveImportedOrderInput,
  ): Promise<ApproveImportedOrderResult> {
    return this.persistence.approve({
      importedOrderId: input.importedOrderId,
      userId: input.userId,
      brandId: input.brandId,
      cycle: input.cycle,
      orderDate: input.orderDate,
      notes: input.notes,
      items: input.items,
      requestId: input.requestId,
    });
  }
}
