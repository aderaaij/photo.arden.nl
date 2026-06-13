uniform float uProgress;  // map scroll progress 0..1 (sticky wrapper)
uniform float uP0;        // this layer's reveal window start
uniform float uP1;        // …and end, within uProgress
uniform float uPointSize; // world-space dot diameter
uniform float uScale;     // px-per-world: heightPx * dpr / (2 tan(fov/2))
uniform float uPop;       // per-dot pop duration as a fraction of the window
uniform float uMorph;     // 0 = organized lattice (aOrigin), 1 = in place

attribute float aT;      // reveal order within the window (0..1)
attribute float aSize;   // per-dot size multiplier
attribute vec3 aOrigin;  // organized-lattice start position (intro morph)

varying float vA;

void main() {
  // Layer progress, then each dot pops in over a short slice of it — so the
  // layer reads as a wave (grainy fade, route draw) of individual dots.
  float p = clamp((uProgress - uP0) / max(uP1 - uP0, 1e-4), 0.0, 1.0);
  float a = clamp((p - aT) / max(uPop, 1e-4), 0.0, 1.0);
  a = 1.0 - pow(1.0 - a, 2.0);
  vA = a;

  // Intro morph: drift from the uniform lattice into place, staggered per dot
  // and eased to decelerate into the coastline.
  float m = clamp((uMorph - aT * 0.45) / 0.55, 0.0, 1.0);
  m = 1.0 - pow(1.0 - m, 3.0);
  vec3 pos = mix(aOrigin, position, m);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uPointSize * aSize * (0.4 + 0.6 * a) * uScale / max(-mv.z, 0.001);
  gl_Position = projectionMatrix * mv;
}
