<script lang="ts">
  import AppLayout from '../../lib/components/AppLayout.svelte';
  import Loading from '../../lib/components/Loading.svelte';
  import { data } from '../../lib/stores/data';
  import { auth } from '../../lib/stores/auth';

  let workers = $derived($data.workers);
  let participants = $derived($data.participants);
  let shifts = $derived($data.shifts);
  let assignments = $derived($data.assignments);
  let myAssignments = $derived($data.myAssignments);
  let user = $derived($auth.user);
  let isLoading = $derived($data.isLoading);

  async function loadDashboard() {
    if (user && ['admin', 'coordinator'].includes(user.role)) {
      await data.loadWorkers();
      await data.loadParticipants();
      await data.loadShifts();
      await data.loadAssignments();
    } else if (user && user.role === 'worker') {
      await data.loadMyAssignments();
    }
  }

  $effect(() => {
    if (user) {
      loadDashboard();
    }
  });

  // Categorical accents for the dashboard stat tiles — validated for CVD-safety as an
  // adjacent-pair set (see dataviz skill), now sourced from design-tokens.css instead of
  // re-typed literal hex. Workers/Participants/Shifts/Assignments never render alongside
  // My Assignments (mutually exclusive by role), so reusing violet there doesn't clash.
  const STAT_COLORS = {
    workers: { accent: 'var(--color-accent-workers)', bg: 'var(--color-accent-workers-bg)' },
    participants: { accent: 'var(--color-accent-participants)', bg: 'var(--color-accent-participants-bg)' },
    shifts: { accent: 'var(--color-accent-shifts-number)', bg: 'var(--color-accent-shifts-bg)' },
    assignments: { accent: 'var(--color-accent-assignments-number)', bg: 'var(--color-accent-assignments-bg)' },
    myAssignments: { accent: 'var(--color-accent-myassignments)', bg: 'var(--color-accent-myassignments-bg)' },
  };
</script>

{#snippet workersIcon()}
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <circle cx="10" cy="8" r="2.2" />
    <path d="M6 14.5 L7 12 L13 12 L14 14.5" />
  </svg>
{/snippet}

{#snippet participantsIcon()}
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="7.5" cy="10" r="4.5" />
    <circle cx="12.5" cy="10" r="4.5" />
  </svg>
{/snippet}

{#snippet shiftsIcon()}
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="14" height="13" rx="1.5" />
    <line x1="3" y1="8" x2="17" y2="8" />
    <line x1="6.5" y1="2.5" x2="6.5" y2="5.5" />
    <line x1="13.5" y1="2.5" x2="13.5" y2="5.5" />
  </svg>
{/snippet}

{#snippet assignmentsIcon()}
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="3" width="12" height="15" rx="1.5" />
    <rect x="7" y="2" width="6" height="3" rx="1" />
    <line x1="7" y1="9" x2="13" y2="9" />
    <line x1="7" y1="12" x2="13" y2="12" />
    <line x1="7" y1="15" x2="11" y2="15" />
  </svg>
{/snippet}

{#snippet arrowIcon()}
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="10" x2="16" y2="10" />
    <polyline points="11 5 16 10 11 15" />
  </svg>
{/snippet}

{#snippet statCard(label: string, description: string, count: number, icon: any, actionIcon: any, actionLabel: string, colors: { accent: string; bg: string }, href: string)}
  <div class="stat-card">
    <div class="stat-icon" style="background: {colors.bg}; color: {colors.accent}">
      {@render icon()}
    </div>
    <div class="stat-label">{label}</div>
    <div class="stat-number" style="color: {colors.accent}">{count}</div>
    <p class="stat-desc">{description}</p>
    <button
      class="stat-action"
      style="background: {colors.bg}; color: {colors.accent}"
      onclick={() => window.location.href = href}
    >
      {@render actionIcon()}
      <span>{actionLabel}</span>
      {@render arrowIcon()}
    </button>
  </div>
{/snippet}

<AppLayout>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <p>Welcome back, {user?.email}!</p>
    </div>

    {#if isLoading}
      <Loading message="Loading dashboard..." />
    {:else}
      <div class="dashboard-grid" class:single-card={user && user.role === 'worker'}>
        {#if user && ['admin', 'coordinator'].includes(user.role)}
          {@render statCard('Workers', 'Active workers', workers.length, workersIcon, workersIcon, 'Manage Workers', STAT_COLORS.workers, '/dashboard/workers')}
          {@render statCard('Participants', 'Active participants', participants.length, participantsIcon, participantsIcon, 'Manage Participants', STAT_COLORS.participants, '/dashboard/participants')}
          {@render statCard('Shifts', 'Total shifts', shifts.length, shiftsIcon, shiftsIcon, 'Manage Shifts', STAT_COLORS.shifts, '/dashboard/shifts')}
          {@render statCard('Assignments', 'Pending/assigned', assignments.filter(a => ['pending', 'accepted'].includes(a.status)).length, assignmentsIcon, assignmentsIcon, 'View Assignments', STAT_COLORS.assignments, '/dashboard/assignments')}
        {:else if user && user.role === 'worker'}
          {@render statCard('My Assignments', `${myAssignments.filter(a => a.status === 'pending').length} pending, ${myAssignments.filter(a => a.status === 'accepted').length} accepted`, myAssignments.length, assignmentsIcon, assignmentsIcon, 'View My Assignments', STAT_COLORS.myAssignments, '/dashboard/assignments/me')}
        {/if}
      </div>
    {/if}
  </div>
</AppLayout>

<style>
  .dashboard {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dashboard-header {
    margin-bottom: 2rem;
  }

  .dashboard-header h1 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary);
    font-size: 2rem;
  }

  .dashboard-header p {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    align-items: stretch;
  }

  .dashboard-grid.single-card {
    grid-template-columns: minmax(250px, 340px);
  }

  .stat-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    padding: 1.75rem 1.5rem 1.5rem;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-hover);
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
  }

  .stat-icon :global(svg) {
    width: 26px;
    height: 26px;
  }

  .stat-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .stat-number {
    font-size: 2.75rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .stat-desc {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin: 0 0 1.5rem 0;
  }

  .stat-action {
    margin-top: auto;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.7rem 1rem;
    border: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: filter 0.15s ease;
  }

  .stat-action:hover {
    filter: brightness(0.95);
  }

  .stat-action :global(svg) {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
</style>
