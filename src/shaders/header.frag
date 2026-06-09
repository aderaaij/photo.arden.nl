precision highp float;

uniform sampler2D uText;   // white text on transparent, in the plane's box
uniform vec3 uColor;       // ink — gallery theme fg
uniform float uReveal;     // 0 = scattered/invisible, 1 = merged sharp
uniform float uTravel;     // max vertical column slide (box-height fraction)
uniform float uColumns;    // column count across the plane
uniform float uSmear;      // vertical grainy smear length while out of place
uniform float uGrain;      // grain dropout inside the smear while out of place
uniform float uStagger;    // per-column reveal stagger
uniform float uFadeIn;     // portion of the reveal spent fading up from nothing
uniform float uDpr;        // device pixel ratio — keeps grain sized in CSS pixels

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Position-driven reveal, monokai style: the type is cut into vertical columns.
// While out of place each column is slid vertically — some up,
// some down, by different amounts — and smeared along its slide into a long
// streak of film grain. As the header scrolls to its anchor the columns glide
// into register at their own staggered rates and the grain resolves into clean
// type. No horizontal movement anywhere. Reverses on scroll up.
void main() {
  // Device pixels quantized to CSS pixels, so grain particles render the same
  // physical size on 1x and high-DPI screens.
  vec2 pix = floor(gl_FragCoord.xy / uDpr);

  float col = floor(vUv.x * uColumns);

  // Staggered per-column progress: columns settle at slightly different times,
  // which doubles as per-column parallax speed while scrolling.
  float st = hash(vec2(col, 2.3)) * uStagger;
  float local = clamp((uReveal - st) / max(1.0 - st, 0.001), 0.0, 1.0);
  local = smoothstep(0.0, 1.0, local);
  float disasm = 1.0 - local; // 1 = displaced, 0 = in register

  // Vertical-only slide, up or down per column, magnitude varied per column.
  float dirY = hash(vec2(col, 5.7)) < 0.5 ? -1.0 : 1.0;
  float mag = 0.35 + 0.65 * hash(vec2(col, 7.3));
  float off = dirY * uTravel * mag * disasm;
  vec2 base = vUv + vec2(0.0, off);

  // Grainy vertical smear: jittered samples spread along the slide axis,
  // averaged into a long soft streak that contracts as the column settles.
  float len = uSmear * (0.4 + 0.6 * mag) * disasm;
  float soft = 0.0;
  for (int i = 0; i < 6; i++) {
    float j = hash(pix * 0.7177 + float(i) * 13.13) - 0.5;
    soft += texture2D(uText, base + vec2(0.0, len * j)).a;
  }
  soft /= 6.0;

  // Thin the streak out while displaced — unevenly per column, so some columns
  // hold near-solid while others dissolve fully into dust.
  float colGrain = uGrain * (0.35 + 1.1 * hash(vec2(col, 11.1)));
  soft *= 1.0 - clamp(disasm * colGrain, 0.0, 0.92) * hash(pix * 0.3791);

  // Dither the soft streak into pixel grain while out of place; resolve to the
  // cleanly sampled type as the column merges. Weighting by streak density
  // keeps near-empty regions truly empty instead of hazed with stray dust.
  float g = hash(pix * 0.6173);
  float grainy = step(g, soft) * smoothstep(0.02, 0.22, soft);
  float sharp = texture2D(uText, base).a;
  float ink = mix(sharp, grainy, disasm);

  // Fade the whole header up from nothing over the first stretch of the reveal.
  float fadeIn = smoothstep(0.0, max(uFadeIn, 0.001), uReveal);

  float a = clamp(ink, 0.0, 1.0) * fadeIn;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
