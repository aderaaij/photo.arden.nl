precision highp float;

uniform sampler2D uTexture;
uniform float uVelocity;    // signed scroll velocity
uniform float uFocus;       // 0 = at the edge, 1 = dead center
uniform float uShift;       // signed normalized distance from center (-1..1)
uniform float uPlaneAspect; // plane width / height (fixed 2:3)
uniform float uImageAspect; // source image width / height

varying vec2 vUv;

#define BLOCKS 18.0 // horizontal block resolution for the snap grid
#define STEPS 5.0   // quantization steps — fewer = chunkier "snaps"

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 coverUv(vec2 uv) {
  vec2 r = vec2(
    min(uPlaneAspect / uImageAspect, 1.0),
    min(uImageAspect / uPlaneAspect, 1.0)
  );
  return (uv - 0.5) * r + 0.5;
}

// Blocks scatter (more when off-center or scrolling fast) and quantize-snap into
// place, staggered per block, as the cover reaches center.
void main() {
  vec2 baseUv = coverUv(vUv);

  float disorder = clamp((1.0 - uFocus) + abs(uVelocity) * 1.2, 0.0, 1.0);

  vec2 grid = vec2(BLOCKS, BLOCKS / uPlaneAspect);
  vec2 cell = floor(vUv * grid);
  float rnd = hash(cell);

  float stagger = rnd * 0.45;
  float local = clamp((disorder - stagger) / (1.0 - stagger), 0.0, 1.0);
  float stepped = ceil(local * STEPS) / STEPS;

  float ang = rnd * 6.28318530718;
  vec2 dir = vec2(cos(ang), sin(ang));
  dir.x += uShift;
  vec2 uv = baseUv + dir * stepped * 0.08;

  float amt = clamp(abs(uVelocity) * 0.6, 0.0, 0.04);
  vec2 ca = vec2(sign(uVelocity), 0.0) * amt;

  float r = texture2D(uTexture, uv + ca).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, uv - ca).b;

  vec3 col = vec3(r, g, b);
  col *= mix(0.45, 1.0, uFocus);

  gl_FragColor = vec4(col, 1.0);
}
