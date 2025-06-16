import clamp    from './clamp.js'
import colorMap from './big-color-map.js'

// spikes going from the edge toward center inside a circular mask, fully transparent background
export default function vizSpikes (options = {}) {
  let { ctx, cv, bandCount, rotateAmount } = options
  const dampen = true

  let centerRadius, hypotenuse, shortestSide
  let hueOffset = 0
  let rotation = 0  // current rotation angle (radians)

  const draw = function (spectrum) {
    hueOffset += 1

    // === 背景を完全透明でリセット ===
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    ctx.restore()

    // === 円形マスク ===
    const cx = cv.width / 2
    const cy = cv.height / 2
    const radius = Math.min(cv.width, cv.height) / 2

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.clip()

    // === 描画原点・回転設定 ===
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.rotate(Math.PI / 2)

    // === 回転の更新（テンポに合わせて） ===
    const tempoEnergy = spectrum[2] || 0  // 低域を使う（キックなど）
    const speed = clamp(tempoEnergy / 255, 0.05, 1.0)  // 回転速度係数
    rotation -= 0.002 * speed  // ← 左回転（マイナス方向）

    for (let i = 0; i < bandCount; i++) {
      let hue = Math.floor(360.0 / bandCount * i + hueOffset) % 360
      let brightness = clamp(Math.floor(spectrum[i] / 1.5), 15, 99)
      ctx.fillStyle = colorMap.bigColorMap[hue * 100 + brightness]

      // 外から中心に向かうスパイク
      let outer = radius
      let inner = radius - (radius - centerRadius) * (spectrum[i] / 255)

      ctx.beginPath()
      ctx.arc(0, 0, outer, -rotateAmount / 2, rotateAmount / 2)
      ctx.lineTo(inner, 0)
      ctx.fill()
      ctx.closePath()
      ctx.rotate(rotateAmount)
    }

    ctx.restore()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  const resize = function () {
    shortestSide = Math.min(cv.width, cv.height)
    hypotenuse = Math.sqrt(cv.width * cv.width + cv.height * cv.height)
    centerRadius = 85.0 / 800 * shortestSide
  }

  return Object.freeze({ dampen, resize, draw })
}
