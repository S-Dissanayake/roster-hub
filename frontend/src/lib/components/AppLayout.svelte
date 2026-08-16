<script lang="ts">
  import Navbar from './Navbar.svelte';
  import Sidebar from './Sidebar.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    showSidebar?: boolean;
    children: Snippet;
  }

  let { showSidebar = true, children }: Props = $props();
</script>

<div class="app-layout">
  <Navbar />
  <div class="layout-container">
    {#if showSidebar}
      <Sidebar />
    {/if}
    <main class="main-content">
      {@render children?.()}
    </main>
  </div>
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .layout-container {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    background: var(--color-bg-page);
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
  }
</style>
