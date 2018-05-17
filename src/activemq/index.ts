import { PublisherAMQ100 as Publisher } from './publisher';
import { ConsumerAMQ100 as Consumer } from './consumer';
import { config } from '../config';

const publisher = new Publisher(config.queue.amq);
const consumer = new Consumer(config.queue.amq);

async function bootstrap() {
  try {
    await Promise.all([publisher.init(), consumer.init()]);

    await publisher.publish(new Buffer('this is my delayed Message zero longer'), 'lnug2', { AMQ_SCHEDULED_DELAY: 10000 });
    await publisher.publish(new Buffer('this is my delayed Message zero longer'), 'lnug2', { AMQ_SCHEDULED_DELAY: 10000 });
    await publisher.publish(new Buffer('this is my delayed Message zero longer'), 'lnug2', { AMQ_SCHEDULED_DELAY: 10000 });
    await publisher.publish('this is my delayed Message zero', 'lnug2', { AMQ_SCHEDULED_DELAY: 5000 });

    await consumer.consume('lnug2', 1, (msg, ack) => {
      console.log('=== buffer: ', Buffer.isBuffer(msg), '===', Buffer.isBuffer(msg) ? msg.toString('utf-8') : msg, '===');
      ack();
    });
  } catch (e) {
    console.log(e);
  }
}

bootstrap();
