const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, r, g, b) {
  // Create raw RGBA pixel data
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx = (x / size - 0.5) * 2;
      const cy = (y / size - 0.5) * 2;
      const dist = Math.sqrt(cx * cx + cy * cy);

      if (dist < 0.82) {
        const t = (cx + cy + 2) / 4;
        pixels[idx]     = Math.round(r * (1-t) + 78 * t);
        pixels[idx + 1] = Math.round(g * (1-t) + 205 * t);
        pixels[idx + 2] = Math.round(b * (1-t) + 196 * t);
        pixels[idx + 3] = 255;
      } else if (dist < 0.92) {
        pixels[idx] = 200;
        pixels[idx + 1] = 180;
        pixels[idx + 2] = 240;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx] = 10;
        pixels[idx + 1] = 10;
        pixels[idx + 2] = 15;
        pixels[idx + 3] = 255;
      }
    }
  }

  // Add filter bytes (0 = no filter for each row)
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rawData[y * (size * 4 + 1)] = 0; // filter byte
    pixels.copy(rawData, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeB, data]);
    const crc = crc32(crcData);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// CRC32
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createICO() {
  const img32 = createPNG(32, 124, 108, 240);
  const img16 = createPNG(16, 124, 108, 240);

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  const offset = 6 + 16 * 2;

  const dir1 = Buffer.alloc(16);
  dir1[0] = 16; // width
  dir1[1] = 0; // height (0 = not used in .ico with PNG)
  dir1[2] = 0; // color palette
  dir1[3] = 0; // reserved
  dir1.writeUInt16LE(1, 4);  // color planes
  dir1.writeUInt16LE(32, 6); // bpp
  dir1.writeUInt32LE(img16.length, 8);  // image data size
  dir1.writeUInt32LE(offset, 12); // offset to image data

  const dir2 = Buffer.alloc(16);
  dir2[0] = 32; // width
  dir2[1] = 0; // height
  dir2[2] = 0;
  dir2[3] = 0;
  dir2.writeUInt16LE(1, 4);
  dir2.writeUInt16LE(32, 6);
  dir2.writeUInt32LE(img32.length, 8);
  dir2.writeUInt32LE(offset + img16.length, 12);

  return Buffer.concat([header, dir1, dir2, img16, img32]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, '32x32.png'), createPNG(32, 124, 108, 240));
fs.writeFileSync(path.join(iconsDir, '128x128.png'), createPNG(128, 124, 108, 240));
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), createPNG(256, 124, 108, 240));
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), createICO());
// Copy 256x256 as icon.icns placeholder (not real icns but Tauri will skip on Windows)
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), createPNG(256, 124, 108, 240));

console.log('All icons created!');
