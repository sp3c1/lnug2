import { Client, QueryResult } from 'pg';

// TODO: prefetch!!!!!! and read locks
export class SubscribersDelayed {
  protected list: SubscriberDelayed[] = [];
  public conn: any = null;

  constructor(public config: any, public bailFnc: Function) {}

  async init(conn?: any): Promise<any> {
    try {
      if (conn) {
        this.conn = conn;
      } else {
        this.conn = new Client({ connectionString: this.config.queue.postgres.url, ssl: true });
        await this.conn.connect();
      }
    } catch (e) {
      this.bailFnc(e);
    }
  }

  public async subscribe(queue: string, options: any = {}, prefetch: any = 1, callback: (parsed: any, raw: any, ack: () => void) => void) {
    prefetch = 1;
    await this.conditionalAttach(queue, options);
    this.list[queue].subscribe(queue, callback);
  }

  async conditionalAttach(queue: string, options: any = {}, prefetch: number = 1): Promise<any> {
    if (!this.list[queue]) {
      this.list[queue] = new SubscriberDelayed(this.conn, queue, options);
    }
  }

  async closeConnection() {
    for (let subscriber of this.list) {
      subscriber.close();
    }
    await this.conn.end();
  }
}

export class SubscriberDelayed {
  protected processing: boolean = false;
  protected intervalId: any;
  protected acceptedHeadLookUp;
  protected prefetch: number;

  constructor(public conn: Client, protected channel: string, protected options: any) {
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
    }, 100);

    var singleGet = async () => {
      let item: QueryResult = null;
      try {
        item = await this.conn.query(`SELECT oid, * FROM public."${queue}" WHERE timeindex < ${Date.now() - this.acceptedHeadLookUp} ORDER BY timeindex ASC LIMIT 1`);
      } catch (e) {}

      if (item && Array.isArray(item.rows) && item.rows.length) {
        callback(item.rows[0].data, item.rows[0], async () => {
          this.processing = false;
          actualPrefetch--;
          await this.conn.query(`DELETE FROM public."${queue}" WHERE oid=${item.rows[0].oid}`);
        });
      } else {
        this.processing = false;
        actualPrefetch--;
      }
    };
  }

  public close() {
    clearInterval(this.intervalId);
  }
}
