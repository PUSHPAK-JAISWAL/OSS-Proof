// The home page hero: a glowing crystal core with orbiting rings, tiny "pull request" planets and a field of drifting stars.
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, DodecahedronGeometry, EdgesGeometry, Float32BufferAttribute, Group, IcosahedronGeometry,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, NormalBlending, OctahedronGeometry, Points, PointsMaterial, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry,
} from 'three'
import { glowTexture, isDark, palette } from './engine.js'

const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647) })()

export default function core({ scene }) {
  const pal = palette()
  const dark = isDark()
  const blending = dark ? AdditiveBlending : NormalBlending
  const root = new Group()
  scene.add(root)
  const model = new Group()
  root.add(model)

  const line = (geo, color, opacity) => new LineSegments(new EdgesGeometry(geo), new LineBasicMaterial({ color, transparent: true, opacity, blending }))

  const ico = new IcosahedronGeometry(1.15, 1)
  const inner = new Mesh(ico, new MeshBasicMaterial({ color: pal[0], transparent: true, opacity: dark ? 0.1 : 0.14, blending, depthWrite: false }))
  const innerEdges = line(ico, pal[0], 0.95)
  const outer = line(new DodecahedronGeometry(1.7, 0), pal[1], 0.55)
  model.add(inner, innerEdges, outer)

  const halo = new Sprite(new SpriteMaterial({ map: glowTexture(), color: pal[0], transparent: true, opacity: dark ? 0.55 : 0.28, blending, depthWrite: false }))
  halo.scale.set(5.2, 5.2, 1)
  model.add(halo)

  // Rings with a planet each.
  const rings = []
  for (let i = 0; i < 3; i++) {
    const r = 2.05 + i * 0.5
    const g = new Group()
    g.rotation.set(0.9 + i * 0.7, 0.4 * i, i * 0.9)
    g.add(new Mesh(new TorusGeometry(r, 0.006, 6, 200), new MeshBasicMaterial({ color: pal[(i + 1) % 4], transparent: true, opacity: 0.7, blending })))
    const planet = new Mesh(new SphereGeometry(0.075 + i * 0.02, 16, 12), new MeshBasicMaterial({ color: pal[(i + 1) % 4] }))
    const glow = new Sprite(new SpriteMaterial({ map: glowTexture(), color: pal[(i + 1) % 4], transparent: true, opacity: 0.9, blending, depthWrite: false }))
    glow.scale.set(0.8, 0.8, 1)
    planet.add(glow)
    g.add(planet)
    model.add(g)
    rings.push({ g, planet, r, speed: 0.5 - i * 0.12 + 0.1, phase: i * 2.1 })
  }

  // Small wire shapes on their own orbits: the "projects".
  const sats = []
  const shapes = [() => new OctahedronGeometry(0.17), () => new BoxGeometry(0.22, 0.22, 0.22), () => new IcosahedronGeometry(0.17, 0)]
  for (let i = 0; i < 12; i++) {
    const pivot = new Group()
    pivot.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28)
    const mesh = line(shapes[i % 3](), pal[i % 4], 0.9)
    const dist = 2.5 + rnd() * 1.6
    mesh.position.x = dist
    pivot.add(mesh)
    model.add(pivot)
    sats.push({ pivot, mesh, speed: (0.12 + rnd() * 0.25) * (i % 2 ? 1 : -1), spin: 0.4 + rnd() })
  }

  // Stars.
  const N = 900
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const rad = 3 + rnd() * 6
    const th = rnd() * Math.PI * 2
    const ph = Math.acos(2 * rnd() - 1)
    pos.set([rad * Math.sin(ph) * Math.cos(th), rad * Math.sin(ph) * Math.sin(th) * 0.8, rad * Math.cos(ph)], i * 3)
    const c = pal[i % 4]
    col.set([c.r, c.g, c.b], i * 3)
  }
  const sg = new BufferGeometry()
  sg.setAttribute('position', new Float32BufferAttribute(pos, 3))
  sg.setAttribute('color', new Float32BufferAttribute(col, 3))
  const stars = new Points(sg, new PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: dark ? 0.85 : 0.6, blending, depthWrite: false }))
  root.add(stars)

  let aspect = 2
  return {
    resize(w, h) {
      aspect = w / h
      const wide = aspect > 1.25
      root.position.x = wide ? aspect * 1.25 : 0
      root.scale.setScalar(wide ? 1.25 : 0.8)
    },
    update(t, dt, p) {
      model.rotation.y = t * 0.2 + p.x * 0.55
      model.rotation.x = Math.sin(t * 0.3) * 0.16 + p.y * 0.35 + p.scroll * 0.0008
      innerEdges.rotation.y = -t * 0.35
      outer.rotation.set(t * 0.12, -t * 0.18, 0)
      const pulse = 1 + Math.sin(t * 1.7) * 0.035
      inner.scale.setScalar(pulse)
      halo.material.opacity = (dark ? 0.5 : 0.25) + Math.sin(t * 1.7) * 0.08
      for (const r of rings) {
        const a = t * r.speed + r.phase
        r.planet.position.set(Math.cos(a) * r.r, Math.sin(a) * r.r, 0)
      }
      for (const s of sats) {
        s.pivot.rotation.y += s.speed * dt
        s.mesh.rotation.x += s.spin * dt
        s.mesh.rotation.y += s.spin * 0.7 * dt
      }
      stars.rotation.y = t * 0.02 + p.x * 0.05
      stars.rotation.x = p.y * 0.03
      root.position.y = Math.min(p.scroll, 900) * 0.0035
    },
  }
}
