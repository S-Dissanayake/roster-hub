<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    accent?: string;
    interactive?: boolean;
    icon?: Snippet;
    iconColor?: string;
    iconBg?: string;
    children: Snippet;
  }

  let {
    title,
    subtitle,
    accent,
    interactive = false,
    icon,
    iconColor = 'var(--color-brand)',
    iconBg = 'var(--color-brand-bg-soft)',
    children,
  }: Props = $props();
</script>

<div
  class="card"
  class:interactive
  style={accent ? `border-top: 5px solid ${accent};` : ''}
>
  {#if icon}
    <div class="card-icon-chip" style={`background: ${iconBg}; color: ${iconColor};`}>
      {@render icon()}
    </div>
  {/if}
  {#if title}
    <div class="card-header">
      <div>
        <h3 class="card-title">{title}</h3>
        {#if subtitle}
          <p class="card-subtitle">{subtitle}</p>
        {/if}
      </div>
    </div>
  {/if}
  <div class="card-body">
    {@render children?.()}
  </div>
</div>

<style>
  .card {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    overflow: hidden;
  }

  .card.interactive {
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .card.interactive:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-hover);
  }

  .card-icon-chip {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1.5rem 1.5rem 0;
  }

  .card-icon-chip :global(svg) {
    width: 20px;
    height: 20px;
  }

  .card-header {
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .card-subtitle {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .card-body {
    padding: 1.5rem;
  }
</style>
