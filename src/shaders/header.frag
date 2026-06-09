precision highp float;

uniform sampler2D uText;   // white text on transparent, in the plane's box
uniform vec3 uColor;       // gallery theme foreground
uniform float uReveal;     // 0 = scattered into grain, 1 = clicked into place (sharp)
uniform float uTravel;     // max vertical slice offset (box-height fraction)
uniform vec2 uBlocks;      // block grid resolution (cols, rows) — chunky slices
uniform float uFade;       // how strongly an out-of-place slice thins to grain
uniform vec2 uPixel;       // grain grid resolution
uniform float uStagger;    // per-slice reveal stagger
uniform float uDot;        // particle fill within its cell (smaller = more gap = finer dust)

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Position-driven reveal: as the header scrolls toward its anchor, uReveal goes
// 0 → 1 and each slice clicks into place (staggered). While out of place the text
// scatters into discrete square GRAIN — each cell draws a small square with a gap
// around it (so particles read as separate dots, not solid blocks), most drop out,
// and they all snap back into clean type as the header settles. Reverses on scroll up.
void main() {
  vec2 cell = floor(vUv * uBlocks);
  float dir = hash(cell) * 2.0 - 1.0;          // -1..1: slide direction
  float mag = 0.35 + 0.65 * hash(cell + 7.3);  // 0.35..1: slide distance

  // Staggered per-slice progress so slices arrive at slightly different times.
  float st = hash(cell + 2.3) * uStagger;
  float local = clamp((uReveal - st) / max(1.0 - st, 0.001), 0.0, 1.0);
  local = smoothstep(0.0, 1.0, local);
  float disasm = 1.0 - local; // 1 = scattered, 0 = settled

  vec2 base = vec2(vUv.x, vUv.y + dir * uTravel * mag * disasm);

  // `grain` (uFade) is the master grain amount: at 0 the slices stay crisp solid
  // blocks (clean slice look); above 0 the quantize / gap / dropout fade in.
  float grainOn = clamp(uFade, 0.0, 1.0);

  // Grain cell.
  vec2 g = base * uPixel;
  vec2 cellId = floor(g);
  vec2 cellLocal = fract(g) - 0.5;

  // Crisp full-res when settled (or grain off); quantized to the cell otherwise.
  vec2 sampleUv = mix(base, (cellId + 0.5) / uPixel, disasm * grainOn);
  float tex = texture2D(uText, sampleUv).a;

  // Particle square: fills the cell when settled / grain off, shrinks to a gapped
  // dot when scattered, so the grains become discrete points not solid blocks.
  float dotHalf = mix(0.5, mix(0.5, uDot, grainOn), disasm);
  float dotShape = step(max(abs(cellLocal.x), abs(cellLocal.y)), dotHalf);

  // Thin the grain out while scattered; all of it returns as it settles.
  float fade = clamp(disasm * uFade, 0.0, 0.97);
  float keep = step(fade, hash(cellId + 0.5));

  float a = tex * dotShape * keep;
  if (a < 0.02) discard;
  gl_FragColor = vec4(uColor, a);
}
