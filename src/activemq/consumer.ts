import { Amqp100Implementations } from './base';
import * as Rhea from 'rhea/typings';

export class ConsumerAMQ100 extends Amqp100Implementations {
  constructor(public config: any) {
    super(config, 'consumer');
  }

  async consume(queue: string = 'default', prefetch: number | string = 1, callback: (message: Rhea.Message, ackMessage: () => Promise<any>) => void): Promise<void> {
    await this.createQueue(queue, { prefetch });

    this.container.on('message', context => {
      callback(<Rhea.Message>context.message, async () => {
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
