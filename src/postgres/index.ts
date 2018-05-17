import { PublishersDelayed } from './publisher';
import { SubscribersDelayed } from './consumer';
import { config } from '../config';

function bail(err) {
  console.error(err);
  process.exit(1);
}

// creating queues http://127.0.0.1:62546/browser/
const publishers = new PublishersDelayed(config, bail);
const consumers = new SubscribersDelayed(config, bail);

async function bootstrap() {
  try {
    await Promise.all([consumers.init(), publishers.init()]);

    await publishers.publish('test', null, 20000, 'this is my delayed Message zero longer');
    await publishers.publish('test', null, 10000, 'this is my delayed Message zero');

    await consumers.subscribe('test', {}, 1, (msg, msgRaw, ack) => {
      console.log('===', msg, '===', msgRaw, '===');
      ack();
      // subscribers.closeConnection();
    });
  } catch (e) {
    console.log(e);
  }
}

bootstrap();
