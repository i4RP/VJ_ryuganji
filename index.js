import vizRadialArcs from './lib/vizRadialArcs.js'
import vizRadialBars from './lib/vizRadialBars.js'
import vizFlyout     from './lib/vizFlyout.js'
import vizSunburst   from './lib/vizSunburst.js'
import vizBoxes      from './lib/vizBoxes.js'
import vizSpikes     from './lib/vizSpikes.js'
import vizImage      from './lib/vizImage.js'
import vizVertBars   from './lib/vizVerticalBars.js'
import multiview     from './lib/viz-multiview.js'

export default function visualizer (options={}) {
  const cv = document.createElement('canvas')

  let parent
  if (options.parent) {
    parent = (typeof options.parent === 'string') ? document.querySelector(options.parent) : options.parent
    parent.appendChild(cv)
  } else {
    cv.style.position = 'absolute'
    cv.style.left = '0'
    cv.style.top = '0'
    document.body.appendChild(cv)
    parent = window
  }

  const ctx = cv.getContext('2d')
  const image = options.image

  const visualizers = []
  let analyser, spectrum, audioCtx, currentViz = 0

  const fftSize = 256
  const bandCount = Math.round(fftSize / 3)
  const lastVolumes = []
  const rotateAmount = (Math.PI * 2.0) / bandCount

  const _getMediaStream = function (callback) {
    if (options.stream)
      return setTimeout(callback, 0, null, options.stream)

    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      .then(function (stream) {
        callback(null, stream)
      })
      .catch(function(e) {
        callback(e)
      })
  }

  const _init = function (stream) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    setMediaStream(stream)

    for (let i = 0; i < bandCount; i++)
      lastVolumes.push(0)

    const options = { cv, ctx, bandCount, rotateAmount, lastVolumes, image, fftSize }
    visualizers.push(vizVertBars(options))
    visualizers.push(vizRadialArcs(options))
    visualizers.push(vizRadialBars(options))
    visualizers.push(vizFlyout(options))
    visualizers.push(vizSunburst(options)) // index 4
    visualizers.push(vizBoxes(options))
    visualizers.push(vizSpikes(options))   // index 6
    visualizers.push(vizImage(options))
    visualizers.push(multiview(options))

    _recalculateSizes()
    requestAnimationFrame(_visualize)

    window.onresize = function() {
      _recalculateSizes()
    }
  }

  const addVisualization = function (viz) {
    const options = { cv, ctx, bandCount, rotateAmount, lastVolumes, image, fftSize }
    visualizers.push(viz(options))
  }

  const setMediaStream = function (stream) {
    const source = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.smoothingTimeConstant = 0.2
    analyser.fftSize = fftSize

    spectrum = new Uint8Array(analyser.frequencyBinCount)
    source.connect(analyser)
  }

  const showNextVisualization = function () {
    currentViz = (currentViz + 1) % visualizers.length
    _recalculateSizes()
  }

  const showVisualization = function (idx) {
    if (idx < 0) idx = 0
    if (idx >= visualizers.length) idx = visualizers.length - 1
    currentViz = idx
    _recalculateSizes()
  }

  const vary = function () {
    if (visualizers[currentViz].vary)
      visualizers[currentViz].vary()
  }

  const _recalculateSizes = function () {
    const ratio = window.devicePixelRatio || 1
    const w = parent.innerWidth || parent.clientWidth
    const h = parent.innerHeight || parent.clientHeight

    cv.width = w * ratio
    cv.height = h * ratio
    cv.style.width = w + 'px'
    cv.style.height = h + 'px'

    visualizers[currentViz].resize()
  }

  const _visualize = function () {
    analyser.getByteFrequencyData(spectrum)

    if (visualizers[currentViz].dampen === true)
      for (let i = 0; i < spectrum.length; i++)
        if (lastVolumes[i] > spectrum[i])
          spectrum[i] = (spectrum[i] + lastVolumes[i]) / 2

    visualizers[currentViz].draw(spectrum)
    requestAnimationFrame(_visualize)
  }

  _getMediaStream(function (err, stream) {
    if (err) {
      console.log(err)
      throw new Error('Unable to start visualization. Make sure you\'re using a modern browser with a microphone set up, and that you allow the page to access the microphone.')
    }
    _init(stream)
  })

  // 🔁 自動切り替え制御（追加部分）
  let autoSwitchIntervalId = null

  const startAutoSwitching = () => {
    if (autoSwitchIntervalId !== null) return
    autoSwitchIntervalId = setInterval(() => {
      const nextIdx = Math.random() < 0.5 ? 4 : 6
      showVisualization(nextIdx)
    }, 2000) // 切り替え間隔（ミリ秒）
  }

  const stopAutoSwitching = () => {
    if (autoSwitchIntervalId !== null) {
      clearInterval(autoSwitchIntervalId)
      autoSwitchIntervalId = null
    }
  }

  // 🎹 キーボード操作（追加部分）
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case '0':
        startAutoSwitching()
        break
      case '4':
        stopAutoSwitching()
        showVisualization(4)
        break
      case '6':
        stopAutoSwitching()
        showVisualization(6)
        break
    }
  })

  return Object.freeze({
    addVisualization,
    setMediaStream,
    showNextVisualization,
    showVisualization,
    vary
  })
}
