precision highp float;

uniform sampler2D uTexture;

varying vec2 vUv;
varying float vAlpha;
varying float vDim;

void main() {
  if (vAlpha <= 0.0) discard;
  vec3 col = texture2D(uTexture, vUv).rgb * vDim;
  gl_FragColor = vec4(col, vAlpha);
}
