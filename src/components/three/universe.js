// A person's open source universe: every project is a star around their grade-coloured core.
// Size follows how well known the project is and how many pull requests were merged; colour follows its main language.
import {
  AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial,
  NormalBlending, Object3D, Points, PointsMaterial, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, Vector3,
} from 'three'
import { glowTexture, isDark, palette } from './engine.js'

const GRADE = { S: '#ffd166', A: '#3fd6e6', B: '#5b8def', C: '#a78bfa', D: '#9aa5ad' }
const GOLD = Math.PI * (3 - Math.sqrt(5))

export default function universe({ scene, camera, pointer }, { repos, colors, grade, onHover }) {
  const pal = palette()
  const dark = isDark()
  const blending = dark ? AdditiveBlending : NormalBlending
  const list = repos.slice(0, 90)
  const n = list.length
  const root = new Group()
  scene.add(root)

  const weights = list.map((r) => Math.log10((r.stars || 0) + 10) * Math.sqrt(r.prs || 1))
  const wMax = Math.max(...weights, 1)
  const nodes = list.map((r, i) => {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2
    const rr = Math.sqrt(Math.max(0, 1 - y * y))
    const phi = i * GOLD
    const radius = 1.9 + ((i * 37) % 11) / 11 * 1.1
    const size = 0.05 + 0.15 * Math.sqrt(weights[i] / wMax)
    const color = new Color(colors[r.language] || pal[i % 4])
    return { r, pos: new Vector3(Math.cos(phi) * rr * radius, y * radius * 0.92, Math.sin(phi) * rr * radius), size, color }
  })

  const geo = new SphereGeometry(1, 18, 14)
  const stars = new InstancedMesh(geo, new MeshBasicMaterial({ color: 0xffffff }), n)
  const halos = new InstancedMesh(geo, new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: dark ? 0.09 : 0.1, blending, depthWrite: false }), n)
  const m = new Matrix4()
  const dummy = new Object3D()
  const place = (i, boost = 1) => {
    const nd = nodes[i]
    dummy.position.copy(nd.pos)
    dummy.scale.setScalar(nd.size * boost)
    dummy.updateMatrix()
    stars.setMatrixAt(i, dummy.matrix)
    dummy.scale.setScalar(nd.size * 2.1 * boost)
    dummy.updateMatrix()
    halos.setMatrixAt(i, dummy.matrix)
  }
  nodes.forEach((nd, i) => { place(i); stars.setColorAt(i, nd.color); halos.setColorAt(i, nd.color) })
  root.add(halos, stars)

  const lp = []
  for (const nd of nodes) lp.push(0, 0, 0, nd.pos.x, nd.pos.y, nd.pos.z)
  const lg = new BufferGeometry()
  lg.setAttribute('position', new Float32BufferAttribute(lp, 3))
  root.add(new LineSegments(lg, new LineBasicMaterial({ color: pal[0], transparent: true, opacity: dark ? 0.2 : 0.28, blending, depthWrite: false })))

  const gc = new Color(GRADE[grade] || GRADE.B)
  const centre = new Mesh(new SphereGeometry(0.46, 28, 20), new MeshBasicMaterial({ color: gc }))
  const halo = new Sprite(new SpriteMaterial({ map: glowTexture(), color: gc, transparent: true, opacity: dark ? 0.8 : 0.45, blending, depthWrite: false }))
  halo.scale.set(3.4, 3.4, 1)
  const ringA = new Mesh(new TorusGeometry(0.78, 0.01, 6, 120), new MeshBasicMaterial({ color: gc, transparent: true, opacity: 0.8, blending }))
  const ringB = new Mesh(new TorusGeometry(0.98, 0.006, 6, 120), new MeshBasicMaterial({ color: gc, transparent: true, opacity: 0.45, blending }))
  root.add(centre, halo, ringA, ringB)

  // Dust.
  const D = 500
  const dp = new Float32Array(D * 3)
  for (let i = 0; i < D; i++) {
    const rad = 3.4 + ((i * 53) % 100) / 100 * 4
    const th = i * 2.399
    const ph = Math.acos(1 - 2 * (((i * 31) % 997) / 997))
    dp.set([rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph) * 0.8, rad * Math.sin(ph) * Math.sin(th)], i * 3)
  }
  const dg = new BufferGeometry()
  dg.setAttribute('position', new Float32BufferAttribute(dp, 3))
  const dust = new Points(dg, new PointsMaterial({ size: 0.035, color: pal[1], transparent: true, opacity: dark ? 0.6 : 0.45, blending, depthWrite: false }))
  scene.add(dust)

  let hot = -1
  let lx = -1
  let ly = -1
  let spin = 1
  let size = { w: 1, h: 1 }
  const v = new Vector3()
  return {
    resize(w, h) { size = { w, h }; root.scale.setScalar(h < 340 ? 0.9 : 1.18) },
    update(t, dt, p, s) {
      size = s
      spin += ((hot >= 0 ? 0.12 : 1) - spin) * Math.min(1, dt * 3)
      root.rotation.y += dt * 0.16 * spin
      root.rotation.x = Math.sin(t * 0.25) * 0.12 + p.y * 0.22
      root.rotation.z = p.x * 0.06
      ringA.rotation.set(t * 0.4, t * 0.25, 0)
      ringB.rotation.set(-t * 0.2, t * 0.35, 0.6)
      centre.scale.setScalar(1 + Math.sin(t * 1.8) * 0.04)
      dust.rotation.y = -t * 0.02
      // Which star is under the pointer? Project each one to the screen and take the closest within reach.
      let best = -1
      let bd = 1e9
      if (p.inside) {
        root.updateMatrixWorld()
        for (let i = 0; i < n; i++) {
          v.copy(nodes[i].pos).applyMatrix4(root.matrixWorld).project(camera)
          const sx = (v.x * 0.5 + 0.5) * size.w
          const sy = (-v.y * 0.5 + 0.5) * size.h
          const d = Math.hypot(sx - p.cx, sy - p.cy)
          const reach = 16 + nodes[i].size * 40
          if (d < reach && d < bd) { bd = d; best = i }
        }
      }
      if (best !== hot) {
        if (hot >= 0) place(hot)
        if (best >= 0) place(best, 1.7)
        stars.instanceMatrix.needsUpdate = true
        halos.instanceMatrix.needsUpdate = true
        hot = best
        lx = ly = -1
        if (best < 0) onHover?.(null)
      }
      // The label follows the star while the pointer rests on it, but only re-renders when it has really moved.
      if (best >= 0) {
        v.copy(nodes[best].pos).applyMatrix4(root.matrixWorld).project(camera)
        const sx = (v.x * 0.5 + 0.5) * size.w
        const sy = (-v.y * 0.5 + 0.5) * size.h
        if (Math.hypot(sx - lx, sy - ly) > 2) { lx = sx; ly = sy; onHover?.(nodes[best].r, sx, sy) }
      }
    },
  }
}
