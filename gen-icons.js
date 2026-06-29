import { deflateSync } from 'zlib'
import fs from 'fs'

function crc32(buf) {
  let c = 0xFFFFFFFF
  const table = []
  for (let i = 0; i < 256; i++) {
    let v = i
    for (let j = 0; j < 8; j++) v = (v & 1) ? 0xEDB88320 ^ (v >>> 1) : v >>> 1
    table[i] = v
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.concat([t, data])
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, t, data, crcVal])
}

function encodePNG(pixels, w, h) {
  const raw = []
  for (let y = 0; y < h; y++) {
    raw.push(0) // filter byte
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
    }
  }
  const compressed = deflateSync(Buffer.from(raw))
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',compressed), chunk('IEND',Buffer.alloc(0))])
}

function dist(x1,y1,x2,y2) { return Math.sqrt((x1-x2)**2+(y1-y2)**2) }

function inRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) return dist(x,y,r,r) <= r
  if (x > w-1-r && y < r) return dist(x,y,w-1-r,r) <= r
  if (x < r && y > h-1-r) return dist(x,y,r,h-1-r) <= r
  if (x > w-1-r && y > h-1-r) return dist(x,y,w-1-r,h-1-r) <= r
  return true
}

function fillRect(pixels, w, x1, y1, rw, rh, color) {
  for (let y = y1; y < y1+rh; y++) {
    for (let x = x1; x < x1+rw; x++) {
      if (x < 0 || x >= w || y < 0 || y >= w) continue
      const i = (y*w+x)*4
      if (pixels[i+3] === 0) continue // don't draw on transparent
      pixels[i]=color[0]; pixels[i+1]=color[1]; pixels[i+2]=color[2]; pixels[i+3]=color[3]
    }
  }
}

function makeIcon(size) {
  const w = size, h = size
  const pixels = new Uint8Array(w*h*4)
  const bg = [76, 175, 118, 255]
  const fg = [26, 61, 41, 255]
  const r = Math.round(size * 0.2)

  // Draw rounded rect background
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (inRoundedRect(x, y, w, h, r)) {
        const i = (y*w+x)*4
        pixels[i]=bg[0]; pixels[i+1]=bg[1]; pixels[i+2]=bg[2]; pixels[i+3]=bg[3]
      }

  // Letter dimensions scaled to icon size
  const lh = Math.round(size * 0.38)   // letter height
  const lw = Math.round(size * 0.25)   // letter width
  const sw = Math.round(size * 0.055)  // stroke width
  const gap = Math.round(size * 0.07)  // gap between F and C
  const totalW = lw + gap + lw
  const ox = Math.round((w - totalW) / 2)
  const oy = Math.round((h - lh) / 2)

  // F: vertical bar + top bar + middle bar
  fillRect(pixels, w, ox, oy, sw, lh, fg)                              // vertical
  fillRect(pixels, w, ox, oy, lw, sw, fg)                              // top
  fillRect(pixels, w, ox, oy + Math.round(lh*0.44), Math.round(lw*0.78), sw, fg) // middle

  // C: left vertical (shorter, inset from top/bottom) + top bar + bottom bar
  const cx = ox + lw + gap
  fillRect(pixels, w, cx, oy, lw, sw, fg)                              // top
  fillRect(pixels, w, cx, oy + lh - sw, lw, sw, fg)                   // bottom
  fillRect(pixels, w, cx, oy + sw, sw, lh - sw*2, fg)                 // left vertical

  return encodePNG(pixels, w, h)
}

fs.mkdirSync('public/icons', { recursive: true })
fs.writeFileSync('public/icons/icon-192.png', makeIcon(192))
fs.writeFileSync('public/icons/icon-512.png', makeIcon(512))
console.log('Icons generated: icon-192.png, icon-512.png')
