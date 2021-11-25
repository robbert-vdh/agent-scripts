// ==UserScript==
// @name         [01001DC01486A000] 月姫 -A piece of blue glass moon-
// @version      0.2.1 - 1.0.1
// @author       [DC]
// @description  Yuzu, Tsukihime
// * Aniplex (アニプレックス)
// * 
// ==/UserScript==
const gameVer = '1.0.1';
trans.replace(function(s) {
    return s
        .replace(/秋葉/g, 'Akiha')
        .replace(/アルクェイド/g, 'Arcueid')
        .replace(/シエル/g, 'Ciel')
        .replace(/翡翠/g, 'Hisui')
        .replace(/琥珀/g, 'Kohaku')
        ;
});
//------------------------------------------------
const { setHook } = require('./libyuzu.js');

const mainHandler = handler;

setHook({
    '1.0.0': {
        // TODO
    },
    '1.0.1': {
        0x80ac290: mainHandler
    },
    '1.0.2': {
        // TODO
    }
}[globalThis.gameVer ?? gameVer]);

function handler(regs) {
    const address = regs[2].value; // x2
    
    //const pc = this.context.pc;
    console.log('onEnter');
    console.log(hexdump(address, { header: false, ansi: false, length: 0x50 }));

    processBinaryString(address);
}

//------------------------------------------------
const encoder = new TextEncoder('utf-8');
const decoder = new TextDecoder('utf-8');
let timerPreCheck = null, previousString = '', previousTime = 0;

function processBinaryString(address, condition) {
    const _address = address;
    let s = '', bottom = '', c;
    while (c = address.readU8()) {
        if (c >= 0x20) {  // readChar
            c = decoder.decode(address.readByteArray(4))[0]; // utf-8: 1->4 bytes.
            s += c;
            address = address.add(encoder.encode(c).byteLength);
        }
        else { // readControl
            address = address.add(1);

            if (c == 1) { // ruby (01_text_02 03_ruby_04)
                bottom = '';
                while (true) {
                    c = decoder.decode(address.readByteArray(4))[0];
                    address = address.add(encoder.encode(c).byteLength);
                    if (c < '\u000a') break; // 0002
                    bottom += c;
                    s += c;
                }
            }
            else if (c == 3) {
                let rubi = '';
                while (true) {
                    c = decoder.decode(address.readByteArray(4))[0];
                    address = address.add(encoder.encode(c).byteLength);
                    if (c < '\u000a') break; // 0004
                    rubi += c;
                }
                console.log('rubi: ', rubi);
                console.log('char: ', bottom);
            }
            else if (c == 7) { // begin 07 30
                address = address.add(1);
            }
            else if (c == 0xa) { // delay
                if (address.readU8() === 0) {
                    console.log('Animating...');
                    return setTimeout(processBinaryString, 500, _address); // wait
                }
            }
            else if (c == 0xd) { // compress: 0d 03 c5 92 06
                c = address.readU32();
                const count = c & 0xFF;
                c = c & 0xFFFFFF00;
                if (c == 0x0692c500) {
                    s += '―'.repeat(count);
                    address = address.add(4);
                }
            }
            else {
                // do nothing
            }
        }
    }
    
    if (s) {
        const fromHook = condition === undefined; // hook or delay
        if (fromHook) {
            if (previousString === s) return console.log('>' + s);
            const currentTime = new Date().getTime();
            s = previousString = currentTime - previousTime < 300 ? previousString + '\n' + s : s; // join fast string (choise)
            previousTime = currentTime;
        } else previousString = s;
        
        trans.send(s);

        // detect missed chars
        if (fromHook) {
            const blockSize = align(address.sub(_address).add(1).toInt32(), 4);
            const oldBuf = _address.readByteArray(blockSize);
            clearTimeout(timerPreCheck);
            timerPreCheck = setTimeout(function () {
                const newBuf = _address.readByteArray(blockSize);
                if (!equal32(oldBuf, newBuf)) {
                    processBinaryString(_address, true);
                }
            }, 2250);
        }
    }
}

function align(value, alignment) { // 1 2 4 8 16
    return (value + (alignment - 1)) & ~(alignment - 1);
}

function equal32(a, b) {
    const ua = new Uint32Array(a, 0, a.byteLength / 4);
    const ub = new Uint32Array(b, 0, b.byteLength / 4);
    return compare(ua, ub);
}

function compare(a, b) {
    for (let i = a.length; -1 < i; i -= 1) {
        if ((a[i] !== b[i])) return false;
    }
    return true;
}