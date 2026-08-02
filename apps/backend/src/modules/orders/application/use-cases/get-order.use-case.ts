import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';
import type { PersistedOrder } from '../ports/create-order-persistence';
import type { GetOrderPersistence } from '../ports/get-order-persistence';

export class GetOrderUseCase {
  constructor(private readonly persistence: GetOrderPersistence) {}

  async execute(orderId: string): Promise<PersistedOrder> {
    const order = await this.persistence.findById(orderId);
    if (!order) throw new OrderNotFoundError();

    return order;
  }
}
