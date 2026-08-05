// Synthetic 16:9 test thumbnail, generated in-process so the repo carries no
// binary fixtures. Good enough for schema/latency/fallback testing; for the
// USEFULNESS review, drop real thumbnails into bench/fixtures-private/ (see
// README) — a synthetic image can't tell you if the analysis is any good.
import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// A dark background, one bright violet "subject" block and a blue band —
// enough visual structure that a vision model has something real to describe.
export function makeTestPng(w = 1280, h = 720) {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      let r = 0x16, g = 0x13, b = 0x1f;                       // background
      if (y < h * 0.18) { r = 0x3b; g = 0x82; b = 0xf6; }     // top blue band
      if (x > w * 0.3 && x < w * 0.7 && y > h * 0.3 && y < h * 0.8) {
        r = 0x7c; g = 0x4d; b = 0xff;                          // subject block
      }
      const o = row + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Deliberately NOT an image — exercises the invalid-file path per AI-ROUTING.md.
export function makeInvalidImageBase64() {
  return Buffer.from('This is not an image at all, just text bytes.', 'utf8').toString('base64');
}
