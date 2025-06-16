import vizSunburst from './vizSunburst.js'
import vizSpikes from './vizSpikes.js'

export default function vizSunburstSpikes(options = {}) {
  const sunburstLayer = vizSunburst(options)
  const spikesLayer = vizSpikes(options)

  const draw = (spectrum) => {
    const { ctx, cv } = options

    // 背景を透明にクリア
    ctx.clearRect(0, 0, cv.width, cv.height)

    // 下層：vizSunburst（背景）
    ctx.save()
    ctx.globalAlpha = 1.0 // 必要なら透明度も調整可
    sunburstLayer.draw(spectrum)
    ctx.restore()

    // 上層：vizSpikes（前景）
    ctx.save()
    ctx.globalAlpha = 1.0 // 必要なら0.7などで半透明に調整可
    spikesLayer.draw(spectrum)
    ctx.restore()
  }

  const resize = () => {
    sunburstLayer.resize && sunburstLayer.resize()
    spikesLayer.resize && spikesLayer.resize()
  }

  const vary = () => {
    sunburstLayer.vary && sunburstLayer.vary()
    spikesLayer.vary && spikesLayer.vary()
  }

  return Object.freeze({
    draw,
    resize,
    vary,
    dampen: true
  })
}
