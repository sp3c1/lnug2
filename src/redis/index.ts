import { PublishersDelayed } from './publisher';
import { SubscribersDelayed } from './consumer';
import { config } from '../config';

function bail(err) {
  console.error(err);
  process.exit(1);
}

const publishers = new PublishersDelayed(config, bail);
const consumers = new SubscribersDelayed(config, bail);

async function bootstrap() {
  try {
    Promise.all([publishers.init(), consumers.init()]);

    publishers.init().then(async () => {
      await publishers.publish('test', null, 20000, 'this is my delayed Message zero longer');
      await publishers.publish('test', null, 10000, 'this is my delayed Message zero');

      await consumers.subscribe('test', {}, 1, (msg, msgRaw, ack) => {
        console.log('===', msg, '===', msgRaw, '===');
        ack();
        // subscribers.closeConnection();
      });
    });
  } catch (e) {}
}

bootstrap();
