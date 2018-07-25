import { PublisherAMQ100 as Publisher } from './publisher';
import { ConsumerAMQ100 as Consumer } from './consumer';
import { config } from '../config';

const publisher = new Publisher(config.queue.amq);
const consumer = new Consumer(config.queue.amq);

async function bootstrap() {
  try {
    await Promise.all([publisher.init(), consumer.init()]);

    await publisher.publish(new Buffer('this is my delayed Message 1'), 'lnug2', { AMQ_SCHEDULED_DELAY: 10000 });
    await publisher.publish(new Buffer('this is my delayed Message 2'), 'lnug2', { AMQ_SCHEDULED_DELAY: 10000 });
    await publisher.publish({ msg: 'this is my delayed Message 3' }, 'lnug2', { AMQ_SCHEDULED_DELAY: 10000 });
    await publisher.publish('this is my delayed Message 4', 'lnug2', { AMQ_SCHEDULED_DELAY: 5000 });

    await consumer.consume('lnug2', 1, async (msg, ack) => {
      console.log('=== typeof:', Buffer.isBuffer(msg.body) ? 'buffer' : typeof msg.body, '===', Buffer.isBuffer(msg.body) ? msg.body + ' => ' + msg.body.toString('utf-8') : msg.body, '===');
      await ack();
    });
  } catch (e) {
    console.log(e);
  }
}

bootstrap();
