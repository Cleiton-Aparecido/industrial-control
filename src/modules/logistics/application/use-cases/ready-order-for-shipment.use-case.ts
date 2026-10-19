import { Injectable } from '@nestjs/common';
import { LogisticsService } from '../services/logistics.service';

@Injectable()
export class ReadyOrderForShipmentUseCase {
  constructor(private readonly logistics: LogisticsService) {}

  execute(orderId: string, actorId: string, notes?: string) {
    return this.logistics.readyForShipment(orderId, actorId, notes);
  }
}
