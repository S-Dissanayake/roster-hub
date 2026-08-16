<script lang="ts">
  import AppLayout from '../../../lib/components/AppLayout.svelte';
  import Card from '../../../lib/components/Card.svelte';
  import Button from '../../../lib/components/Button.svelte';
  import Badge from '../../../lib/components/Badge.svelte';
  import Loading from '../../../lib/components/Loading.svelte';
  import EmptyState from '../../../lib/components/EmptyState.svelte';
  import ErrorAlert from '../../../lib/components/ErrorAlert.svelte';
  import { data } from '../../../lib/stores/data';
  import { auth } from '../../../lib/stores/auth';

  let myAssignments = $derived($data.myAssignments);
  let isLoading = $derived($data.isLoading);
  let error = $derived($data.error || '');
  let user = $derived($auth.user);

  let respondingTo = $state<string | null>(null);

  async function loadMyAssignments() {
    await data.loadMyAssignments();
  }

  $effect(() => {
    if (user) {
      loadMyAssignments();
    }
  });

  async function handleRespond(assignmentId: string, status: 'accepted' | 'rejected') {
    try {
      respondingTo = assignmentId;
      await data.respondToAssignment(assignmentId, status);
    } catch (err) {
      console.error('Error responding to assignment:', err);
    } finally {
      respondingTo = null;
    }
  }

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
        <h1>My Assignments</h1>
        <p>View and respond to your shift assignments</p>
      </div>
    </div>

    {#if error}
      <ErrorAlert message={error} onclose={() => (error = '')} />
    {/if}

    {#if isLoading}
      <Loading message="Loading your assignments..." />
    {:else if myAssignments.length === 0}
      <EmptyState 
        title="No assignments" 
        message="You currently have no shift assignments."
      />
    {:else}
      <div class="assignments-grid">
        {#each myAssignments as assignment (assignment.id)}
          <Card title={`Shift Assignment`} subtitle={`${new Date(assignment.assignedAt).toLocaleDateString()}`}>
            <div class="assignment-details">
              <div class="detail-row">
                <span class="label">Status:</span>
                <Badge status={statusColors[assignment.status]} label={assignment.status} />
              </div>
              <div class="detail-row">
                <span class="label">Assigned:</span>
                <span>{new Date(assignment.assignedAt).toLocaleDateString()}</span>
              </div>
              {#if assignment.respondedAt}
                <div class="detail-row">
                  <span class="label">Responded:</span>
                  <span>{new Date(assignment.respondedAt).toLocaleDateString()}</span>
                </div>
              {/if}

              {#if assignment.status === 'pending'}
                <div class="action-buttons">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    disabled={respondingTo === assignment.id}
                    onclick={() => handleRespond(assignment.id, 'accepted')}
                  >
                    {respondingTo === assignment.id ? '⏳' : '✓'} Accept
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    disabled={respondingTo === assignment.id}
                    onclick={() => handleRespond(assignment.id, 'rejected')}
                  >
                    {respondingTo === assignment.id ? '⏳' : '✕'} Reject
                  </Button>
                </div>
              {/if}
            </div>
          </Card>
        {/each}
      </div>
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

  .assignments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .assignment-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-weight: 600;
    color: #6b7280;
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }
</style>
