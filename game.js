"use strict";

const _ = require('underscore');
const ml = require('./model');

const BATCH = 4096;

let X = null;
let Y = null;
let Z = null;

let C = 0;
let xo = 0;
let yo = 0;

let cnt = 0;

function dump(board, size, offset, moves) {
    for (let y = 0; y < size; y++) {
        let s = '';
        for (let x = 0; x < size; x++) {
            let pos = y * size + x + offset;
            if (board[pos] > 0) {
                s = s + '* ';
            } else if (board[pos] < 0) {
                s = s + 'o ';
            }  else if (!_.isUndefined(moves) && (moves[pos] > 1 / (size * size))) {
                s = s + '+ ';
            }  else if (!_.isUndefined(moves) && (moves[pos] < -1 / (size * size))) {
                s = s + 'X ';
            }  else {
                s = s + '. ';
            }
        }
        console.log(s);
    }
    console.log('');
}

function encode(fen, size, X, offset) {
    let pos = 0; const o = size * size;
    for (let i = 0; i < fen.length; i++) {
        const c = fen[i];
        if (c != '/') {
            if ((c >= '0') && (c <= '9')) {
                pos += +c;
            } else {
                let p = 1;
                if ((c == 'w') || (c == 'W')) {
                    p = -p;
                }
                if (ml.PLANE_COUNT == 1) {
                    X[pos + offset] = p;
                } else {
                    if (p > 0) {
                        X[pos + offset] = 1;
                    } else {
                        X[pos + o + offset] = 1;
                    }
                }
                pos++;
            }
            if (pos >= size * size) break;
        } 
    }
}

async function proceed(model, fen, pos, logger) {
    if ((X === null) || (C >= BATCH)) {
        if (X !== null) {
            await ml.fit(model, ml.SIZE, X, Y, C, logger);
            cnt++;
            if ((cnt % 20) == 0) {
                await ml.save(model, 'go-' + ml.PLANE_COUNT + '-' + ml.SIZE + '-' + cnt + '.json');
                console.log('Save [' + cnt + ']: ' + fen);
                logger.info('Save [' + cnt + ']: ' + fen);
            }
        }
        xo = 0; yo = 0;
        X = new Float32Array(ml.PLANE_COUNT * BATCH * ml.SIZE * ml.SIZE);
        Y = new Float32Array(BATCH * ml.SIZE * ml.SIZE);
        Z = new Float32Array(BATCH);
        C = 0;
    }
    encode(fen, ml.SIZE, X, xo);
    Y[yo + pos] = 1;
//  dump(X, ml.SIZE, xo, Y);
    xo += ml.SIZE * ml.SIZE * ml.PLANE_COUNT;
    yo += ml.SIZE * ml.SIZE;
    C++;
}

module.exports.proceed = proceed;
