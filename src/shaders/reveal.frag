precision highp float;

uniform sampler2D uTexture;
uniform float uProgress; // 0 = pixelated & hidden, 1 = clear

varying vec2 vUv;

// Pixelated -> clear reveal. As uProgress goes 0..1 the sampling grid gets
// finer (chunky blocks resolve into the full image) and the plane fades in.
// This is the first of the reveal family — pointcloud / displace come next.
void main() {
  float p = clamp(uProgress, 0.0, 1.0);

  float blocks = mix(6.0, 900.0, pow(p, 2.5));
  vec2 uv = (floor(vUv * blocks) + 0.5) / blocks;

  vec4 tex = texture2D(uTexture, uv);
  float alpha = smoothstep(0.0, 0.35, p);

  gl_FragColor = vec4(tex.rgb, tex.a * alpha);
}
