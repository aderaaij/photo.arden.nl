precision highp float;

uniform sampler2D uTexture;
uniform float uVelocity;    // signed scroll velocity
uniform float uFocus;       // 0 = at the edge, 1 = dead center
uniform float uPlaneAspect; // plane width / height (fixed 2:3)
uniform float uImageAspect; // source image width / height
uniform float uAberration;  // chromatic aberration gain
uniform vec2 uParallax;       // in-frame hover pan offset (texture space)
uniform float uParallaxInset; // matching zoom-in so the pan has headroom
uniform float uHover;         // 0..1 hover amount (drives the inner frame shadow)
uniform float uShadow;        // inner shadow strength
uniform float uShadowWidth;   // how far the inner shadow reaches in from the edge

varying vec2 vUv;

// object-fit: cover — fill the fixed-aspect plane, center-crop the overflow,
// then zoom by the inset and pan within it for the in-frame hover parallax.
vec2 coverUv(vec2 uv) {
  vec2 r = vec2(
    min(uPlaneAspect / uImageAspect, 1.0),
    min(uImageAspect / uPlaneAspect, 1.0)
  );
  vec2 t = (uv - 0.5) * r * (1.0 - 2.0 * uParallaxInset);
  return t + 0.5 + uParallax;
}

// Inner shadow fixed to the frame (see bend.frag): darkens toward the plane edge
// on hover so the panning photo reads as recessed inside its frame.
float frameShadow(vec2 uv) {
  float vig = smoothstep(0.0, uShadowWidth, min(uv.x, 1.0 - uv.x))
            * smoothstep(0.0, uShadowWidth, min(uv.y, 1.0 - uv.y));
  return 1.0 - uShadow * uHover * (1.0 - vig);
}

// The crisp image. It only shows near focus; the particle cloud (points.*)
// handles everything before that, then crossfades into this.
void main() {
  vec2 uv = coverUv(vUv);

  float amt = clamp(abs(uVelocity) * uAberration, 0.0, 0.06);
  vec2 ca = vec2(sign(uVelocity), 0.0) * amt;

  float r = texture2D(uTexture, uv + ca).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, uv - ca).b;

  vec3 col = vec3(r, g, b) * frameShadow(vUv);
  float alpha = smoothstep(0.7, 0.95, uFocus);
  gl_FragColor = vec4(col, alpha);
}
