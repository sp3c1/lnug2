import { Amqp100Implementations } from './base';
import * as Rhea from 'rhea/typings';

export class PublisherAMQ100 extends Amqp100Implementations {
  constructor(public config: any) {
    super(config, 'publisher');
  }

  async publish(message: string | Buffer, queue: string = 'default', options: any = {}): Promise<any> {
    await this.createQueue(queue);

    return this.handler.send(<Rhea.Message>{ body: message, application_properties: options });
  }
}
