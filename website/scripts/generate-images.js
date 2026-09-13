/**
 * Generates the placeholder brand art (favicon + Open Graph image) from a
 * pixel-art sprite, so the images in assets/images are reproducible.
 *
 *   node scripts/generate-images.js
 *
 * Replace with real art whenever there is real art.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "..", "assets", "images");

const AMBER = [232, 145, 58];
const DARK = [21, 19, 15];
const CREAM = [245, 239, 230];

// Long-necked dinosaur, one character per pixel.
const DINO = [
  ".........................",
  "..................#####..",
  ".................#######.",
  ".................##.####.",
  ".................#######.",
  "..................#####..",
  "..................####...",
  "..#...............####...",
  "..##.............#####...",
  "...###.......##########..",
  "....#####################",
  "...#####################.",
  "...#####################.",
  "....####.####.####.####..",
  "....###..###..###..###...",
  "....##....##..##....##...",
];

// 5x7 uppercase font, only the glyphs used by the wordmark.
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  N: ["10001", "11001", "10101", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function canvas(width, height, background) {
  const pixels = new Uint8Array(width * height * 4);
  if (background) {
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4] = background[0];
      pixels[i * 4 + 1] = background[1];
      pixels[i * 4 + 2] = background[2];
      pixels[i * 4 + 3] = 255;
    }
  }
  return { width, height, pixels };
}

function put(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (y * image.width + x) * 4;
  image.pixels[i] = color[0];
  image.pixels[i + 1] = color[1];
  image.pixels[i + 2] = color[2];
  image.pixels[i + 3] = 255;
}

function stamp(image, rows, originX, originY, scale, color, onChar) {
  const lit = onChar || "#";
  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col++) {
      if (row[col] !== lit) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          put(image, originX + col * scale + dx, originY + rowIndex * scale + dy, color);
        }
      }
    }
  });
}

// Bounding box of the lit pixels, so sprites centre on their art and not on
// whatever padding the string rows happen to carry.
function bounds(rows, lit) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== lit) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// Draws a sprite so its lit pixels are horizontally centred in the image.
function stampCentered(image, rows, topY, scale, color) {
  const box = bounds(rows, "#");
  const originX = Math.round((image.width - box.width * scale) / 2) - box.minX * scale;
  stamp(image, rows, originX, topY - box.minY * scale, scale, color);
  return { top: topY, bottom: topY + box.height * scale };
}

function text(image, value, originX, originY, scale, color) {
  let x = originX;
  for (const char of value.toUpperCase()) {
    const glyph = FONT[char];
    if (!glyph) throw new Error(`No glyph for "${char}"`);
    stamp(image, glyph, x, originY, scale, color, "1");
    x += 6 * scale;
  }
  return x - scale;
}

function textWidth(value, scale) {
  return value.length * 6 * scale - scale;
}

function png(image) {
  const raw = Buffer.alloc(image.height * (image.width * 4 + 1));
  for (let y = 0; y < image.height; y++) {
    const rowStart = y * (image.width * 4 + 1);
    raw[rowStart] = 0; // filter: none
    image.pixels.slice(y * image.width * 4, (y + 1) * image.width * 4).forEach((byte, i) => {
      raw[rowStart + 1 + i] = byte;
    });
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

function write(name, image) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), png(image));
  console.log(`wrote ${name} (${image.width}x${image.height})`);
}

// favicon: 512x512, dino centred on dark
{
  const size = 512;
  const image = canvas(size, size, DARK);
  const scale = 21;
  const box = bounds(DINO, "#");
  stampCentered(image, DINO, Math.round((size - box.height * scale) / 2), scale, AMBER);
  write("favicon.png", image);
}

// open graph card: 1200x630, dino above the wordmark
{
  const image = canvas(1200, 630, DARK);

  stampCentered(image, DINO, 80, 20, AMBER);

  const title = "REFURBISHED";
  const subtitle = "DINOSAURS";
  const titleScale = 9;
  text(image, title, Math.round((1200 - textWidth(title, titleScale)) / 2), 450, titleScale, CREAM);
  text(
    image,
    subtitle,
    Math.round((1200 - textWidth(subtitle, titleScale)) / 2),
    530,
    titleScale,
    AMBER,
  );

  write("og-image.png", image);
}
