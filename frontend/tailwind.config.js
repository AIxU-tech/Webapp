/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS v4 Configuration
 *
 * In v4, theme configuration has moved to CSS using @theme directives.
 * This JavaScript config is now minimal - just specifying content sources.
 *
 * See src/styles.css for theme configuration (colors, spacing, etc.)
 */
export default {
  // Scan these files for Tailwind class names
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  // Note: In v4, colors, theme extensions, and dark mode are configured in CSS
  // See the @theme directive in src/styles.css
}

