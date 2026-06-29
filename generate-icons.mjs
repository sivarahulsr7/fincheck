// Run: node generate-icons.mjs
// Generates SVG-based PNG icons for PWA
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

const sizes = [192, 512]

for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  const r = size * 0.22
  ctx.fillStyle = '#4CAF76'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, [r])
  ctx.fill()

  // Text
  ctx.fillStyle = '#1a3d29'
  ctx.font = `bold ${size * 0.32}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('FB', size / 2, size / 2)

  const buf = canvas.toBuffer('image/png')
  writeFileSync(`public/icons/icon-${size}.png`, buf)
  console.log(`Generated icon-${size}.png`)
}
