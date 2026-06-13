precision highp float;

uniform vec3 uColor;
uniform float uAlpha;
uniform float uRing;  // 0 = filled dot, 1 = static ring
uniform float uPulse; // 1 = looping expanding pulse (current stop's halo)
uniform float uTime;

varying float vA;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  float m = 1.0 - smoothstep(0.36, 0.5, r);
  if (uPulse > 0.5) {
    // Expanding ring, fading as it grows, looping while the cell is pinned.
    float phase = fract(uTime * 0.55);
    float rr = mix(0.08, 0.46, phase);
    m = (1.0 - smoothstep(0.02, 0.055, abs(r - rr))) * (1.0 - phase);
  } else if (uRing > 0.5) {
    m = 1.0 - smoothstep(0.04, 0.09, abs(r - 0.36));
  }
  float alpha = m * vA * uAlpha;
  if (alpha <= 0.004) discard;
  gl_FragColor = vec4(uColor, alpha);
}
