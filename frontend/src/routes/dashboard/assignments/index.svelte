<script lang="ts">
  import AppLayout from '../../../lib/components/AppLayout.svelte';
  import Card from '../../../lib/components/Card.svelte';
  import Button from '../../../lib/components/Button.svelte';
  import Table from '../../../lib/components/Table.svelte';
  import Badge from '../../../lib/components/Badge.svelte';
  import Loading from '../../../lib/components/Loading.svelte';
  import EmptyState from '../../../lib/components/EmptyState.svelte';
  import ErrorAlert from '../../../lib/components/ErrorAlert.svelte';
  import { data } from '../../../lib/stores/data';
  import { auth } from '../../../lib/stores/auth';

  let assignments = $derived($data.assignments);
  let isLoading = $derived($data.isLoading);
  let error = $derived($data.error || '');
  let user = $derived($auth.user);

  async function loadAssignments() {
    await data.loadAssignments();
  }

  $effect(() => {
    if (user) {
      loadAssignments();
    }
  });

  function handleRowClick(assignment: any) {
    window.location.href = `/dashboard/shifts/${assignment.shiftId}`;
  }

  const columns = [
    { key: 'workerId', label: 'Worker', width: '20%' },
    { key: 'participant', label: 'Participant', width: '20%' },
    { key: 'shiftTime', label: 'Shift', width: '22%' },
    { key: 'status', label: 'Status', width: '13%' },
    { key: 'assignedAt', label: 'Assigned At', width: '12%' },
    { key: 'respondedAt', label: 'Responded At', width: '13%' },
  ];

  const statusColors: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
    pending: 'info',
    accepted: 'success',
    rejected: 'danger',
    cancelled: 'warning',
  };
</script>

<AppLayout>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Assignments</h1>
        <p>Manage shift assignments and worker responses</p>
      </div>
    </div>

    {#if error}
      <ErrorAlert message={error} onclose={() => (error = '')} />
    {/if}

    {#if isLoading}
      <Loading message="Loading assignments..." />
    {:else if assignments.length === 0}
      <EmptyState 
        title="No assignments found" 
        message="Create shifts and assign workers to get started."
      />
    {:else}
      <Card title="Assignments List">
        <Table {columns} rows={assignments} rowclick={handleRowClick}>
          {#snippet cell({ row, key })}
            {#if key === 'status'}
              <Badge status={statusColors[row.status]} label={row.status} />
            {:else if key === 'assignedAt'}
              {new Date(row.assignedAt).toLocaleDateString()}
            {:else if key === 'respondedAt'}
              {row.respondedAt ? new Date(row.respondedAt).toLocaleDateString() : '—'}
            {:else if key === 'workerId'}
              {row.worker?.user ? `${row.worker.user.firstName} ${row.worker.user.lastName}` : row.workerId}
            {:else if key === 'participant'}
              {row.shift?.participant ? `${row.shift.participant.firstName} ${row.shift.participant.lastName}` : '—'}
            {:else if key === 'shiftTime'}
              {row.shift ? `${row.shift.date} · ${row.shift.startTime?.slice(0, 5)}–${row.shift.endTime?.slice(0, 5)}` : '—'}
            {:else}
              {row[key] ?? '—'}
            {/if}
          {/snippet}
        </Table>
      </Card>
    {/if}
  </div>
</AppLayout>

<style>
  .page {
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

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 2rem;
  }

  .page-header p {
    margin: 0;
    color: #6b7280;
  }
</style>
