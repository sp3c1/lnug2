import * as rmq from 'amqplib';

export class Publishers {
  protected list: Publisher[] = [];
  protected exchanges: Exchange[] = [];
  protected ch: any = null;
  public conn: any = null;

  // this.config.queue.rmq.url !!
  constructor(public config: any, public bailFnc: Function) {}

  async init(conn?: any, ch?: any): Promise<any> {
    try {
      if (conn) {
        this.conn = conn;
      } else {
        this.conn = await rmq.connect(this.config.queue.rmq.url);
      }

      if (ch) {
        this.ch = ch;
      } else {
        this.ch = await this.conn.createChannel();
      }
    } catch (e) {
      this.bailFnc(e);
    }
  }

  public at(publisher: string): Publisher {
    if (this.conditionalAttach(publisher)) {
      return this.list[publisher];
    }

    return <Publisher>null;
  }

  async publish(queue: string, replyTo: string, options: any, data: string): Promise<void> {
    await this.conditionalAttach(queue);
    // options.replyTo = replyTo;
    // options["x-dead-letter-exchange"] = queue;
    // options["x-dead-letter-routing-key"] = replyTo;
    // options["expiration"] = 5000;
    // data = JSON.stringify(data); // now its a string, casting later for TS to pick up
    return this.list[queue].sendToQueue(data, options);
  }

  async conditionalAttach(queue: string, options: any = {}): Promise<any> {
    if (!this.list[queue]) {
      this.list[queue] = new Publisher(this.conn, this.ch, queue, options);
      await this.list[queue].init();
    }
  }

  async attachExchange(name: string, type: string = 'direct', options: any = {}, bindings: any = {}): Promise<any> {
    if (!this.exchanges[name]) {
      this.exchanges[name] = new Exchange(this.conn, this.ch, name, type, options, bindings);
      await this.exchanges[name].init();
    }
  }

  closeChannel(): Promise<void> {
    return this.ch.close();
  }

  closeConnection(): Promise<void> {
    return this.conn.close();
  }
}

export class Exchange {
  constructor(protected conn: any, protected ch: any, protected exchange: string, protected type: string = 'direct', protected options: any = {}, protected bindings: any[] = []) {}
  async init(): Promise<any> {
    const opts = Object.assign({ durable: true });
    await this.ch.assertExchange(this.exchange, this.type, opts);
    for (const i in this.bindings) {
      await this.ch.bindQueue(this.bindings[i].queue, this.exchange, this.bindings[i].routeKey, {});
    }
  }
}

export class Publisher {
  constructor(conn: any, protected ch: any, protected channel: string, protected options: any = {}) {}

  async init(): Promise<void> {
    const opts: any = <any>Object.assign({}, this.options);
    return this.ch.assertQueue(this.channel, { arguments: opts });
  }

  sendToQueue(msg: string, option?: Object): Promise<void> {
    return this.ch.sendToQueue(this.channel, new Buffer(<string>msg), option);
  }
}
