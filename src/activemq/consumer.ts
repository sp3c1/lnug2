import { Amqp100Implementations } from './base';

export class ConsumerAMQ100 extends Amqp100Implementations {
  constructor(public config: any) {
    super(config, 'consumer');
  }

  async consume(queue: string = 'default', prefetch: number | string = 1, callback: (message: string, ackMessage: () => Promise<any>) => void): Promise<void> {
    await this.createQueue(queue, { prefetch });

    this.container.on('message', context => {
      callback(context.message.body, async () => {
        context.delivery.accept();
        context.receiver.add_credit(1);
        try {
          global.gc();
        } catch (e) {
          // console.log('no gc ');
        }
      });
    });
  }
}
