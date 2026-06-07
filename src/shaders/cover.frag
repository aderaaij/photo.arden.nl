precision highp float;

uniform sampler2D uTexture;
uniform float uVelocity; // signed scroll velocity
uniform float uFocus;    // 0 = at the edge, 1 = dead center

varying vec2 vUv;

// Chromatic aberration scaled by scroll speed, plus dimming of off-center covers
// so the focused one reads as the subject.
void main() {
  float amt = clamp(abs(uVelocity) * 0.6, 0.0, 0.04);
  vec2 dir = vec2(sign(uVelocity), 0.0);

  float r = texture2D(uTexture, vUv + dir * amt).r;
  float g = texture2D(uTexture, vUv).g;
  float b = texture2D(uTexture, vUv - dir * amt).b;

  vec3 col = vec3(r, g, b);
  col *= mix(0.45, 1.0, uFocus); // fade non-focused covers back

  gl_FragColor = vec4(col, 1.0);
}
