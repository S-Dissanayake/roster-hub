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
  import type { CreateParticipantDto, Participant } from '../../../types/api';

  let participants = $derived($data.participants);
  let isLoading = $derived($data.isLoading);
  let error = $derived($data.error || '');
  let user = $derived($auth.user);

  let showModal = $state(false);
  let formData = $state<CreateParticipantDto>({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    notes: '',
  });
  let formError = $state('');
  let isSubmitting = $state(false);

  async function loadParticipants() {
    await data.loadParticipants();
  }

  $effect(() => {
    if (user) loadParticipants();
  });

  async function handleSubmit() {
    // Participant has no unique constraint (no email/linked user to key on), so nothing at the
    // DB level would catch a double-submit — this guard is the only thing preventing a silent
    // duplicate row.
    if (isSubmitting) return;
    formError = '';
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.address) {
      formError = 'All fields are required';
      return;
    }
    isSubmitting = true;
    try {
      await data.addParticipant(formData);
      showModal = false;
      formData = { firstName: '', lastName: '', phone: '', address: '', notes: '' };
    } catch (err: any) {
      formError = err.message;
    } finally {
      isSubmitting = false;
    }
  }

  // --- View / edit participant ---
  let selectedParticipant = $state<Participant | null>(null);
  let editForm = $state({ firstName: '', lastName: '', phone: '', address: '', status: '', notes: '' });
  let detailError = $state('');

  function handleRowClick(participant: Participant) {
    detailError = '';
    selectedParticipant = participant;
    editForm = {
      firstName: participant.firstName,
      lastName: participant.lastName,
      phone: participant.phone,
      address: participant.address,
      status: participant.status,
      notes: participant.notes || '',
    };
  }

  async function saveParticipantEdits() {
    if (!selectedParticipant) return;
    try {
      await data.updateParticipantData(selectedParticipant.id, editForm as any);
      selectedParticipant = null;
    } catch (err: any) {
      detailError = err.message;
    }
  }

  const columns = [
    { key: 'firstName', label: 'First Name', width: '20%' },
    { key: 'lastName', label: 'Last Name', width: '20%' },
    { key: 'phone', label: 'Phone', width: '20%' },
    { key: 'address', label: 'Address', width: '25%' },
    { key: 'status', label: 'Status', width: '15%' },
  ];
</script>

<AppLayout>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Participants</h1>
        <p>Manage care participants and their information</p>
      </div>
      <Button variant="primary" onclick={() => (showModal = true)}>
        Add Participant
      </Button>
    </div>

    {#if error}
      <ErrorAlert message={error} onclose={() => (error = '')} />
    {/if}

    {#if isLoading}
      <Loading message="Loading participants..." />
    {:else if participants.length === 0}
      <EmptyState
        title="No participants found"
        message="Start by adding your first participant to the system."
      >
        <Button variant="primary" onclick={() => (showModal = true)}>
          Add Participant
        </Button>
      </EmptyState>
    {:else}
      <Card title="Participants List">
        <Table {columns} rows={participants} rowclick={handleRowClick}>
          {#snippet cell({ row, key })}
            {#if key === 'status'}
              <Badge status={row.status === 'active' ? 'success' : 'warning'} label={row.status} />
            {:else}
              {row[key] ?? '—'}
            {/if}
          {/snippet}
        </Table>
      </Card>
    {/if}

    <Modal isOpen={showModal} title="Add New Participant" onclose={() => (showModal = false)}>
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {#if formError}
          <ErrorAlert message={formError} onclose={() => (formError = '')} />
        {/if}
        <Input
          label="First Name"
          placeholder="Enter first name"
          bind:value={formData.firstName}
          required
        />
        <Input
          label="Last Name"
          placeholder="Enter last name"
          bind:value={formData.lastName}
          required
        />
        <Input
          label="Phone"
          placeholder="Enter phone number"
          bind:value={formData.phone}
          required
        />
        <Input
          label="Address"
          placeholder="Enter address"
          bind:value={formData.address}
          required
        />
        <Input
          label="Notes"
          placeholder="Internal notes (optional)"
          bind:value={formData.notes}
        />
        <div class="modal-actions">
          <Button variant="secondary" onclick={() => (showModal = false)}>
            Cancel
          </Button>
          <Button variant="primary" onclick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Participant'}
          </Button>
        </div>
      </form>
    </Modal>

    <Modal isOpen={!!selectedParticipant} title="Participant Details" onclose={() => (selectedParticipant = null)}>
      {#if selectedParticipant}
        {#if detailError}
          <ErrorAlert message={detailError} onclose={() => (detailError = '')} />
        {/if}
        <form onsubmit={(e) => { e.preventDefault(); saveParticipantEdits(); }}>
          <Input label="First Name" bind:value={editForm.firstName} required />
          <Input label="Last Name" bind:value={editForm.lastName} required />
          <Input label="Phone" bind:value={editForm.phone} required />
          <Input label="Address" bind:value={editForm.address} required />
          <div class="form-group">
            <label for="participant-status">Status</label>
            <select id="participant-status" bind:value={editForm.status}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <Input label="Notes" bind:value={editForm.notes} />
          <div class="modal-actions">
            <Button variant="secondary" onclick={() => (selectedParticipant = null)}>Close</Button>
            <Button variant="primary" onclick={saveParticipantEdits}>Save Changes</Button>
          </div>
        </form>
      {/if}
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

  .form-group {
    margin-bottom: 0;
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

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
</style>
