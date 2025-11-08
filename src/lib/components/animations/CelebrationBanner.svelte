<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  interface Props {
    /**
     * Whether to show the banner
     */
    show?: boolean;
    /**
     * The celebration message
     */
    message: string;
    /**
     * Optional emoji to display
     */
    emoji?: string;
    /**
     * Variant for different celebration types
     */
    variant?: 'success' | 'achievement' | 'milestone';
    /**
     * Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
     */
    autoDismiss?: number;
    /**
     * Callback when banner is dismissed
     */
    onDismiss?: () => void;
  }

  let {
    show = false,
    message,
    emoji = '🎉',
    variant = 'success',
    autoDismiss = 5000,
    onDismiss,
  }: Props = $props();

  let visible = $state(show);

  const variantClasses = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/50',
    achievement: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/50',
    milestone: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/50',
  };

  $effect(() => {
    visible = show;
    if (show && autoDismiss > 0) {
      const timer = setTimeout(() => {
        visible = false;
        onDismiss?.();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  });

  function handleDismiss() {
    visible = false;
    onDismiss?.();
  }
</script>

<!--
  @component CelebrationBanner
  
  Displays a celebratory banner message with optional auto-dismiss.
  Used for showing positive feedback and achievements.
-->

{#if visible}
  <div
    class="celebration-banner-container"
    transition:fly={{ y: -20, duration: 400, easing: quintOut }}
  >
    <div class="celebration-banner {variantClasses[variant]}" role="alert" aria-live="polite">
      <div class="banner-content">
        <span class="banner-emoji" aria-hidden="true">{emoji}</span>
        <span class="banner-message">{message}</span>
      </div>
      <button
        class="banner-close"
        onclick={handleDismiss}
        aria-label="Dismiss celebration"
        type="button"
      >
        ✕
      </button>
    </div>
  </div>
{/if}

<style>
  .celebration-banner-container {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 90%;
    max-width: 600px;
  }

  .celebration-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
    animation: celebration-pulse 0.5s ease-out;
  }

  @keyframes celebration-pulse {
    0% {
      transform: scale(0.95);
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .banner-emoji {
    font-size: 1.5rem;
    line-height: 1;
    animation: celebration-bounce 0.6s ease-out;
  }

  @keyframes celebration-bounce {
    0%,
    100% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.3) rotate(-10deg);
    }
    75% {
      transform: scale(1.2) rotate(10deg);
    }
  }

  .banner-message {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .banner-close {
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.25rem;
    opacity: 0.8;
    padding: 0.25rem;
    line-height: 1;
    transition: opacity 0.2s;
  }

  .banner-close:hover {
    opacity: 1;
  }

  .banner-close:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 0.25rem;
  }
</style>
