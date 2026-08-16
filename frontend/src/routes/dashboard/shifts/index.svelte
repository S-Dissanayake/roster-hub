<script lang="ts">
  import AppLayout from '../../../lib/components/AppLayout.svelte';
  import Card from '../../../lib/components/Card.svelte';
  import Button from '../../../lib/components/Button.svelte';
  import Table from '../../../lib/components/Table.svelte';
  import Modal from '../../../lib/components/Modal.svelte';
  import Input from '../../../lib/components/Input.svelte';
  import Badge from '../../../lib/components/Badge.svelte';
  import Loading from '../../../lib/components/Loading.svelte';
  import EmptyState from '../../../lib/components/EmptyState.svelte';
  import ErrorAlert from '../../../lib/components/ErrorAlert.svelte';
  import { data } from '../../../lib/stores/data';
  import { auth } from '../../../lib/stores/auth';

  let shifts = $derived($data.shifts);
  let participants = $derived($data.participants);
  let isLoading = $derived($data.isLoading);
  let error = $derived($data.error || '');
  let user = $derived($auth.user);

  let showModal = $state(false);
  let formData = $state({
    participantId: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
  });
  let formError = $state('');
  let isSubmitting = $state(false);

  async function loadShifts() {
    await data.loadShifts();
    await data.loadParticipants();
  }

  $effect(() => {
    if (user) {
      loadShifts();
    }
  });

  async function handleSubmit() {
    // Shift has no unique constraint (participant+date+time isn't enforced), so nothing at the
    // DB level would catch a double-submit — this guard is the only thing preventing a silent
    // duplicate row.
    if (isSubmitting) return;
    formError = '';
    if (!formData.participantId || !formData.date || !formData.startTime || !formData.endTime) {
      formError = 'All fields are required';
      return;
    }
    isSubmitting = true;
    try {
      await data.addShift(formData);
      showModal = false;
      formData = { participantId: '', date: '', startTime: '', endTime: '', notes: '' };
    } catch (err: any) {
      formError = err.message;
    } finally {
      isSubmitting = false;
    }
  }

  function handleRowClick(shift: any) {
    window.location.href = `/dashboard/shifts/${shift.id}`;
  }

  const columns = [
    { key: 'date', label: 'Date', width: '15%' },
    { key: 'startTime', label: 'Start Time', width: '15%' },
    { key: 'endTime', label: 'End Time', width: '15%' },
    { key: 'status', label: 'Status', width: '15%' },
    { key: 'participantId', label: 'Participant', width: '25%' },
  ];

  const statusColors: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
    draft: 'info',
    published: 'success',
    cancelled: 'danger',
    completed: 'primary',
  };
</script>

<AppLayout>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Shifts</h1>
        <p>Manage shifts and assignments</p>
      </div>
      <Button variant="primary" onclick={() => (showModal = true)}>
        Add Shift
      </Button>
    </div>

    {#if error}
      <ErrorAlert message={error} onclose={() => (error = '')} />
    {/if}

    {#if isLoading}
      <Loading message="Loading shifts..." />
    {:else if shifts.length === 0}
      <EmptyState 
        title="No shifts found" 
        message="Start by creating your first shift."
      >
        <Button variant="primary" onclick={() => (showModal = true)}>
          Add Shift
        </Button>
      </EmptyState>
    {:else}
      <Card title="Shifts List">
        <Table {columns} rows={shifts} rowclick={handleRowClick}>
          {#snippet cell({ row, key })}
            {#if key === 'status'}
              <Badge status={statusColors[row.status]} label={row.status} />
            {:else if key === 'participantId'}
              {@const participant = participants.find((p) => p.id === row.participantId)}
              {participant ? `${participant.firstName} ${participant.lastName}` : row.participantId}
            {:else}
              {row[key] ?? '—'}
            {/if}
          {/snippet}
        </Table>
      </Card>
    {/if}

    <Modal isOpen={showModal} title="Add New Shift" onclose={() => (showModal = false)}>
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {#if formError}
          <ErrorAlert message={formError} onclose={() => (formError = '')} />
        {/if}
        <div class="form-group">
          <label for="participant-select">Participant *</label>
          <select id="participant-select" bind:value={formData.participantId} required>
            <option value="">Select a participant</option>
            {#each participants as p}
              <option value={p.id}>{p.firstName} {p.lastName}</option>
            {/each}
          </select>
        </div>
        <Input 
          label="Date" 
          type="date"
          bind:value={formData.date}
          required
        />
        <Input 
          label="Start Time" 
          type="time"
          bind:value={formData.startTime}
          required
        />
        <Input 
          label="End Time" 
          type="time"
          bind:value={formData.endTime}
          required
        />
        <Input 
          label="Notes" 
          placeholder="Additional notes" 
          bind:value={formData.notes}
        />
        <div class="modal-actions">
          <Button variant="secondary" onclick={() => (showModal = false)}>
            Cancel
          </Button>
          <Button variant="primary" onclick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Shift'}
          </Button>
        </div>
      </form>
    </Modal>
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

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #1f2937;
    font-size: 0.95rem;
    display: block;
  }

  select {
    width: 100%;
    padding: 0.6rem 0.9rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.95rem;
    font-family: inherit;
  }

  select:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
</style>
