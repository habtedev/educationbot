const fs = require('fs');
const path = require('path');
const { zlib } = require('zlib');

// Helper to create a minimal valid PNG with specified width, height, and RGBA background color (#09090b)
function createMinimalPNG(width, height) {
  const widthBuf = Buffer.alloc(4);
  widthBuf.writeUInt32BE(width, 0);
  const heightBuf = Buffer.alloc(4);
  heightBuf.writeUInt32BE(height, 0);

  // IHDR Chunk
  const ihdrData = Buffer.concat([
    widthBuf,
    heightBuf,
    Buffer.from([8, 6, 0, 0, 0]) // 8-bit depth, RGBA color type
  ]);
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT Chunk (raw uncompressed scanlines filled with dark blue-gray #09090b)
  const lineLength = width * 4 + 1;
  const rawData = Buffer.alloc(lineLength * height);
  
  for (let y = 0; y < height; y++) {
    const offset = y * lineLength;
    rawData[offset] = 0; // Filter byte 0 = None
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 4;
      rawData[px] = 9;     // R
      rawData[px + 1] = 9; // G
      rawData[px + 2] = 11; // B
      rawData[px + 3] = 255; // A
    }
  }

  const compressedData = require('zlib').deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  // Magic PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, body, crcBuf]);
}

// Standard CRC-32 table generator
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'icon-192x192.png'), createMinimalPNG(192, 192));
fs.writeFileSync(path.join(publicDir, 'icon-512x512.png'), createMinimalPNG(512, 512));
console.log('Successfully generated icon-192x192.png and icon-512x512.png');
