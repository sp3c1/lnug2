import { Client } from 'pg';

export class PublishersDelayed {
  protected list: PublisherDelayed[] = [];
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

  /**
   *
   *
   * @param {string} queue
   * @param {string} replyTo
   * @param {*} [delay=0]
   * @param {string} data
   * @param {boolean} [unique=false] If this is set to true it would update first entry it finds, and then enforce uniqness (delete all other nodes)
   * @returns {Promise<void>}
   * @memberof PublishersDelayed
   */
  async publish(queue: string, replyTo: string, delay: any = 0, data: string, unique: boolean = false): Promise<void> {
    await this.conditionalAttach(queue);
    return this.list[queue].sendToQueue(data, delay, unique);
  }

  async unpublish(queue: string, data: string): Promise<void> {
    return this.list[queue].removeFromQueue(queue, data);
  }

  async conditionalAttach(queue: string = 'default'): Promise<void> {
    if (!this.list[queue]) {
      this.list[queue] = new PublisherDelayed(this.conn, queue);
    }
  }

  closeConnection(): Promise<void> {
    return this.conn.end();
  }
}

export class PublisherDelayed {
  constructor(public conn: any, protected channel: string) {
    // it will not wait for resolve, yet no postgress queries will execute before thise
    try {
      this.conn
        .query(
          `CREATE TABLE IF NOT EXISTS public."${channel}"
    (
        data jsonb,
        timeindex bigint NOT NULL
    )
    WITH (
        OIDS = TRUE
    );`
        )
        .then(() => {})
        .catch(() => {});

      this.conn
        .query(`CREATE INDEX "timeindex-${channel}" ON public."${channel}" (timeindex)`)
        .then(() => {})
        .catch(() => {});

      // this.conn
      //   .query(`CREATE INDEX "gin-${channel}" ON public."${channel}" USING gin ("data")`)
      //   .then(() => {})
      //   .catch(() => {});

      this.conn
        .query(`CREATE INDEX "fulltext-${channel}" ON public."${channel}" USING gin (to_tsvector('english',data->>'text'))`)
        .then(() => {})
        .catch(() => {});
    } catch (e) {}
  }

  async sendToQueue(msg: string, delay: any = 0, unique: boolean = false): Promise<void> {
    if (unique) {
      const item = await this.conn.query(`SELECT oid FROM public."${this.channel}" WHERE data = '${JSON.stringify({ body: msg })}'`);
      if (item && Array.isArray(item.rows) && item.rows.length) {
        // get rid of not interesting stuff
        try {
          await this.conn.query(`DELETE FROM public."${this.channel}" WHERE data = '${JSON.stringify({ body: msg })}' AND oid!=${item.rows[0].oid}`);
        } catch (e) {
          // meh not interested in some, locks, errors, whatever
        }
        // and now wrap up
        return await this.conn.query(`UPDATE public."${this.channel}" SET timeindex=${Date.now() + delay * 1} WHERE oid=${item.rows[0].oid}`);
      } else {
        return await this.conn.query(`INSERT INTO public."${this.channel}" ( data, timeindex ) VALUES ( '${JSON.stringify({ body: msg })}', ${Date.now() + delay * 1} )`);
      }
    } else {
      return await this.conn.query(`INSERT INTO public."${this.channel}" ( data, timeindex ) VALUES ( '${JSON.stringify({ body: msg })}', ${Date.now() + delay * 1} )`);
    }
  }

  async removeFromQueue(queue: string, data: string): Promise<void> {
    await this.conn.query(`DELETE FROM public."${this.channel}" WHERE data = '${data}'`);
  }
}
