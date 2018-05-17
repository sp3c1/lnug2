require('dotenv').config();

export const config = {
  queue: {
    redis: { url: process.env.REDIS || '' },
    rmq: { url: process.env.RMQ || '' },
    postgres: { url: process.env.POSTGRES || '' },
    amq: {
      host: process.env.AMQ_HOST || '',
      port: process.env.AMQ_PORT || 6666,
      transport: 'ssl',
      enable_sasl_external: true,
      username: process.env.AMQ_USERNAME || '',
      password: process.env.AMQ_PASSWORD || '',
    },
  },
};
