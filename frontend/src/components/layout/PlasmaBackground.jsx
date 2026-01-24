/**
 * PlasmaBackground Component
 *
 * Creates an animated plasma effect using Three.js and WebGL shaders.
 * This component renders a full-screen canvas with a flowing gradient
 * animation that transitions between light blue and dark purple.
 *
 * Features:
 * - WebGL shader-based plasma animation
 * - HSV color interpolation for smooth gradients
 * - Responsive to window resizing
 * - Optional radial whitecast effect for highlighting centered content
 * - Configurable positioning and overlay effects
 *
 * @component
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * PlasmaBackground - Animated gradient background component
 *
 * @param {Object} props - Component props
 * @param {string} props.variant - Background variant: 'fullscreen' (default), 'split-right', or 'none'
 * @param {boolean} props.radialWhitecast - Whether to add a radial white glow effect in the center
 * @param {number} props.cardRadius - Radius of the whitecast effect (0.35-0.4 recommended)
 * @param {string} props.className - Additional CSS classes to apply
 */
export default function PlasmaBackground({
  variant = 'fullscreen',
  radialWhitecast = false,
  cardRadius = 0.35,
  className = ''
}) {
  // Reference to the canvas element where Three.js will render
  const canvasRef = useRef(null);

  useEffect(() => {
    // Skip rendering if variant is 'none'
    if (variant === 'none' || !canvasRef.current) return;

    const canvas = canvasRef.current;

    // Initialize Three.js WebGL renderer
    // - antialias: Smooth edges
    // - alpha: Transparent background
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(window.devicePixelRatio); // Support high-DPI displays
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background

    // Set up orthographic camera for 2D shader rendering
    // This creates a flat rendering plane perfect for fullscreen effects
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();

    // Create a plane geometry that fills the entire viewport
    const geometry = new THREE.PlaneGeometry(2, 2);

    /**
     * HSV Color Endpoints for Gradient
     *
     * Light Blue (#A8D8FF):
     * - Hue: 0.5747 (blue region of color wheel)
     * - Saturation: 0.3412 (soft, not too vibrant)
     * - Value: 1.0 (full brightness)
     *
     * Dark Purple (#2E0A4F):
     * - Hue: 0.7536 (purple region)
     * - Saturation: 0.8734 (highly saturated)
     * - Value: 0.3098 (darker tone)
     */
    const hueA = 0.5747;
    const satA = 0.3412;
    const valA = 1.0;

    const hueB = 0.7536;
    const satB = 0.8734;
    const valB = 0.3098;

    /**
     * Shader Material
     *
     * Uses GLSL (OpenGL Shading Language) to create real-time
     * animated gradient effects directly on the GPU for maximum performance.
     */
    const material = new THREE.ShaderMaterial({
      // Uniforms: Variables passed from JavaScript to the shader
      uniforms: {
        u_time: { value: 0 }, // Current animation time in seconds
        u_aspect: { value: canvas.clientWidth / canvas.clientHeight }, // Canvas aspect ratio
        u_hueA: { value: hueA }, // Color A hue
        u_satA: { value: satA }, // Color A saturation
        u_valA: { value: valA }, // Color A value
        u_hueB: { value: hueB }, // Color B hue
        u_satB: { value: satB }, // Color B saturation
        u_valB: { value: valB }, // Color B value
        u_radialWhitecast: { value: radialWhitecast ? 1.0 : 0.0 }, // Enable/disable whitecast
        u_cardRadius: { value: cardRadius }, // Whitecast radius
      },

      /**
       * Vertex Shader
       *
       * Runs once per vertex. For our 2D plane, this just passes
       * through the UV coordinates (texture coordinates) to the fragment shader.
       */
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,

      /**
       * Fragment Shader
       *
       * Runs once per pixel. This is where the magic happens:
       * - Creates plasma-like patterns using sine waves
       * - Blends between two colors in HSV space
       * - Optionally adds radial whitecast effect
       */
      fragmentShader: `
        precision highp float;

        // Uniforms (inputs from JavaScript)
        uniform float u_time;
        uniform float u_aspect;
        uniform float u_hueA;
        uniform float u_satA;
        uniform float u_valA;
        uniform float u_hueB;
        uniform float u_satB;
        uniform float u_valB;
        uniform float u_radialWhitecast;
        uniform float u_cardRadius;

        // Varying (input from vertex shader)
        varying vec2 vUv;

        /**
         * HSV to RGB Conversion
         *
         * Converts HSV color space to RGB.
         * HSV is better for smooth color transitions.
         *
         * @param c - vec3(hue, saturation, value)
         * @return RGB color as vec3
         */
        vec3 hsv2rgb(vec3 c) {
          vec3 rgb = clamp(
            abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
            0.0,
            1.0
          );
          return c.z * mix(vec3(1.0), rgb, c.y);
        }

        /**
         * Hue Interpolation
         *
         * Interpolates between two hue values taking the shortest path
         * around the color wheel (hue wraps at 0 and 1).
         *
         * @param a - Start hue
         * @param b - End hue
         * @param t - Interpolation factor (0-1)
         * @return Interpolated hue value
         */
        float interpHue(float a, float b, float t) {
          float d = b - a;
          // Take shortest path around color wheel
          if (abs(d) > 0.5) {
            if (d > 0.0) d -= 1.0;
            else d += 1.0;
          }
          float h = a + d * t;
          return mod(h + 1.0, 1.0);
        }

        void main(){
          // Scale UV coordinates to create larger patterns
          // Multiply by aspect ratio to prevent stretching
          vec2 uv = (vUv - 0.5) * vec2(u_aspect, 1.0) * 17.0;

          // Slow down time for smooth, gentle animation
          float t = u_time * 0.5;

          /**
           * Plasma Effect
           *
           * Create organic flowing patterns by combining multiple
           * sine waves with different frequencies and phases.
           * This creates the characteristic "plasma" look.
           */
          float a = sin(uv.x * 1.3 + t * 0.7);
          float b = sin(uv.y * 1.6 - t * 0.5);
          float c = sin((uv.x + uv.y) * 1.2 + t * 0.6);
          float d = sin(length(uv) * 2.0 - t * 0.8);

          // Average all waves together (value between -1 and 1)
          float v = (a + b + c + d) * 0.25;

          // Normalize to 0-1 range with smooth transition
          float norm = smoothstep(-0.9, 0.9, v);

          // Add subtle glow from the center for visual interest
          float glow = exp(-length(uv) * 0.85);
          norm = mix(norm, 1.0, glow * 0.25);

          /**
           * Color Interpolation in HSV Space
           *
           * Blend between the two defined colors based on the
           * plasma pattern value. HSV interpolation creates
           * more natural-looking gradients than RGB.
           */
          float hue = interpHue(u_hueA, u_hueB, norm);
          float sat = mix(u_satA, u_satB, norm);
          float val = mix(u_valA, u_valB, norm);

          // Convert HSV to RGB for final display
          vec3 color = hsv2rgb(vec3(hue, sat, val));

          // Apply gentle gamma correction for better perceived brightness
          color = pow(color, vec3(0.92));

          /**
           * Radial Whitecast Effect (Optional)
           *
           * Creates a white glow around the center of the screen,
           * useful for highlighting login/register cards.
           */
          if (u_radialWhitecast > 0.5) {
            // Calculate distance from center
            vec2 centerUv = vUv - 0.5;
            float distFromCenter = length(centerUv);

            // Create smooth radial mask
            float fadeWidth = 0.4;
            float radialMask = 1.0 - smoothstep(
              0.0,
              u_cardRadius + fadeWidth,
              distFromCenter
            );

            // Mix white into the color based on the mask
            color = mix(color, vec3(1.0), radialMask * 0.3);
          }

          // Output final color
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false, // Don't write to depth buffer (we're a background)
      depthTest: false,  // Don't test depth (always render)
      transparent: true, // Allow transparency
    });

    // Create mesh from geometry and material, add to scene
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    /**
     * Mounted Flag
     *
     * Track if component is still mounted to prevent
     * updating uniforms after cleanup/disposal.
     */
    let isMounted = true;

    /**
     * Resize Handler
     *
     * Updates renderer and shader when window is resized.
     * For 'split-right' variant, only uses half the viewport width.
     */
    function resize() {
      if (!isMounted) return; // Don't update if component unmounted

      const w = variant === 'split-right' ? window.innerWidth / 2 : window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);

      // Safely update uniform
      if (material.uniforms.u_aspect) {
        material.uniforms.u_aspect.value = w / h;
      }
    }

    // Set initial size
    resize();

    // Listen for window resize events
    window.addEventListener('resize', resize);

    /**
     * Animation Loop
     *
     * Continuously updates and renders the scene.
     * Updates time uniform to animate the plasma effect.
     *
     * @param now - Current timestamp in milliseconds
     */
    function animate(now) {
      if (!isMounted) return; // Stop animation if unmounted

      requestAnimationFrame(animate);

      // Safely update time uniform (convert ms to seconds)
      if (material.uniforms.u_time) {
        material.uniforms.u_time.value = now * 0.001;
      }

      // Render the scene
      renderer.render(scene, camera);
    }

    // Start animation loop
    animate(0);

    /**
     * Cleanup Function
     *
     * Removes event listener and disposes of Three.js resources
     * when component unmounts to prevent memory leaks.
     */
    return () => {
      // Mark as unmounted to stop animation and prevent uniform updates
      isMounted = false;

      // Remove resize listener
      window.removeEventListener('resize', resize);

      // Dispose Three.js resources to free memory
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [variant, radialWhitecast, cardRadius]);

  // Don't render anything if variant is 'none'
  if (variant === 'none') return null;

  /**
   * Render Canvas Element
   *
   * Different positioning based on variant:
   * - 'fullscreen': Fixed, covers entire viewport behind content
   * - 'split-right': Fixed to right half of screen (for split layouts)
   */
  const canvasClasses = variant === 'fullscreen'
    ? 'fixed top-0 left-0 w-screen h-screen z-[-2] pointer-events-none'
    : 'fixed top-0 right-0 w-1/2 h-screen pointer-events-none';

  return (
    <>
      {/* Plasma canvas */}
      <canvas
        ref={canvasRef}
        className={`${canvasClasses} ${className}`}
      />

      {/* White overlay for fullscreen variant */}
      {/* Adds a subtle white tint and blur to soften the plasma effect */}
      {variant === 'fullscreen' && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[-1] bg-white/20 backdrop-blur-3xl pointer-events-none" />
      )}
    </>
  );
}
