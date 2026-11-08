/** A pure CSS 3D cube: no library, turns slowly, speeds up under the pointer. */
export default function Cube3D({ size = 120, faces = ['S', 'A', 'B', 'C', 'D', '✓'] }) {
  return (
    <div className="cube" style={{ '--s': `${size}px` }} aria-hidden="true">
      <div className="cube__in">
        {faces.map((f, i) => <span key={i} className={`cube__f cube__f--${i}`}>{f}</span>)}
      </div>
    </div>
  )
}
