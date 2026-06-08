precision highp float;

uniform sampler2D uTexture;
uniform float uVelocity;    // signed scroll velocity
uniform float uFocus;       // 0 = at the edge, 1 = dead center
uniform float uShift;       // signed normalized distance from center (-1..1)
uniform float uPlaneAspect; // plane width / height (fixed 2:3)
uniform float uImageAspect; // source image width / height
uniform float uBlocks;      // block grid resolution
uniform float uSteps;       // quantization steps
uniform float uDisplace;    // scatter distance
uniform float uAberration;  // chromatic aberration gain
uniform float uDim;         // off-center fade floor
uniform vec2 uParallax;       // in-frame hover pan offset (texture space)
uniform float uParallaxInset; // matching zoom-in so the pan has headroom
uniform float uHover;         // 0..1 hover amount (drives the inner frame shadow)
uniform float uShadow;        // inner shadow strength
uniform float uShadowWidth;   // how far the inner shadow reaches in from the edge

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Inner shadow fixed to the frame (see bend.frag): darkens toward the plane edge
// on hover so the panning photo reads as recessed inside its frame.
float frameShadow(vec2 uv) {
  float vig = smoothstep(0.0, uShadowWidth, min(uv.x, 1.0 - uv.x))
            * smoothstep(0.0, uShadowWidth, min(uv.y, 1.0 - uv.y));
  return 1.0 - uShadow * uHover * (1.0 - vig);
}

vec2 coverUv(vec2 uv) {
  vec2 r = vec2(
    min(uPlaneAspect / uImageAspect, 1.0),
    min(uImageAspect / uPlaneAspect, 1.0)
  );
  vec2 t = (uv - 0.5) * r * (1.0 - 2.0 * uParallaxInset);
  return t + 0.5 + uParallax;
}

// Blocks scatter (more when off-center or scrolling fast) and quantize-snap into
// place, staggered per block, as the cover reaches center.
void main() {
  vec2 baseUv = coverUv(vUv);

  float disorder = clamp((1.0 - uFocus) + abs(uVelocity) * 1.2, 0.0, 1.0);

  vec2 grid = vec2(uBlocks, uBlocks / uPlaneAspect);
  vec2 cell = floor(vUv * grid);
  float rnd = hash(cell);

  float stagger = rnd * 0.45;
  float local = clamp((disorder - stagger) / (1.0 - stagger), 0.0, 1.0);
  float stepped = ceil(local * uSteps) / uSteps;

  float ang = rnd * 6.28318530718;
  vec2 dir = vec2(cos(ang), sin(ang));
  dir.x += uShift;
  vec2 uv = baseUv + dir * stepped * uDisplace;

  float amt = clamp(abs(uVelocity) * uAberration, 0.0, 0.06);
  vec2 ca = vec2(sign(uVelocity), 0.0) * amt;

  float r = texture2D(uTexture, uv + ca).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, uv - ca).b;

  vec3 col = vec3(r, g, b);
  col *= mix(uDim, 1.0, uFocus);
  col *= frameShadow(vUv);

  gl_FragColor = vec4(col, 1.0);
}
