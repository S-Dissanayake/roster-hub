<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    message?: string;
    children?: Snippet;
  }

  let { title = 'No data found', message = 'There are no items to display.', children }: Props = $props();
</script>

<div class="empty-state">
  <div class="empty-icon">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 8 L6 3 L14 3 L17 8" />
      <path d="M3 8 L3 16 C3 16.5 3.5 17 4 17 L16 17 C16.5 17 17 16.5 17 16 L17 8" />
      <path d="M3 8 L17 8" />
      <path d="M8 11 L8 12.5 C8 13 8.5 13.5 9 13.5 L11 13.5 C11.5 13.5 12 13 12 12.5 L12 11" />
    </svg>
  </div>
  <h3>{title}</h3>
  <p>{message}</p>
  <div class="empty-action">
    {@render children?.()}
  </div>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
  }

  .empty-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    background: var(--color-bg-subtle);
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .empty-icon svg {
    width: 28px;
    height: 28px;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary);
    font-size: 1.1rem;
  }

  p {
    margin: 0 0 1.5rem 0;
    color: var(--color-text-secondary);
    max-width: 400px;
  }

  .empty-action {
    display: flex;
    gap: 0.5rem;
  }
</style>
