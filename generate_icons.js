const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 calculation for PNG chunks
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPNG(size) {
  const width = size;
  const height = size;
  const buffer = Buffer.alloc(height * (width * 4 + 1));

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    let offset = y * (width * 4 + 1);
    buffer[offset] = 0; // Filter type 0 (None)
    offset++;

    for (let x = 0; x < width; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 0, g = 0, b = 0, a = 0;

      if (dist <= radius) {
        // Gradient background: Dark indigo to vibrant violet/pink
        const t = (x + y) / (width + height);
        r = Math.floor(99 * (1 - t) + 168 * t);
        g = Math.floor(102 * (1 - t) + 85 * t);
        b = Math.floor(241 * (1 - t) + 247 * t);
        a = 255;

        // Anti-aliasing edge
        if (dist > radius - 1) {
          a = Math.floor(255 * (radius - dist));
        }

        // Draw Fast Forward icon (double right triangles)
        const relX = (x - center) / size;
        const relY = (y - center) / size;

        // Triangle 1: left -0.2 to 0.0
        const inTri1 = relX >= -0.25 && relX <= 0.05 && Math.abs(relY) <= (0.05 - relX) * 0.6;
        // Triangle 2: right 0.0 to 0.3
        const inTri2 = relX >= 0.0 && relX <= 0.30 && Math.abs(relY) <= (0.30 - relX) * 0.6;

        if (inTri1 || inTri2) {
          r = 255;
          g = 255;
          b = 255;
          a = 255;
        }
      }

      buffer[offset + 0] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
      buffer[offset + 3] = a;
      offset += 4;
    }
  }

  // Build PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = writeChunk('IHDR', ihdrData);

  const compressedData = zlib.deflateSync(buffer);
  const idatChunk = writeChunk('IDAT', compressedData);

  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${filePath}`);
});

console.log('All icons generated successfully!');
