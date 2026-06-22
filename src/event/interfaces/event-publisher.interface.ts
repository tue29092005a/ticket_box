export const EVENT_PUBLISHER = 'EVENT_PUBLISHER';

export interface IEventPublisher {
  publish(topic: string, data: any): Promise<void>;
}
