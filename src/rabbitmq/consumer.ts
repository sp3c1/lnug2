import * as rmq from 'amqplib';

export class Subscribers {
  public conn: any = null;
  public list: Subscriber[] = [];

  constructor(public config: any, public bailFnc: Function) {}

  async init(conn?: any): Promise<any> {
    try {
      if (conn) {
        this.conn = conn;
      } else {
        this.conn = await rmq.connect(this.config.queue.rmq.url);
      }
    } catch (e) {
      this.bailFnc(e);
    }
  }

  public async subscribe(queueName: string, options: any, prefetch: any, callback: (parsed: any, raw: any, ack: () => void) => void) {
    await this.conditionalAttach(queueName, options, prefetch);
    this.list[queueName].subscribe(queueName, callback);
  }

  async conditionalAttach(queue: string, options: any = {}, prefetch: number = 1): Promise<any> {
    if (!this.list[queue]) {
      this.list[queue] = new Subscriber(this.conn, options);
      await this.list[queue].init(queue, prefetch);
    }
  }

  closeConnection(): Promise<void> {
    return this.conn.close();
  }

  closeChannels(): Promise<any> {
    let promiseArr: Promise<void>[] = [];
    for (let subscriber of this.list) {
      promiseArr.push(subscriber.closeChannel());
    }

    return Promise.all(promiseArr);
  }
}

export class Subscriber {
  protected ch;
  constructor(public conn: any, protected options) {}

  async init(queue: string = 'default', prefetch: number = 1): Promise<void> {
    this.ch = await this.conn.createChannel();
    const opts: any = <any>Object.assign({}, this.options);

    await this.ch.assertQueue(queue, { arguments: opts });
    await this.ch.prefetch(prefetch);
  }

  subscribe(queue: string, callback) {
    this.ch.consume(queue, msg => {
      if (msg !== null) {
        let base = msg.content.toString();
        let parsedJson = '';

        try {
          parsedJson = JSON.parse(base);
        } catch (e) {
          // ignore
        }

        callback(parsedJson, base, async () => {
          await this.ch.ack(msg);
        });
      }
    });
  }

  public closeChannel(): Promise<void> {
    return this.ch.close();
  }
}
