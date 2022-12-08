"use strict";

const fs = require('fs'); 
const readline = require('readline'); 

const ml = require('./model');
const game = require('./game');

let model = null;

var winston = require('winston');
require('winston-daily-rotate-file');

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(
        info => `${info.level}: ${info.timestamp} - ${info.message}`
    )
);

var transport = new winston.transports.DailyRotateFile({
    dirname: '',
    filename: 'go-' + ml.PLANE_COUNT + '-' + ml.SIZE + '-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

var logger = winston.createLogger({
    format: logFormat,
    transports: [
      transport
    ]
});

async function proceed() {
    model = await ml.create(logger);
    const rl = readline.createInterface({
        input: fs.createReadStream('data/go-' + ml.SIZE + '.csv'), 
        console: false 
    });
    for await (const line of rl) {
//      console.log(line);
//      logger.info(line);
        const result = line.match(/([^;]+);(\d+)/);
        if (result) {
            const fen = result[1];
            const pos = result[2];
            await game.proceed(model, fen, +pos, logger);
        }
    }
    await ml.save(model, 'go-' + ml.PLANE_COUNT + '-' + ml.SIZE + '.json');
}

async function run() {
    await proceed();
}

(async () => { await run(); })();