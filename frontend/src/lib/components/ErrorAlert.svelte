<script lang="ts">
  interface Props {
    message?: string;
    onclose?: () => void;
  }

  let { message = 'An error occurred', onclose }: Props = $props();
</script>

<div class="error-alert">
  <div class="error-content">
    <svg class="error-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 2.5 L18 16.5 L2 16.5 Z" />
      <line x1="10" y1="8" x2="10" y2="12" />
      <circle cx="10" cy="14.3" r="0.6" fill="currentColor" stroke="none" />
    </svg>
    <p>{message}</p>
  </div>
  {#if onclose}
    <button class="error-close" onclick={onclose}>✕</button>
  {/if}
</div>

<style>
  .error-alert {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-sm);
    padding: 1rem 1.2rem;
    color: var(--color-danger-text);
    font-weight: 500;
    margin-bottom: 1rem;
  }

  .error-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .error-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  p {
    margin: 0;
  }

  .error-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: var(--color-danger-text);
    padding: 0;
  }

  .error-close:hover {
    opacity: 0.7;
  }
</style>
