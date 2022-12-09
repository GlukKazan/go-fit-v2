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

function flipX(pos, size) {
    const x = pos % size;
    pos -= x;
    return pos + (size - x - 1);
}

function flipY(pos, size) {
    const y = (pos / size) | 0;
    pos -= y * size;
    return (size - y - 1) * size + pos;
}

function toRight(pos, size) {
    const x = pos % size;
    const y = (pos / size) | 0;
    return x * size + (size - y - 1);
}

function toLeft(pos, size) {
    const x = pos % size;
    const y = (pos / size) | 0;
    return (size - x - 1) * size + y;
}

function transform(pos, n, size) {    
    switch (n) {
        case 1:
            pos = flipX(pos, size);
            break;
        case 2:
            pos = flipY(pos, size);
            break;
        case 3:
            pos = flipX(pos, size);
            pos = flipY(pos, size);
            break;
        case 4:
            pos = toRight(pos, size);
            break;
        case 5:
            pos = toLeft(pos, size);
            break;
        case 6:
            pos = toRight(pos, size);
            pos = flipX(pos, size);
            break;
        case 7:
            pos = toLeft(pos, size);
            pos = flipX(pos, size);
            break;
        case 8:
            pos = flipX(pos, size);
            pos = toLeft(pos, size);
            break;
        case 9:
            pos = flipX(pos, size);
            pos = toRight(pos, size);
            break;
    }
    return pos;
}

function encode(fen, size, X, offset, ix) {
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
                    X[transform(pos, ix, size) + offset] = p;
                } else {
                    if (p > 0) {
                        X[transform(pos, ix, size) + offset] = 1;
                    } else {
                        X[transform(pos, ix, size) + o + offset] = 1;
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
    for (let ix = 0; ix < 8; ix++) {
        encode(fen, ml.SIZE, X, xo);
        Y[yo + transform(pos, ix, size)] = 1;
        if (ix == 0) {
//          dump(X, ml.SIZE, xo, Y);
        }
        xo += ml.SIZE * ml.SIZE * ml.PLANE_COUNT;
        yo += ml.SIZE * ml.SIZE;
        C++;
        if (C >= BATCH) break;
    }
}

module.exports.proceed = proceed;
