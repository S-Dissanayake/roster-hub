<script lang="ts">
  import { auth } from '../stores/auth';

  let user = $derived($auth.user);

  let currentPath = $state('');

  function isActive(path: string): boolean {
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  }

  function setPath(path: string) {
    currentPath = path;
  }

  // Set path on mount
  $effect(() => {
    setPath(window.location.pathname);
  });
</script>

<aside class="sidebar">
  

  <nav class="sidebar-nav">
    <div class="sidebar-section-label">Overview</div>
    <a href="/dashboard" class:active={isActive('/dashboard')} onclick={() => setPath('/dashboard')}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
        <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
        <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
      </svg>
      Dashboard
    </a>

    {#if (user && user.role === 'admin') || (user && ['admin', 'coordinator'].includes(user.role)) || (user && user.role === 'worker')}
      <div class="sidebar-section-label">Management</div>
    {/if}

    {#if user && user.role === 'admin'}
      <a href="/dashboard/users" class:active={isActive('/dashboard/users')} onclick={() => setPath('/dashboard/users')}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="14" r="3" />
          <line x1="8.2" y1="11.8" x2="16" y2="4" />
          <line x1="12" y1="8" x2="14" y2="6" />
          <line x1="14.5" y1="5.5" x2="16" y2="7" />
        </svg>
        Users
      </a>
    {/if}

    {#if user && ['admin', 'coordinator'].includes(user.role)}
      <a href="/dashboard/workers" class:active={isActive('/dashboard/workers')} onclick={() => setPath('/dashboard/workers')}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="14" height="14" rx="2" />
          <circle cx="10" cy="8" r="2.2" />
          <path d="M6 14.5 L7 12 L13 12 L14 14.5" />
        </svg>
        Workers
      </a>
      <a href="/dashboard/participants" class:active={isActive('/dashboard/participants')} onclick={() => setPath('/dashboard/participants')}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="7.5" cy="10" r="4.5" />
          <circle cx="12.5" cy="10" r="4.5" />
        </svg>
        Participants
      </a>
    {/if}

    {#if user && ['admin', 'coordinator'].includes(user.role)}
      <a href="/dashboard/shifts" class:active={isActive('/dashboard/shifts')} onclick={() => setPath('/dashboard/shifts')}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="14" height="13" rx="1.5" />
          <line x1="3" y1="8" x2="17" y2="8" />
          <line x1="6.5" y1="2.5" x2="6.5" y2="5.5" />
          <line x1="13.5" y1="2.5" x2="13.5" y2="5.5" />
        </svg>
        Shifts
      </a>
    {/if}

    {#if user && user.role === 'worker'}
      <a href="/dashboard/assignments/me" class:active={isActive('/dashboard/assignments/me')} onclick={() => setPath('/dashboard/assignments/me')}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="3" width="12" height="15" rx="1.5" />
          <rect x="7" y="2" width="6" height="3" rx="1" />
          <line x1="7" y1="9" x2="13" y2="9" />
          <line x1="7" y1="12" x2="13" y2="12" />
          <line x1="7" y1="15" x2="11" y2="15" />
        </svg>
        My Assignments
      </a>
    {/if}

    {#if user && ['admin', 'coordinator'].includes(user.role)}
      <a href="/dashboard/assignments" class:active={isActive('/dashboard/assignments')} onclick={() => setPath('/dashboard/assignments')}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="3" width="12" height="15" rx="1.5" />
          <rect x="7" y="2" width="6" height="3" rx="1" />
          <line x1="7" y1="9" x2="13" y2="9" />
          <line x1="7" y1="12" x2="13" y2="12" />
          <line x1="7" y1="15" x2="11" y2="15" />
        </svg>
        Assignments
      </a>
    {/if}
  </nav>
</aside>

<style>
  .sidebar {
    width: 250px;
    background: linear-gradient(to bottom, var(--color-sidebar-bg) 40%, var(--color-sidebar-bg-dark) 100%);
    height: 100%;
    overflow-y: auto;
    display: flex;
    z-index: 110;
    flex-direction: column;
    border-right: 2px solid var(--color-border);
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    padding: var(--space-2) 0 1rem;
  }

  .sidebar-section-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-sidebar-section-label);
    padding: var(--space-4) var(--space-4) var(--space-2);
  }

  .sidebar-nav a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 2px var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-full);
    text-decoration: none;
    color: var(--color-sidebar-text);
    font-weight: 500;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .sidebar-nav a:hover {
    background: var(--color-sidebar-hover-bg);
    color: var(--color-sidebar-text-hover);    
  }

  .sidebar-nav a.active {
    background: var(--color-sidebar-active-bg);
    color: var(--color-sidebar-active-text);
  }

  .sidebar-nav a svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
</style>
