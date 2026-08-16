<script lang="ts">
  import AppLayout from '../../lib/components/AppLayout.svelte';
  import Card from '../../lib/components/Card.svelte';
  import Button from '../../lib/components/Button.svelte';
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

<AppLayout>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <p>Welcome back, {user?.email}!</p>
    </div>

    {#if isLoading}
      <Loading message="Loading dashboard..." />
    {:else}
      <div class="dashboard-grid">
        {#if user && ['admin', 'coordinator'].includes(user.role)}
          <Card title="Workers" subtitle="Active workers" icon={workersIcon} iconColor={STAT_COLORS.workers.accent} iconBg={STAT_COLORS.workers.bg} interactive>
            <div class="stat-large" style="color: {STAT_COLORS.workers.accent}">{workers.length}</div>
            <Button variant="primary" size="sm" onclick={() => window.location.href = '/dashboard/workers'}>
              Manage Workers
            </Button>
          </Card>

          <Card title="Participants" subtitle="Active participants" icon={participantsIcon} iconColor={STAT_COLORS.participants.accent} iconBg={STAT_COLORS.participants.bg} interactive>
            <div class="stat-large" style="color: {STAT_COLORS.participants.accent}">{participants.length}</div>
            <Button variant="primary" size="sm" onclick={() => window.location.href = '/dashboard/participants'}>
              Manage Participants
            </Button>
          </Card>

          <Card title="Shifts" subtitle="Total shifts" icon={shiftsIcon} iconColor={STAT_COLORS.shifts.accent} iconBg={STAT_COLORS.shifts.bg} interactive>
            <div class="stat-large" style="color: {STAT_COLORS.shifts.accent}">{shifts.length}</div>
            <Button variant="primary" size="sm" onclick={() => window.location.href = '/dashboard/shifts'}>
              Manage Shifts
            </Button>
          </Card>

          <Card title="Assignments" subtitle="Pending/assigned" icon={assignmentsIcon} iconColor={STAT_COLORS.assignments.accent} iconBg={STAT_COLORS.assignments.bg} interactive>
            <div class="stat-large" style="color: {STAT_COLORS.assignments.accent}">{assignments.filter(a => ['pending', 'accepted'].includes(a.status)).length}</div>
            <Button variant="primary" size="sm" onclick={() => window.location.href = '/dashboard/assignments'}>
              View Assignments
            </Button>
          </Card>
        {:else if user && user.role === 'worker'}
          <Card title="My Assignments" subtitle="Active assignments" icon={assignmentsIcon} iconColor={STAT_COLORS.myAssignments.accent} iconBg={STAT_COLORS.myAssignments.bg} interactive>
            <div class="stat-large" style="color: {STAT_COLORS.myAssignments.accent}">{myAssignments.length}</div>
            <p class="stat-sub">
              {myAssignments.filter(a => a.status === 'pending').length} pending,
              {myAssignments.filter(a => a.status === 'accepted').length} accepted
            </p>
            <Button variant="primary" size="sm" onclick={() => window.location.href = '/dashboard/assignments/me'}>
              View My Assignments
            </Button>
          </Card>
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
  }

  .stat-large {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 1rem 0;
  }

  .stat-sub {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin-top: 0.5rem;
  }
</style>
