precision highp float;

uniform sampler2D uTexture;
uniform float uVelocity;    // signed scroll velocity
uniform float uFocus;       // 0 = at the edge, 1 = dead center
uniform float uPlaneAspect; // plane width / height (fixed 2:3)
uniform float uImageAspect; // source image width / height

varying vec2 vUv;

// object-fit: cover — fill the fixed-aspect plane, center-crop the overflow.
vec2 coverUv(vec2 uv) {
  vec2 r = vec2(
    min(uPlaneAspect / uImageAspect, 1.0),
    min(uImageAspect / uPlaneAspect, 1.0)
  );
  return (uv - 0.5) * r + 0.5;
}

// The original scroll look: clean image with chromatic aberration that grows
// with scroll speed, off-center covers dimmed. The bend lives in cover.vert.
void main() {
  vec2 uv = coverUv(vUv);

  float amt = clamp(abs(uVelocity) * 0.6, 0.0, 0.04);
  vec2 ca = vec2(sign(uVelocity), 0.0) * amt;

  float r = texture2D(uTexture, uv + ca).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, uv - ca).b;

  vec3 col = vec3(r, g, b);
  col *= mix(0.45, 1.0, uFocus);

  gl_FragColor = vec4(col, 1.0);
}
