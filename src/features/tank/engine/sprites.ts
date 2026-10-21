export type Palette = Record<string, string>

export interface PixelArt {
  width: number
  height: number
  frames: string[][]
  back?: string[]
  front?: string[]
}

export type SpriteSource =
  | { kind: 'pixels'; art: PixelArt }
  | { kind: 'image'; url: string; frameWidth: number }

export interface LoadedSprite {
  frames: HTMLCanvasElement[]
  back?: HTMLCanvasElement
  front?: HTMLCanvasElement
}

const TRANSPARENT = '.'

function parseHex(color: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(color)
  if (!match) throw new Error(`Invalid palette color: ${color}`)
  const value = parseInt(match[1], 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

export function pixelsToRgba(rows: string[], palette: Palette): Uint8ClampedArray {
  const width = rows[0]?.length ?? 0
  const rgba = new Uint8ClampedArray(width * rows.length * 4)
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Row ${y} has ${row.length} pixels, expected ${width}`)
    for (let x = 0; x < width; x++) {
      const key = row[x]
      if (key === TRANSPARENT) continue
      const color = palette[key]
      if (color === undefined) throw new Error(`Missing palette entry for "${key}"`)
      const [r, g, b] = parseHex(color)
      const offset = (y * width + x) * 4
      rgba[offset] = r
      rgba[offset + 1] = g
      rgba[offset + 2] = b
      rgba[offset + 3] = 255
    }
  })
  return rgba
}

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas context is not available')
  return [canvas, context]
}

function rowsToCanvas(rows: string[], palette: Palette, width: number, height: number): HTMLCanvasElement {
  const [canvas, context] = createCanvas(width, height)
  const data = new ImageData(pixelsToRgba(rows, palette) as Uint8ClampedArray<ArrayBuffer>, width, height)
  context.putImageData(data, 0, 0)
  return canvas
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Cannot load sprite image: ${url}`))
    image.src = url
  })
}

export async function loadSprite(source: SpriteSource, palette: Palette): Promise<LoadedSprite> {
  if (source.kind === 'pixels') {
    const { art } = source
    const toCanvas = (rows: string[]) => rowsToCanvas(rows, palette, art.width, art.height)
    return {
      frames: art.frames.map(toCanvas),
      back: art.back && toCanvas(art.back),
      front: art.front && toCanvas(art.front),
    }
  }
  const image = await loadImage(source.url)
  const count = Math.max(1, Math.floor(image.width / source.frameWidth))
  const frames = Array.from({ length: count }, (_, index) => {
    const [canvas, context] = createCanvas(source.frameWidth, image.height)
    context.drawImage(image, index * source.frameWidth, 0, source.frameWidth, image.height, 0, 0, source.frameWidth, image.height)
    return canvas
  })
  return { frames }
}
