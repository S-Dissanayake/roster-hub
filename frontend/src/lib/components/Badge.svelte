<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    status: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    label?: string;
    children?: Snippet;
  }

  let { status, label, children }: Props = $props();
</script>

<span class={`badge badge-${status}`}>
  {#if label}{label}{:else if children}{@render children()}{/if}
</span>

<style>
  .badge {
    display: inline-block;
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .badge-primary {
    background: var(--color-info-bg);
    color: var(--color-info);
  }

  .badge-success {
    background: var(--color-success-bg);
    color: var(--color-success-text);
  }

  .badge-warning {
    background: var(--color-warning-bg);
    color: var(--color-warning-text);
  }

  .badge-danger {
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }

  .badge-info {
    background: #e0e7ff;
    color: #3730a3;
  }
</style>
