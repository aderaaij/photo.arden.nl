precision highp float;

uniform sampler2D uText;   // white text on transparent, in the plane's box
uniform vec3 uColor;       // ink — gallery theme fg
uniform float uReveal;     // 0 = scattered/invisible, 1 = merged sharp
uniform float uTravel;     // max slice offset (box-height fraction, both axes)
uniform vec2 uBlocks;      // slice grid resolution (cols, rows)
uniform float uAspect;     // plane height / width — scales x offsets to match y
uniform float uSmear;      // grainy directional blur length while out of place
uniform float uGrain;      // grain dropout inside the smear while out of place
uniform float uStagger;    // per-slice reveal stagger
uniform float uFadeIn;     // portion of the reveal spent fading up from nothing
uniform float uWobble;     // slice-cut waviness: 0 = straight cuts, 1 = hand-torn

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + 17.17));
}

// Smooth 2D value noise — used to warp the slice grid so nothing reads as
// ruler-straight squares.
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Position-driven reveal: while out of place the type is cut into slices that
// slide apart in both axes, each smeared along its slide into noisy film-grain.
// As the header scrolls to its anchor everything converges and the grain
// resolves into clean type. Reverses on scroll up.
void main() {
  // Optionally warp the grid lookup so slice cuts wander instead of running
  // grid-straight; at 0 the cuts stay crisp and rectangular.
  vec2 wob = (vec2(
    vnoise(vUv * uBlocks * 1.6),
    vnoise(vUv * uBlocks * 1.6 + 19.19)
  ) - 0.5) / uBlocks * (0.4 * uWobble);
  vec2 cuv = vUv + wob;
  vec2 cell = floor(cuv * uBlocks);

  // Staggered per-slice progress: slices merge at slightly different times.
  float st = hash(cell + 2.3) * uStagger;
  float local = clamp((uReveal - st) / max(1.0 - st, 0.001), 0.0, 1.0);
  local = smoothstep(0.0, 1.0, local);
  float disasm = 1.0 - local; // 1 = scattered, 0 = merged

  // Per-slice 2D slide, measured in box-height units on both axes.
  vec2 dir = hash2(cell + 5.7) * 2.0 - 1.0;
  float mag = 0.35 + 0.65 * hash(cell + 7.3);
  vec2 off = dir * (uTravel * mag * disasm);
  vec2 base = vUv + vec2(off.x * uAspect, off.y);

  // Grainy directional smear: a few samples jittered along the slide direction
  // (plus a touch across it), averaged into a soft noisy streak.
  vec2 along = dir * (uSmear * (0.4 + 0.6 * mag) * disasm);
  along.x *= uAspect;
  vec2 across = vec2(-along.y, along.x) * 0.3;
  float soft = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ja = hash(vUv * 731.7 + fi * 13.13) - 0.5;
    float jb = hash(vUv * 521.3 + fi * 27.77) - 0.5;
    soft += texture2D(uText, base + along * ja + across * jb).a;
  }
  soft *= 0.25;

  // Thin the streak out while scattered — unevenly per slice, so some slices
  // hold as near-solid blocks while others dissolve fully into dust.
  float sliceGrain = uGrain * (0.35 + 1.1 * hash(cell + 11.1));
  soft *= 1.0 - clamp(disasm * sliceGrain, 0.0, 0.92) * hash(vUv * 379.1);

  // Dither the soft streak into pixel grain while out of place; resolve to the
  // cleanly sampled type as the slice merges. Weighting by the streak density
  // keeps near-empty cells truly empty instead of hazed with stray dust.
  float g = hash(gl_FragCoord.xy * 0.6173);
  float grainy = step(g, soft) * smoothstep(0.02, 0.22, soft);
  float sharp = texture2D(uText, base).a;
  float ink = mix(sharp, grainy, disasm);

  // Fade the whole header up from nothing over the first stretch of the reveal.
  float fadeIn = smoothstep(0.0, max(uFadeIn, 0.001), uReveal);

  float a = clamp(ink, 0.0, 1.0) * fadeIn;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
