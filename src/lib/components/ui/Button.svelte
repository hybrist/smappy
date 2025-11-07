<script lang="ts">
  import type { Snippet } from 'svelte';

  type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';

  interface Props {
    /**
     * Button visual style
     */
    variant?: ButtonVariant;
    /**
     * Button type attribute
     */
    type?: 'button' | 'submit' | 'reset';
    /**
     * Whether button is disabled
     */
    disabled?: boolean;
    /**
     * Additional CSS classes
     */
    class?: string;
    /**
     * Button content
     */
    children?: Snippet;
    /**
     * Click handler
     */
    onclick?: (event: MouseEvent) => void;
    /**
     * Additional HTML attributes
     */
    [key: string]: unknown;
  }

  let {
    variant = 'primary',
    type = 'button',
    disabled = false,
    class: className = '',
    children,
    onclick,
    ...props
  }: Props = $props();

  const baseClasses =
    'inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
    secondary:
      'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
    ghost: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    link: 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-500',
  };

  // Link variant doesn't need button padding/structure
  const computedClasses = $derived(
    variant === 'link'
      ? `inline-flex cursor-pointer items-center text-sm font-medium ${variantClasses[variant]} ${className}`
      : `${baseClasses} ${variantClasses[variant]} ${className}`,
  );
</script>

<!--
  @component Button

  Button component with multiple variants and automatic type handling.
  Includes focus states and transitions using Tailwind utilities.

  Variants: primary, secondary, ghost, link
  See Button.stories.svelte for usage examples.
-->

<button {type} {disabled} class={computedClasses} {onclick} {...props}>
  {@render children?.()}
</button>
