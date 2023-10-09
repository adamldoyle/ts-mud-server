import * as winston from 'winston';

const winstonLogger = winston.createLogger({
  level: 'debug',
  defaultMeta: { service: process.env.mudServiceName },
  transports: [
    new winston.transports.File({
      filename: `proxy-and-game.log`,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

const winstonPlayerLogger = winston.createLogger({
  level: 'debug',
  defaultMeta: { service: process.env.mudServiceName },
  transports: [
    new winston.transports.File({
      filename: `player-history.log`,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    })
  );
}

export const logger = {
  debug: (...messages: unknown[]): undefined => {
    /* istanbul ignore next */
    winstonLogger.debug(messages);
    /* istanbul ignore next */
    return;
  },

  info: (...messages: unknown[]): undefined => {
    /* istanbul ignore next */
    winstonLogger.info(messages);
    /* istanbul ignore next */
    return;
  },

  error: (...messages: unknown[]): undefined => {
    /* istanbul ignore next */
    winstonLogger.error(messages);
    /* istanbul ignore next */
    return;
  },
};

export const playerLogger = {
  log: (...messages: unknown[]): undefined => {
    /* istanbul ignore next */
    winstonPlayerLogger.debug(messages);
    /* istanbul ignore next */
    return;
  },
};
