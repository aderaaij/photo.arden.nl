uniform float uVelocity; // signed scroll velocity (world units / frame)

varying vec2 vUv;

// Scroll-velocity distortion (Codrops "shader on scroll" feel): the plane shears
// and bows as the carousel moves, then relaxes flat when it settles.
void main() {
  vUv = uv;
  vec3 pos = position;

  float edge = uv.x - 0.5;
  pos.y += edge * uVelocity * 0.9;                    // shear: leading edge drags
  pos.z -= sin(uv.x * 3.14159265) * abs(uVelocity) * 1.2; // bow away on fast motion

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
