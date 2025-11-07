# Smappy Brand Guidelines

Smappy is a bundle analyzer with a distinctive, memorable identity inspired by the snappy efficiency of a crocodile.

## Brand Personality

**Friendly & Approachable**: Smappy makes bundle analysis accessible and enjoyable. We use warm, inviting language and design that welcomes developers of all skill levels.

**Efficient & Fast**: Like a crocodile's quick snap, Smappy delivers fast, precise analysis with no wasted time.

**Memorable**: The crocodile theme sets us apart from generic dev tools, making bundle analysis something developers actually remember and recommend.

## Logo

The Smappy logo (`/static/logo.svg`) combines:

- **Crocodile Icon**: A stylized croc head with snapping jaws, representing quick analysis
- **Wordmark**: "Smappy" in bold, friendly typography
- **Tagline**: "BUNDLE ANALYZER" in small caps for clarity

### Usage

- Use the full logo (icon + wordmark) on landing pages and marketing materials
- Minimum height: 48px for digital, ensure readability
- Always maintain adequate spacing around the logo (minimum 8px padding)
- Logo should be displayed on light backgrounds (white, gray-50) or dark backgrounds (gray-800, gray-900) with appropriate color treatment

## Color Palette

Our colors are inspired by crocodiles in their natural habitat:

### Primary Colors (Emerald Green)

These represent the crocodile itself - vibrant, natural, and distinctive.

```css
--color-primary-300: #6ee7b7 /* Light emerald - highlights, hover states */
  --color-primary-400: #34d399 /* Emerald - hover states */ --color-primary-500: #10b981
  /* Vibrant emerald - main brand color */ --color-primary-600: #059669
  /* Rich emerald - primary actions, links */ --color-primary-700: #047857
  /* Deep emerald - dark mode primary */ --color-primary-800: #065f46 /* Forest - accents */
  --color-primary-900: #064e3b /* Darkest - text on light backgrounds */;
```

**Use Cases**:

- Active navigation states: `text-primary-600 dark:text-primary-400`
- Primary buttons and CTAs: `bg-primary-600 hover:bg-primary-700`
- Links and interactive elements: `text-primary-600 dark:text-primary-400`
- Success states and positive highlights

### Accent Colors (Amber/Gold)

Warm sandy tones representing the riverbank and sun - used sparingly for emphasis.

```css
--color-accent-400: #fbbf24 /* Golden - hover states */ --color-accent-500: #f59e0b
  /* Amber - CTAs, important highlights */ --color-accent-600: #d97706
  /* Deep amber - pressed states */;
```

**Use Cases**:

- Warning states and important notifications
- Occasional accent for key CTAs (use sparingly)
- Highlighting important metrics or changes

### Neutral Colors

Standard Tailwind gray scale for backgrounds, text, and UI elements:

- Gray 50-100: Light backgrounds
- Gray 200-300: Borders, dividers
- Gray 600-700: Secondary text
- Gray 800-900: Dark backgrounds, primary text

## Typography

### Font Stack

```css
font-family:
  system-ui,
  -apple-system,
  sans-serif;
```

We use system fonts for optimal performance and native feel.

### Type Scale

**Headlines (h1)**

- Font size: `text-2xl` (24px) to `text-3xl` (30px)
- Font weight: `font-bold` (700)
- Color: `text-gray-900 dark:text-white`

**Subheadings (h2)**

- Font size: `text-xl` (20px) to `text-2xl` (24px)
- Font weight: `font-semibold` (600)
- Color: `text-gray-900 dark:text-white`

**Section Titles (h3)**

- Font size: `text-lg` (18px)
- Font weight: `font-semibold` (600)
- Color: `text-gray-900 dark:text-white`

**Body Text**

- Font size: `text-base` (16px)
- Font weight: `font-normal` (400)
- Color: `text-gray-700 dark:text-gray-300`

**Small Text**

- Font size: `text-sm` (14px)
- Font weight: `font-normal` (400)
- Color: `text-gray-600 dark:text-gray-400`

**Micro Copy**

- Font size: `text-xs` (12px)
- Font weight: `font-medium` (500)
- Color: `text-gray-500 dark:text-gray-500`

## UI Components

### Navigation

