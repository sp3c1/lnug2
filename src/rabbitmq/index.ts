import { Publishers } from './publisher';
import { Subscribers } from './consumer';
import { config } from '../config';

// https://duckbill.rmq.cloudamqp.com/#/

function bail(err) {
  console.error(err);
  process.exit(1);
}

// creating queues
const publishers = new Publishers(config, bail);
const consumers = new Subscribers(config, bail);

async function bootstrap() {
  try {
    await Promise.all([publishers.init(), consumers.init()]);
    await publishers.conditionalAttach('test', { 'x-dead-letter-exchange': 'WorkExchange', 'x-dead-letter-routing-key': 'rk1', 'x-max-priority': 10 });
    await publishers.conditionalAttach('test2', {});
    await publishers.attachExchange('WorkExchange', 'direct', {}, [{ queue: 'test2', routeKey: 'rk1' }]);

    // actuall publishing
    await publishers.publish('test', 'replyToQueue', { expiration: 10000, priority: 0 }, 'this is my delayed Message 4');
    await publishers.publish('test', 'replyToQueue', { expiration: 8000, priority: 0 }, 'this is my delayed Message 3');
    await publishers.publish('test', 'replyToQueue', { expiration: 4000, priority: 0 }, 'this is my delayed Message 2');
    await publishers.publish('test', 'replyToQueue', { expiration: 1000, priority: 0 }, 'this is my delayed Message 1');

    await consumers.subscribe('test2', {}, 10, (msg, msgRaw, ack) => {
      console.log('=============');
      console.log(msg, msgRaw);
      ack();
    });
  } catch (e) {
    console.log(e);
  }
}

bootstrap();
