<script lang="ts">
  import { auth } from '../stores/auth';

  let user = $derived($auth.user);

  function handleLogout() {
    // auth.logout() redirects the browser through Keycloak's logout endpoint itself —
    // don't navigate here too, or this would race and overwrite that redirect.
    auth.logout();
  }


  let currentPath = $state('');

  // Same pattern as Sidebar.svelte: full page navigations (the app's nav links use plain
  // <a href>, not client-side routing) mean reading the path once on mount is accurate.
  $effect(() => {
    currentPath = window.location.pathname;
  });

  let initials = $derived.by(() => {
    if (!user?.email) return '';
    const local = user.email.split('@')[0];
    return local.slice(0, 2).toUpperCase();
  });
</script>

<nav class="navbar">
  <div class="navbar-container">
  <div class="sidebar-brand">
    <span class="brand-icon">📋</span>
    <span class="brand-text">Roster Flow</span>
  </div>

    <div class="navbar-right">
      {#if user}
        <div class="user-info">
          <span class="user-email">{user.email}</span>
          <span class="user-role badge-role">{user.role}</span>
        </div>
        <div class="avatar">{initials}</div>
        <button type="button" class="icon-button" onclick={handleLogout} aria-label="Logout" title="Logout">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3 L4 3 C3.4 3 3 3.4 3 4 L3 16 C3 16.6 3.4 17 4 17 L8 17" />
            <line x1="17" y1="10" x2="8" y2="10" />
            <path d="M13 6 L17 10 L13 14" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
</nav>

<style>
  .navbar {
    background: linear-gradient(to bottom, var(--color-sidebar-bg),#ffffff);
    padding: 0.75rem 1.5rem;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: var(--shadow-xs);
    border-bottom: 2px solid var(--color-border);
  }

  .navbar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
    font-size: 1.15rem;
    color: var(--color-text-primary);
  }

  .brand-icon {
    font-size: 1.4rem;
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
  }

  .user-email {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 0.9rem;
  }

  .badge-role {
    font-size: 0.75rem;
    background: var(--color-info-bg);
    color: var(--color-info);
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-full);
    text-transform: capitalize;
    font-weight: 600;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--color-brand);
    color: var(--color-text-inverse);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .icon-button {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    border: none;
    background: var(--color-bg-subtle);
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
  }

  .icon-button:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .icon-button svg {
    width: 18px;
    height: 18px;
  }
</style>
