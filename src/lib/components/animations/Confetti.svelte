<script lang="ts">
  interface Props {
    /**
     * Whether to trigger the confetti animation
     */
    active?: boolean;
    /**
     * Duration of the animation in milliseconds
     */
    duration?: number;
    /**
     * Number of confetti pieces
     */
    particleCount?: number;
  }

  let { active = false, duration = 3000, particleCount = 50 }: Props = $props();

  interface Particle {
    x: number;
    y: number;
    rotation: number;
    velocity: { x: number; y: number; rotation: number };
    color: string;
    size: number;
  }

  let particles = $state<Particle[]>([]);
  let animating = $state(false);

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  function createParticle(): Particle {
    return {
      x: 50, // Start from center
      y: 50,
      rotation: Math.random() * 360,
      velocity: {
        x: (Math.random() - 0.5) * 4,
        y: Math.random() * -3 - 2,
        rotation: (Math.random() - 0.5) * 10,
      },
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    };
  }

  function animate() {
    if (!animating) return;

    particles = particles.map((p) => ({
      ...p,
      x: p.x + p.velocity.x,
      y: p.y + p.velocity.y,
      rotation: p.rotation + p.velocity.rotation,
      velocity: {
        ...p.velocity,
        y: p.velocity.y + 0.15, // Gravity
      },
    }));

    requestAnimationFrame(animate);
  }

  $effect(() => {
    if (active && !animating) {
      animating = true;
      particles = Array.from({ length: particleCount }, () => createParticle());
      animate();

      setTimeout(() => {
        animating = false;
        particles = [];
      }, duration);
    }
  });
</script>

<!--
  @component Confetti
  
  Celebratory confetti animation for major achievements.
  Triggers particle animation when active prop is true.
-->

{#if animating}
  <div class="confetti-container" aria-hidden="true">
    {#each particles as particle (particle)}
      <div
        class="confetti-piece"
        style="
          left: {particle.x}%;
          top: {particle.y}%;
          transform: rotate({particle.rotation}deg);
          background-color: {particle.color};
          width: {particle.size}px;
          height: {particle.size}px;
        "
      ></div>
    {/each}
  </div>
{/if}

<style>
  .confetti-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  }

  .confetti-piece {
    position: absolute;
    opacity: 0.9;
    pointer-events: none;
  }
</style>