- Sticky header with logo and main navigation tabs
- Active state: `font-semibold text-primary-600 dark:text-primary-400`
- Inactive state: `text-gray-700 dark:text-gray-300`
- Hover: `hover:text-gray-900 dark:hover:text-white`

### Cards

- Background: `bg-white dark:bg-gray-800`
- Border: `border border-gray-200 dark:border-gray-700`
- Border radius: `rounded-lg` (8px)
- Padding: `p-4` to `p-6` depending on content density
- Hover effect: `hover:shadow-lg` for interactive cards

### Buttons

**Primary**

- Background: `bg-primary-600 hover:bg-primary-700`
- Text: `text-white`
- Padding: `px-4 py-2`
- Border radius: `rounded-md`

**Secondary**

- Background: `bg-white dark:bg-gray-800`
- Border: `border border-gray-300 dark:border-gray-600`
- Text: `text-gray-700 dark:text-gray-300`
- Hover: `hover:bg-gray-50 dark:hover:bg-gray-700`

### Stat Cards

- Display important metrics with large numbers
- Number: `text-3xl font-bold text-gray-900 dark:text-white`
- Label: `text-sm text-gray-600 dark:text-gray-400`
- Background: White card on gray-50 background

## Spacing & Layout

### Container Widths

- Landing page: `max-w-4xl` (896px)
- Dashboard content: `max-w-7xl` (1280px)
- Narrow content: `max-w-2xl` (672px)

### Padding & Margin

- Page padding: `px-4 py-6` on mobile, `px-6 py-8` on desktop
- Section spacing: `space-y-6` to `space-y-8`
- Card padding: `p-4` to `p-6`
- Component gap: `gap-4` for most layouts

### Grid Systems

- Project cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Dashboard stats: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Gap: `gap-4` between grid items

## Dark Mode

Smappy fully supports dark mode using Tailwind's `dark:` variant.

### Background Colors

- Light mode: `bg-gray-50` (pages), `bg-white` (cards)
- Dark mode: `bg-gray-900` (pages), `bg-gray-800` (cards)

### Text Colors

- Primary text: `text-gray-900 dark:text-white`
- Secondary text: `text-gray-600 dark:text-gray-400`
- Tertiary text: `text-gray-500 dark:text-gray-500`

### Border Colors

- Default: `border-gray-200 dark:border-gray-700`
- Emphasis: `border-gray-300 dark:border-gray-600`

## Implementation Guidelines

### Using Brand Colors

Always use the Tailwind theme variables instead of hardcoded colors:

✅ **Correct**

```html
<a class="text-primary-600 hover:text-primary-700 dark:text-primary-400">Link</a>
```

❌ **Incorrect**

```html
<a class="text-[#059669] hover:text-[#047857]">Link</a>
```

### Tailwind-First Approach

Smappy uses Tailwind utilities exclusively. Avoid custom CSS classes:

✅ **Correct**

```html
<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12"></div>
```

❌ **Incorrect**

```html
<div class="dashboard-landing">
  <style>
    .dashboard-landing {
      display: flex;
      min-height: 100vh;
      /* ... */
    }
  </style>
</div>
```

### Accessibility

- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Use semantic HTML elements
- Include `aria-label` and `aria-current` for navigation
- Ensure focus states are visible: `focus:ring-2 focus:ring-primary-500`

## Voice & Tone

### Writing Style

- **Friendly but professional**: "Smappy helps you..." not "We leverage synergies..."
- **Action-oriented**: Use active voice and clear CTAs
- **Concise**: Respect developers' time with brief, scannable content
- **Helpful**: Explain why something matters, not just what it is

### Examples

✅ **Good**

- "View your bundle's dependency tree"
- "Smappy found 3 optimization opportunities"
- "Compare analysis runs to track improvements"

❌ **Avoid**

- "Utilize the dependency visualization feature"
- "Optimization suggestions have been generated"
- "Analysis run differential comparison interface"

## Assets

### Logo Files

- `/static/logo.svg` - Full logo with icon and wordmark (180×48px viewBox)

### Theme Configuration

- `src/app.css` - @theme block with all brand colors
- All color tokens use CSS custom properties for flexibility

## Future Considerations

As Smappy grows, consider:

- Animated logo for loading states (subtle jaw snap animation?)
- Crocodile mascot illustrations for empty states and onboarding
- Playful micro-interactions that reinforce the "snappy" brand
- Branded error pages with helpful croc-themed messages
