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
    await Promise.all([consumers.init(), publishers.init()]);

    await publishers.publish('test', null, 20000, 'this is my delayed Message 1');
    await publishers.publish('test', null, 10000, 'this is my delayed Message 2');

    await consumers.subscribe('test', {}, 1, async (msg, msgRaw, ack) => {
      console.log('===', msg, '===', msgRaw, '===');
      await ack();
    });
  } catch (e) {
    console.log(e);
  }
}

bootstrap();
