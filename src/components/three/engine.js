// A tiny WebGL host: one canvas, one render loop that only runs while the canvas is on screen and the tab is visible,
// pointer tracking, and a full cleanup. Scenes are plain functions that return { update, resize, dispose }.
import { CanvasTexture, Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three'

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
export const isDark = () => { const c = new Color(cssVar('--bg') || '#070c10'); return (c.r + c.g + c.b) / 3 < 0.5 }
export const palette = () => ['--aurora-1', '--aurora-2', '--aurora-3', '--aurora-4'].map((n) => new Color(cssVar(n) || '#3fd6e6'))

let glowTex
/** A soft round glow, drawn once and shared. */
export function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  glowTex = new CanvasTexture(c)
  return glowTex
}

/** Returns a dispose function, or null when WebGL is not available. */
export function mountScene(host, factory, { fov = 40, z = 8 } = {}) {
  let renderer
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  host.appendChild(canvas)
  const scene = new Scene()
  const camera = new PerspectiveCamera(fov, 1, 0.1, 100)
  camera.position.z = z
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, cx: -999, cy: -999, inside: false, scroll: 0 }
  const api = factory({ scene, camera, renderer, host, pointer }) || {}

  let w = 1
  let h = 1
  const resize = () => {
    w = host.clientWidth || 1
    h = host.clientHeight || 1
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    api.resize?.(w, h)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  let visible = true
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
  io.observe(host)
  const move = (e) => {
    const r = host.getBoundingClientRect()
    pointer.cx = e.clientX - r.left
    pointer.cy = e.clientY - r.top
    pointer.inside = pointer.cx >= 0 && pointer.cy >= 0 && pointer.cx <= r.width && pointer.cy <= r.height
    pointer.tx = Math.max(-1, Math.min(1, (pointer.cx / r.width - 0.5) * 2))
    pointer.ty = Math.max(-1, Math.min(1, (pointer.cy / r.height - 0.5) * 2))
  }
  window.addEventListener('pointermove', move, { passive: true })

  let raf = 0
  let last = performance.now()
  let t = 0
  const loop = (now) => {
    raf = requestAnimationFrame(loop)
    if (!visible || document.hidden) { last = now; return }
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    t += dt
    const k = Math.min(1, dt * 4)
    pointer.x += (pointer.tx - pointer.x) * k
    pointer.y += (pointer.ty - pointer.y) * k
    pointer.scroll = window.scrollY
    api.update?.(t, dt, pointer, { w, h })
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    io.disconnect()
    window.removeEventListener('pointermove', move)
    api.dispose?.()
    scene.traverse((o) => {
      o.geometry?.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      for (const m of mats) m.dispose?.()
    })
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
  }
}
