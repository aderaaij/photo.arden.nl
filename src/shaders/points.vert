uniform float uFocus;       // 0 = at the edge, 1 = dead center
uniform float uVelocity;    // signed scroll velocity
uniform float uShift;       // signed normalized distance from center (-1..1)
uniform float uPlaneAspect; // plane width / height (fixed 2:3)
uniform float uImageAspect; // source image width / height
uniform float uPointSize;   // world-space point diameter
uniform float uScale;       // px-per-world scale: viewportHeightPx / (2 tan(fov/2))
uniform float uBillow;      // sideways arc strength
uniform float uBow;         // depth bow strength
uniform float uFlyDist;     // base scatter distance
uniform float uFlyVel;      // extra scatter from scroll speed

attribute vec2 aUv;     // this particle's pixel location (0..1)
attribute vec3 aRandom; // x: stagger, y: angle seed, z: depth seed

varying vec2 vUv;
varying float vAlpha;
varying float vDim;

const float PI = 3.14159265359;

// object-fit: cover — sample the right cropped region for the 2:3 frame.
vec2 coverUv(vec2 uv) {
  vec2 r = vec2(
    min(uPlaneAspect / uImageAspect, 1.0),
    min(uImageAspect / uPlaneAspect, 1.0)
  );
  return (uv - 0.5) * r + 0.5;
}

void main() {
  // Assembled target = the grid position, with the same velocity bend as the plane
  // (vertical axis, to match the horizontal scroll).
  vec3 target = position;
  float curve = sin(aUv.y * PI); // symmetric arc, corners anchored
  target.x -= curve * uVelocity * uBillow;
  target.z -= curve * abs(uVelocity) * uBow;

  // Per-particle assemble progress: staggered, eased to decelerate into place.
  float stagger = aRandom.x * 0.5;
  float local = clamp((uFocus - stagger) / (1.0 - stagger), 0.0, 1.0);
  float t = 1.0 - pow(1.0 - local, 3.0); // easeOutCubic

  // Scattered origin: flung out in a random direction, biased toward the side the
  // cover is travelling in from. Faster scroll throws them further.
  float ang = aRandom.y * 6.2831853;
  vec2 sdir = vec2(cos(ang), sin(ang));
  float fly = uFlyDist * (1.0 + abs(uVelocity) * uFlyVel);
  vec3 scattered = target + vec3(
    (sdir.x + uShift) * fly,
    sdir.y * fly,
    (aRandom.z - 0.5) * fly
  );

  vec3 pos = mix(scattered, target, t);

  // Hand the texture sample to the fragment stage (vertex texture fetch is flaky).
  vUv = coverUv(aUv);
  vDim = mix(0.5, 1.0, uFocus);                  // dim off-center clouds
  vAlpha = 1.0 - smoothstep(0.72, 0.96, uFocus); // fade out as the crisp plane fades in

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uPointSize * uScale / max(-mv.z, 0.001);
  gl_Position = projectionMatrix * mv;
}
