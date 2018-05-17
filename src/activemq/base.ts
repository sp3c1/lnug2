import * as rheaMod from 'rhea';

/**
 * This implementation at the moment have limitation to one  queue per instance. Nothing stops us however to spawn more.
 *
 * @export
 * @class Amqp100Implementations
 */
export class Amqp100Implementations {
  protected container: any = null;
  private connected: -1 | 0 | 1 = -1;
  protected context: any;
  protected handler: any;
  private queue: string = null;

  constructor(public config: any = {}, private mode: 'consumer' | 'publisher') {}

  init(errHandler: (err: any) => {} = null, config: any = null): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.connected === 0) {
        return reject('Already initiating connection');
      }

      if (this.connected === 1) {
        return resolve();
      }

      this.connected = 0;
      this.container = rheaMod.create_container(config || this.config).create_connection(config || this.config);

      this.container.on('connection_open', context => {
        this.connected = 1;
        this.context = context;
        resolve();
      });

      this.container.connect();
    });
  }

  createQueue(queue: string = 'default', attributes: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.queue !== null) {
        return resolve(); // 'Handling only one consumer/publisher a time'
      }

      this.queue = queue;

      if (this.mode === 'consumer') {
        this.container.once('receiver_open', contextCreateQueue => {
          const flow = !attributes || attributes.prefetch > 10 || attributes.prefetch < 0 ? 1 : attributes.prefetch || 1;
          contextCreateQueue.receiver.flow(flow);
          resolve();
        });

        this.context.connection.open_receiver({
          source: { address: queue, durable: false },
          credit_window: 0,
          autoaccept: false,
        });
      } else {
        this.container.on('sendable', contextPublisher => {
          this.handler = contextPublisher.sender;
          resolve();
        });
        this.context.connection.open_sender({ target: { address: queue, durable: true } });
      }
    });
  }
}
