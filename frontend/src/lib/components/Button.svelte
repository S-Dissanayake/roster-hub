<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    fullWidth?: boolean;
    icon?: Snippet;
    onclick?: () => void;
    children: Snippet;
  }

  let { variant = 'primary', size = 'md', disabled = false, fullWidth = false, icon, onclick, children }: Props = $props();
</script>

<button
  class={`btn btn-${variant} btn-${size}`}
  class:full-width={fullWidth}
  {disabled}
  {onclick}
>
  {#if icon}
    <span class="btn-icon">{@render icon()}</span>
  {/if}
  {@render children?.()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.95rem;
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
  }

  .btn-icon :global(svg) {
    width: 1em;
    height: 1em;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--color-brand-bg-soft);
  }

  .btn.full-width {
    width: 100%;
  }

  .btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

  .btn-md {
    padding: 0.6rem 1.2rem;
  }

  .btn-lg {
    padding: 0.8rem 1.6rem;
    font-size: 1.05rem;
  }

  .btn-primary {
    background: var(--color-brand);
    color: var(--color-text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-brand-hover);
  }

  .btn-secondary {
    background: var(--color-text-secondary);
    color: var(--color-text-inverse);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-text-secondary-hover);
  }

  .btn-danger {
    background: var(--color-danger);
    color: var(--color-text-inverse);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--color-danger-hover);
  }
</style>
