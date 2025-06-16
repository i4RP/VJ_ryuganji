import clamp from './clamp.js'
import colorMap from './big-color-map.js'

export default function vizBoxes(options = {}) {
  let { ctx, cv } = options
  const dampen = true

  let hueOffset = 0
  let rotation = 0
  let lastSpectrum = new Array(128).fill(0)
  let lastTransitionTime = Date.now()

  let ringCount = 4
  let baseDirection = 1
  let lastRingChange = Date.now()

  let fixedBW = false
  let fixedMode = false
  let grow = false
  let currentMode = 'universe'
  let colorMode = 'dreamy'
  let useCircleMask = false

  let shapeIndex = 0
  let lastShapeChange = Date.now()
  const shapeList = ['star', 'circle', 'triangle', 'square', 'star16']

  let shapeScale = 1.0
  let tempoScale = 1.0

  let lastColorChange = Date.now()
  const colorModes = ['dreamy', 'vibrant', 'gray']
  let colorModeIndex = 0

  // パレット
  const dreamyPalette = ['#d9a7eb', '#c36ee0', '#b14de3', '#9d46c0', '#794fa0', '#ffb6e6', '#ffc8f0', '#ffdff9', '#ffe6fc', '#ffffff', '#a7ffd9', '#d9ffd9', '#ffffcc', '#faffc8', '#ffe6e6']
  const vibrantPalette = ['#ff5f6d', '#ffc371', '#47e4c2', '#6a82fb', '#fbc2eb', '#f6d365', '#a1c4fd', '#c2e9fb', '#89f7fe', '#66a6ff']
  const grayPalette = ['#000000', '#222222', '#444444', '#666666', '#888888', '#AAAAAA', '#CCCCCC', '#EEEEEE', '#FFFFFF']
  const metallicPalette = ['#d9a7eb', '#c36ee0', '#b14de3', '#9d46c0', '#794fa0', '#ffb6e6', '#ffc8f0', '#ffdff9', '#ffe6fc', '#ffffff', '#a7ffd9', '#d9ffd9', '#ffffcc', '#faffc8', '#ffe6e6']
  const glitterPalette = ['#e0b0ff', '#dda0dd', '#ff69b4', '#adff2f', '#ffffe0', '#fffacd']
  const flowerPalette = ['#ff3cac', '#784ba0', '#2b86c5', '#f7971e', '#ffd200', '#21d4fd', '#b721ff', '#fdc830', '#f37335', '#ffb199']

  const modeMap = {
    f: 'normal', g: 'fusion', h: 'sparkle', i: 'outerspin',
    j: 'wave', k: 'ambientbw', l: 'universe', m: 'fusionburst',
    n: 'mirrorburst', b: 'burstgrid', v: 'kaleidoFlower'
  }

  // 回転速度（人操作はtarget、現在値はfactor）
  let rotationSpeedFactor = 1
  let rotationSpeedTarget = 1

  function vary() {
    if (fixedMode) return
    const modes = [...Object.values(modeMap), 'ambientbw']
    currentMode = modes[Math.floor(Math.random() * modes.length)]
    grow = ['fusion', 'sparkle', 'universe', 'fusionburst', 'mirrorburst', 'burstgrid', 'kaleidoFlower'].includes(currentMode)
  }

  function updateShape() {
    const now = Date.now()
    if (now - lastShapeChange > 8000) {
      shapeIndex = (shapeIndex + 1) % shapeList.length
      lastShapeChange = now
    }
  }

  function updateColorMode() {
    const now = Date.now()
    if (now - lastColorChange > 10000) {
      colorModeIndex = (colorModeIndex + 1) % colorModes.length
      colorMode = colorModes[colorModeIndex]
      lastColorChange = now
    }
  }

  function updateTempoScale(spectrum) {
    const tempo = estimateTempoIntensity(spectrum)
    tempoScale += (tempo * 2.0 - tempoScale) * 0.05
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase()
    if (key === 'a') { currentMode = 'ambientbw'; grow = false }
    if (key === 's') { fixedBW = true; currentMode = 'ambientbw'; grow = false }
    if (key === 'd') { fixedBW = false; currentMode = 'normal'; vary() }
    if (key === 'r') { fixedMode = false; vary() }
    if (key === 'z') { baseDirection = -1; rotationSpeedTarget *= 1.2 }
    if (key === 'c') { baseDirection = 1; rotationSpeedTarget *= 1.2 }
    if (key === 'x') { rotationSpeedTarget /= 1.2 }
    if (key === 'q') colorMode = 'vibrant'
    if (key === 'w') colorMode = 'dreamy'
    if (key === 'e') colorMode = 'gray'
    if (key === 'n') {
      currentMode = 'mirrorburst'
      colorMode = 'metallic'
      fixedMode = true
      grow = true
    }
    if (key === 'b') {
      currentMode = 'burstgrid'
      colorMode = 'vibrant'
      fixedMode = true
      grow = true
    }
    if (key === 'v') {
      currentMode = 'kaleidoFlower'
      fixedMode = true
      grow = true
    }
    if (key === 't' || key === 'y') useCircleMask = !useCircleMask
    if (modeMap[key]) {
      currentMode = modeMap[key]
      grow = ['fusion', 'sparkle', 'universe', 'fusionburst', 'mirrorburst', 'burstgrid', 'kaleidoFlower'].includes(currentMode)
      fixedMode = true
    }
    if (key === 'y') shapeScale *= 1.2
    if (key === 'u') shapeScale /= 1.2
  })

  function detectTransition(spectrum) {
    let diff = 0
    for (let i = 0; i < spectrum.length; i++)
      diff += Math.abs((spectrum[i] || 0) - (lastSpectrum[i] || 0))
    lastSpectrum = spectrum.slice()
    return diff / spectrum.length > 25 && Date.now() - lastTransitionTime > 500
  }

  function updateRings() {
    const now = Date.now()
    if (now - lastRingChange > 10000) {
      ringCount = 2 + Math.floor(Math.random() * 3)
      baseDirection *= Math.random() < 0.3 ? -1 : 1
      lastRingChange = now
    }
  }

  function estimateTempoIntensity(spectrum) {
    let sum = 0
    for (let i = 8; i < 40; i++) {
      sum += spectrum[i] || 0
    }
    return clamp(sum / 32 / 255, 0.1, 1.0)
  }

  function drawShape(ctx, x, y, r, intensity, type = 'star') {
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    const radius = r * intensity

    switch (type) {
      case 'circle':
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        break
      case 'triangle':
        for (let i = 0; i < 3; i++) {
          const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2
          const px = Math.cos(angle) * radius
          const py = Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        break
      case 'square':
        const side = radius * Math.SQRT1_2
        ctx.rect(-side, -side, side * 2, side * 2)
        break
      case 'star16':
        for (let i = 0; i < 32; i++) {
          const angle = (i * Math.PI) / 16
          const rad = i % 2 === 0 ? radius : radius * 0.4
          ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
        }
        ctx.closePath()
        break
      default: // 5-point star
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5
          const rad = i % 2 === 0 ? radius : radius * 0.5
          ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
        }
        ctx.closePath()
        break
    }

    ctx.fill()
    ctx.restore()
  }

  function draw(spectrum) {
    const now = Date.now()
    const centerX = cv.width / 2
    const centerY = cv.height / 2
    const maxRadius = Math.min(cv.width, cv.height) / 2

    if (!fixedBW && detectTransition(spectrum)) {
      lastTransitionTime = now
      vary()
    }

    updateRings()
    updateShape()
    updateColorMode()
    updateTempoScale(spectrum)

    // テンポから自動速度調整（自動変化はtargetのみに反映）
    const tempoIntensity = estimateTempoIntensity(spectrum)
    const desiredAutoSpeed = 1 + (tempoIntensity - 0.1) * 2 // 1～3程度
    if (rotationSpeedTarget < desiredAutoSpeed) {
      rotationSpeedTarget += (desiredAutoSpeed - rotationSpeedTarget) * 0.05
    } else if (rotationSpeedTarget > 1) {
      rotationSpeedTarget += (1 - rotationSpeedTarget) * 0.005
    }
    rotationSpeedFactor += (rotationSpeedTarget - rotationSpeedFactor) * 0.02

    hueOffset += 0.25
    ctx.save()

    ctx.clearRect(0, 0, cv.width, cv.height)

    if (useCircleMask) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, cv.width, cv.height)
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.clip('evenodd')
      ctx.clearRect(0, 0, cv.width, cv.height)  // 透明にクリア
      ctx.restore()

      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2)
      ctx.clip()
    }

    const ringWidth = maxRadius / ringCount
    const speed = clamp((spectrum[2] || 0) / 255, 1, 1.0)
    rotation += 0.002 * speed * rotationSpeedFactor

    const step = 20
    const diagLength = Math.sqrt(cv.width ** 2 + cv.height ** 2)
    const expandedSize = diagLength + step * 4
    const gridCols = Math.ceil(expandedSize / step)
    const gridRows = Math.ceil(expandedSize / step)
    const offsetX = centerX - (gridCols * step) / 2
    const offsetY = centerY - (gridRows * step) / 2

    const palette =
      currentMode === 'mirrorburst' ? glitterPalette :
      currentMode === 'kaleidoFlower' ? flowerPalette :
      colorMode === 'dreamy' ? dreamyPalette :
      colorMode === 'vibrant' ? vibrantPalette :
      colorMode === 'metallic' ? metallicPalette :
      grayPalette

    const isKaleido = currentMode === 'kaleidoFlower'

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = offsetX + col * step + step / 2
        const y = offsetY + row * step + step / 2
        const dx = x - centerX
        const dy = y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const norm = clamp(dist / maxRadius, 0, 1)
        const ringIndex = Math.floor(norm * ringCount)
        let dir = ((ringIndex % 2 === 0) ? 1 : -1) * baseDirection
        const angle = Math.atan2(dy, dx) + rotation * dir
        const rotX = centerX + Math.cos(angle) * dist
        const rotY = centerY + Math.sin(angle) * dist

        const index = Math.floor(norm * (spectrum.length - 1))
        let fill = palette[Math.floor(norm * (palette.length - 1))]
        if (currentMode === 'ambientbw') fill = index % 2 === 0 ? '#fff' : '#000'
        if (currentMode === 'sparkle' && Math.random() < 0.03) fill = '#fff'
        ctx.fillStyle = fill

        // --- 大きさの最低値も上げてあります ---
        const intensity = grow ? (spectrum[index] || 0) / 255 / 2 + 1.6 : 1.0
        let size = Math.max(step * intensity, 26)

        let drawX = rotX
        let drawY = rotY

        if (isKaleido) {
          const petals = 12
          const petalRadius = maxRadius * 0.85 * norm
          const petalAngle = (2 * Math.PI / petals) * Math.round(angle * petals / (2 * Math.PI))
          drawX = centerX + Math.cos(petalAngle + rotation * 2) * petalRadius
          drawY = centerY + Math.sin(petalAngle + rotation * 2) * petalRadius
          size *= 1.5 + Math.sin(norm * 10 + now / 350) * 0.5
          ctx.globalAlpha = 0.8 - 0.6 * norm
        }

        if (['fusion', 'fusionburst', 'mirrorburst', 'burstgrid'].includes(currentMode)) {
          const baseFactor = currentMode === 'fusionburst' ? 0.3 : currentMode === 'mirrorburst' ? 0.25 + Math.sin(now / 700) * 0.2 : 0.15
          const dirFactor = Math.sin(now / 500 + norm * 10)
          drawX += (centerX - drawX) * dirFactor * baseFactor
          drawY += (centerY - drawY) * dirFactor * baseFactor
        }

        if (currentMode === 'wave') {
          drawY += Math.sin(now / 300 + dx / 20) * 5
        }

        if (currentMode === 'universe') {
          drawX += Math.sin(norm * 20 + now / 200) * 2
          drawY += Math.cos(norm * 10 + now / 300) * 2
        }

        const totalScale = shapeScale * tempoScale
        drawShape(ctx, drawX, drawY, size / 2 * totalScale, intensity, isKaleido ? 'star16' : shapeList[shapeIndex])
        if (isKaleido) ctx.globalAlpha = 1.0
      }
    }

    ctx.restore()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  const resize = () => {
    cv.width = window.innerWidth
    cv.height = window.innerHeight
  }

  window.addEventListener('resize', resize)
  resize()
  vary()

  return Object.freeze({ dampen, vary, resize, draw })
}
