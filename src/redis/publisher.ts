import * as redis from 'redis';
import * as promisify from 'util-promisifyall';

promisify(redis.RedisClient.prototype);
promisify(redis.Multi.prototype);

export class PublishersDelayed {
  protected list: PublisherDelayed[] = [];
  public conn: any = null;

  // this.config.queue.rmq.url !!
  constructor(public config: any, public bailFnc: Function) {}

  async init(conn?: any): Promise<any> {
    try {
      if (conn) {
        this.conn = conn;
      } else {
        this.conn = await redis.createClient(this.config.queue.redis.url);
        this.conn.on('error', this.bailFnc);
      }
    } catch (e) {
      this.bailFnc(e);
    }
  }

  async publish(queue: string, replyTo: string, delay: any = 0, data: string): Promise<void> {
    await this.conditionalAttach(queue);
    return this.list[queue].sendToQueue(data, delay);
  }

  async conditionalAttach(queue: string = 'default'): Promise<any> {
    if (!this.list[queue]) {
      this.list[queue] = new PublisherDelayed(this.conn, queue);
    }
  }

  closeConnection(): Promise<void> {
    return this.conn.quit();
  }
}

export class PublisherDelayed {
  constructor(public conn: any, protected channel: string) {}

  sendToQueue(msg: string, delay: any = 0): Promise<void> {
    return this.conn.zadd(this.channel, Date.now() + delay * 1, msg);
  }
}
