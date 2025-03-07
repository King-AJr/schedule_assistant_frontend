import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all errors to error.log
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Write all logs to combined.log
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

export default logger; 