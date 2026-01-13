import pino from 'pino';

export default pino({
  level: process.env.LOG_LEVEL ?? 'debug',
  transport: {
    target: 'pino/file',
    options: { destination: 2 }, // stderr
  },
});
