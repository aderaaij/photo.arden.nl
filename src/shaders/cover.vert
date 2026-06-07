uniform float uVelocity; // signed scroll velocity (world units / frame)
uniform float uBillow;   // sideways arc strength
uniform float uBow;      // depth bow strength

varying vec2 vUv;

// Scroll-velocity distortion (Codrops "shader on scroll" feel): the plane shears
// and bows as the carousel moves, then relaxes flat when it settles. Horizontal
// scroll → the bend runs along the vertical axis (varies over height).
void main() {
  vUv = uv;
  vec3 pos = position;

  // Symmetric arc: 0 at the top & bottom corners, 1 in the middle — so the curve
  // is mirror-symmetric (corners stay aligned) rather than a lean/tilt.
  float curve = sin(uv.y * 3.14159265);
  pos.x += curve * uVelocity * uBillow;       // even billow toward the scroll direction
  pos.z -= curve * abs(uVelocity) * uBow;     // even bow back in depth

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
