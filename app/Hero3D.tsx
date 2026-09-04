/**
 * A stack of exam cards floating in perspective.
 *
 * Pure CSS transforms, no WebGL and no library. The audience is Rwandan
 * candidates on phones and often on metered data - a three.js hero would cost
 * ~150KB gzipped, push out Largest Contentful Paint, and work against the
 * ranking this site is being built for. Transforms and opacity are composited
 * on the GPU, so this costs essentially nothing.
 */
export default function Hero3D() {
  const cards = [
    { letter: 'A', text: 'Verify the doctor’s remote access privileges', correct: true },
    { letter: 'B', text: 'Contact the insurance provider' },
    { letter: 'C', text: 'Remote access is unavailable' },
  ];

  return (
    <div className="hero3d" aria-hidden="true">
      <div className="hero3d-stage">
        {/* Back plates give the stack depth without carrying any content. */}
        <div className="hero3d-plate hero3d-plate-3" />
        <div className="hero3d-plate hero3d-plate-2" />

        <div className="hero3d-card">
          <div className="hero3d-head">
            <span className="hero3d-q">Question 1</span>
            <span className="hero3d-marks">1 mark</span>
          </div>
          <div className="hero3d-stem">
            A doctor cannot access the hospital system from home. What should you do?
          </div>
          {cards.map((c) => (
            <div key={c.letter} className={'hero3d-opt' + (c.correct ? ' is-correct' : '')}>
              <span className="hero3d-letter">{c.letter}</span>
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
