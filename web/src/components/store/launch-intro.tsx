import './launch-intro.css';

/**
 * Storefront launch intro — once per browser session, pure CSS so it paints with the server HTML
 * (no white flash, no hydration needed). Mirrors the app's intro: the logo springs up with a glow and rings,
 * corner brackets snap on, a burst of parts and paper confetti, "Unibody" pops in letter by letter, then
 * three torn-paper curtains split to reveal the page.
 *
 * - Skipped for returning visitors this session, for crawlers, and without JS (<noscript>).
 * - Without JS it still ends on its own (animation fill), so content is never blocked.
 * - Tap / click / any key skips straight to the reveal. prefers-reduced-motion gets a 0.25 s fade.
 */

const jitter = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const COLORS = ['#5e5ce6', '#af52de', '#ff375f', '#2997ff', '#ffffff'];
const WORD = 'Unibody'.split('');

const PARTICLES = Array.from({ length: 26 }, (_, i) => {
  const kind = i % 3 === 0 ? 'paper' : i % 3 === 1 ? 'chip' : 'screw';
  const angle = (i / 26) * Math.PI * 2 + (jitter(i, 1) - 0.5) * 0.4;
  const dist = 130 + jitter(i, 2) * 150;
  return {
    kind,
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist + 40 + jitter(i, 5) * 50),
    rot: Math.round((jitter(i, 4) - 0.5) * 900),
    size: Math.round(kind === 'paper' ? 9 + jitter(i, 3) * 8 : 7 + jitter(i, 3) * 5),
    color: COLORS[i % COLORS.length],
  };
});

/** Zig-zag torn edge down the middle, as a clip-path for the left or right half. */
function tornClip(side: 'l' | 'r', seed: number) {
  const steps = 24;
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const dx = (i % 2 ? 1 : -1) * (6 + jitter(i, seed + 7) * 10) + (side === 'l' ? 1.5 : -1.5);
    return `calc(50% + ${dx.toFixed(1)}px) ${((i / steps) * 100).toFixed(2)}%`;
  });
  return side === 'l' ? `polygon(0 0, ${pts.join(', ')}, 0 100%)` : `polygon(100% 0, ${pts.join(', ')}, 100% 100%)`;
}

// Runs before the overlay paints: decide whether to show it, and wire skip.
const INIT = `(function(){try{var d=document.documentElement,s=sessionStorage;
if(s.getItem('ub-intro')||/bot|crawl|spider|slurp|lighthouse|pagespeed/i.test(navigator.userAgent)){d.classList.add('ub-intro-seen');return}
s.setItem('ub-intro','1');var t0=performance.now();
function skip(){var el=document.getElementById('ub-intro');if(!el||el.classList.contains('ub-skip'))return;
el.style.setProperty('--ub-exit',Math.round(performance.now()-t0)+'ms');el.classList.add('ub-skip')}
addEventListener('pointerdown',function h(e){var el=document.getElementById('ub-intro');if(el&&el.contains(e.target)){skip();removeEventListener('pointerdown',h,true)}},true);
addEventListener('keydown',function k(){skip();removeEventListener('keydown',k,true)},true);
addEventListener('animationend',function e(ev){var n=ev.animationName;if(n==='ub-gone'||n==='ub-fade'){d.classList.add('ub-intro-seen');removeEventListener('animationend',e,true)}},true);
}catch(e){}})();`;

export function StoreLaunchIntro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INIT }} />
      <noscript>
        <style>{'#ub-intro{display:none!important}'}</style>
      </noscript>
      <div id="ub-intro" aria-hidden="true">
        {['#ff375f', '#af52de', '#000000'].map((c, i) => (
          <div key={c} className="ub-curtain" style={{ ['--i' as string]: 2 - i, zIndex: i }}>
            <span className="ub-half ub-l" style={{ background: c, clipPath: tornClip('l', i) }} />
            <span className="ub-half ub-r" style={{ background: c, clipPath: tornClip('r', i) }} />
          </div>
        ))}
        <div className="ub-backdrop" />
        <div className="ub-content">
          <div className="ub-stage">
            <span className="ub-glow" />
            {[0, 1, 2].map((i) => (
              <span key={i} className="ub-ring" style={{ ['--i' as string]: i }} />
            ))}
            {PARTICLES.map((p, i) => (
              <span
                key={i}
                className={`ub-p ub-${p.kind}`}
                style={{ ['--tx' as string]: `${p.tx}px`, ['--ty' as string]: `${p.ty}px`, ['--rot' as string]: `${p.rot}deg`, ['--s' as string]: `${p.size}px`, ['--c' as string]: p.color }}
              />
            ))}
            <div className="ub-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              {[0, 1, 2, 3].map((c) => (
                <span key={c} className={`ub-bracket ub-b${c}`} />
              ))}
            </div>
          </div>
          <p className="ub-word">
            {WORD.map((ch, i) => (
              <span key={i} style={{ ['--i' as string]: i }}>
                {ch}
              </span>
            ))}
          </p>
          <p className="ub-tag">Genuine parts for every Mac</p>
        </div>
      </div>
    </>
  );
}
