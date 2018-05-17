import * as redis from 'redis';
import * as promisify from 'util-promisifyall';

promisify(redis.RedisClient.prototype);
promisify(redis.Multi.prototype);

// TODO: locks/trx aka multi consumers
export class SubscribersDelayed {
  protected list: SubscriberDelayed[] = [];
  public conn: any = null;

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

  public async subscribe(queue: string, options: any = {}, prefetch: any = 1, callback: (parsed: any, raw: any, ack: () => void) => void) {
    options.prefetch = prefetch;
    await this.conditionalAttach(queue, options);
    this.list[queue].subscribe(queue, callback);
  }

  async conditionalAttach(queue: string, options: any = {}): Promise<any> {
    if (!this.list[queue]) {
      this.list[queue] = new SubscriberDelayed(this.conn, queue, options);
    }
  }

  async closeConnection() {
    for (let subscriber of this.list) {
      subscriber.close();
    }
    await this.conn.quit();
  }
}

export class SubscriberDelayed {
  protected processing: boolean = false;
  protected intervalId: any;
  protected acceptedHeadLookUp;
  protected prefetch: number;

  constructor(public conn: any, protected channel: string, protected options: any) {
    this.acceptedHeadLookUp = (this.options && this.options.acceptedHeadLookUp) || 0;
    this.prefetch = (this.options && this.options.prefetch) || 10;
  }

  subscribe(queue: string, callback) {
    let actualPrefetch: number = 0;

    this.intervalId = setInterval(async () => {
      if (!this.processing && actualPrefetch < this.prefetch) {
        this.processing = true;
        actualPrefetch++;
        await singleGet();
      }
    }, 10);

    var singleGet = async () => {
      let item = null;
      item = await this.zrangePromise(queue, 0, 0);

      if (item && Array.isArray(item) && item.length >= 2 && item[1] - this.acceptedHeadLookUp <= Date.now()) {
        let processed = item;

        try {
          processed = JSON.parse(item[0]);
        } catch (e) {
          // do nothing
          processed = item[0];
        }

        callback(processed, item, async () => {
          this.processing = false;
          actualPrefetch--;
          await this.zremPromise(queue, item);
        });
      } else {
        this.processing = false;
        actualPrefetch--;
      }
    };
  }

  protected zrangePromise(queue: string, from: number = 0, to: number = 0, flag: string = 'WITHSCORES'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.conn.zrange(queue, from, to, flag, function(err, res) {
        if (err) {
          resolve(null);
        } else {
          resolve(res);
        }
      });
    });
  }

  protected zremPromise(queue: string, item: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.conn.zrem(queue, item, function(err, res) {
        if (err) {
          resolve(null);
        } else {
          resolve(res);
        }
      });
    });
  }

  public close() {
    clearInterval(this.intervalId);
  }
}
