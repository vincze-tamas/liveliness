#!/usr/bin/env node
// Generates icon-192.png and icon-512.png for the PWA manifest.
// Produces a solid teal (#0d9488) circle on dark navy (#0f172a) background.
// Run from repo root: node generate-icons.js

const zlib = require('node:zlib')
const fs = require('node:fs')
const path = require('node:path')

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) {
    c ^= b
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function makePNG(size) {
  // Palette: teal circle on dark navy background
  const BG = [0x0f, 0x17, 0x2a]   // #0f172a
  const FG = [0x0d, 0x94, 0x88]   // #0d9488 teal

  // Build raw RGBA scanlines (colour type 6)
  const rows = []
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42  // circle fills 84% of icon

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4) // filter byte + RGBA pixels
    // row[0] = 0 (None filter)
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const inCircle = dx * dx + dy * dy <= r * r
      const col = inCircle ? FG : BG
      const i = 1 + x * 4
      row[i]     = col[0]
      row[i + 1] = col[1]
      row[i + 2] = col[2]
      row[i + 3] = 255  // fully opaque
    }
    rows.push(row)
  }

  const rawData = Buffer.concat(rows)
  const idat = zlib.deflateSync(rawData, { level: 6 })

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)   // width
  ihdr.writeUInt32BE(size, 4)   // height
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  // bytes 10-12: compression=0, filter=0, interlace=0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, 'frontend', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePNG(192))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePNG(512))

console.log('✓ icon-192.png and icon-512.png written to frontend/public/icons/')
