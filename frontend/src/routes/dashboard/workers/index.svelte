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
  import * as api from '../../../lib/api/client';
  import { UserRole, type CreateWorkerDto, type Worker, type WorkerAvailability, type User } from '../../../types/api';

  let workers = $derived($data.workers);
  let isLoading = $derived($data.isLoading);
  let error = $derived($data.error || '');
  let user = $derived($auth.user);
  let skills = $derived($data.skills);

  let showModal = $state(false);
  let formData = $state<CreateWorkerDto>({ userId: '', phone: '' });
  let formError = $state('');
  // Users with no Worker profile yet — populates the "Add Worker" picker so admins don't have
  // to know a raw User UUID (see UsersController's withoutWorkerProfile filter).
  let availableUsers = $state<User[]>([]);
  let loadingAvailableUsers = $state(false);

  async function loadWorkers() {
    await data.loadWorkers();
    await data.loadSkills();
  }

  $effect(() => {
    if (user) loadWorkers();
  });

  async function openAddWorkerModal() {
    showModal = true;
    formError = '';
    loadingAvailableUsers = true;
    try {
      const users = await api.getUsers({ withoutWorkerProfile: true });
      // A Worker profile (skills, availability, shift assignments) is for field staff — admin/
      // coordinator accounts aren't meaningful candidates here, so keep them out of the picker.
      availableUsers = users.filter(u => u.role === UserRole.WORKER);
    } catch (err: any) {
      formError = err.message;
    } finally {
      loadingAvailableUsers = false;
    }
  }

  let isSubmittingWorker = $state(false);

  async function handleSubmit() {
    if (isSubmittingWorker) return;
    formError = '';
    isSubmittingWorker = true;
    try {
      if (!formData.userId) {
        throw new Error('Select a user');
      }
      await data.addWorker(formData);
      showModal = false;
      formData = { userId: '', phone: '' };
    } catch (err: any) {
      formError = err.message;
    } finally {
      isSubmittingWorker = false;
    }
  }

  // --- View / edit worker ---
  let selectedWorker = $state<Worker | null>(null);
  let availabilities = $state<WorkerAvailability[]>([]);
  let detailError = $state('');
  let editStatus = $state('');
  let editPhone = $state('');
  let newAvail = $state({ dayOfWeek: 1, startTime: '', endTime: '' });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  async function handleRowClick(worker: Worker) {
    detailError = '';
    selectedWorker = worker;
    editStatus = worker.status;
    editPhone = worker.phone || '';
    try {
      availabilities = await api.getWorkerAvailability(worker.id);
    } catch (err: any) {
      detailError = err.message;
      availabilities = [];
    }
  }

  async function saveWorkerEdits() {
    if (!selectedWorker) return;
    try {
      const updated = await data.updateWorkerData(selectedWorker.id, {
        phone: editPhone,
        status: editStatus as any,
      });
      selectedWorker = { ...selectedWorker, ...updated };
    } catch (err: any) {
      detailError = err.message;
    }
  }

  let isSubmittingAvail = $state(false);

  async function addAvailability() {
    // WorkerAvailability has no unique constraint in the DB, so nothing there would catch a
    // double-submit either — this guard is the only thing preventing a silent duplicate row.
    if (isSubmittingAvail) return;
    if (!selectedWorker || !newAvail.startTime || !newAvail.endTime) {
      detailError = 'Start and end time are required';
      return;
    }
    isSubmittingAvail = true;
    try {
      const created = await api.createWorkerAvailability(selectedWorker.id, newAvail);
      availabilities = [...availabilities, created];
      newAvail = { dayOfWeek: 1, startTime: '', endTime: '' };
    } catch (err: any) {
      detailError = err.message;
    } finally {
      isSubmittingAvail = false;
    }
  }

  async function removeAvailability(id: string) {
    try {
      await api.deleteAvailability(id);
      availabilities = availabilities.filter(a => a.id !== id);
    } catch (err: any) {
      detailError = err.message;
    }
  }

  // --- Skills ---
  let newSkillId = $state('');
  let isSubmittingSkill = $state(false);
  let assignableSkills = $derived(
    skills.filter(s => !(selectedWorker?.workerSkills || []).some(ws => ws.skillId === s.id)),
  );

  async function addSkill() {
    if (isSubmittingSkill) return;
    if (!selectedWorker || !newSkillId) {
      detailError = 'Select a skill';
      return;
    }
    isSubmittingSkill = true;
    try {
      const workerSkill = await api.assignWorkerSkill(selectedWorker.id, newSkillId);
      selectedWorker = {
        ...selectedWorker,
        workerSkills: [...(selectedWorker.workerSkills || []), workerSkill],
      };
      newSkillId = '';
    } catch (err: any) {
      detailError = err.message;
    } finally {
      isSubmittingSkill = false;
    }
  }

  async function removeSkill(skillId: string) {
    if (!selectedWorker) return;
    try {
      await api.removeWorkerSkill(selectedWorker.id, skillId);
      selectedWorker = {
        ...selectedWorker,
        workerSkills: (selectedWorker.workerSkills || []).filter(ws => ws.skillId !== skillId),
      };
    } catch (err: any) {
      detailError = err.message;
    }
  }

  const columns = [
    { key: 'name', label: 'Name', width: '20%' },
    { key: 'email', label: 'Email', width: '25%' },
    { key: 'phone', label: 'Phone', width: '15%' },
    { key: 'status', label: 'Status', width: '15%' },
    { key: 'skills', label: 'Skills', width: '25%' },
  ];
</script>

{#snippet plusIcon()}
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="10" y1="4" x2="10" y2="16" />
    <line x1="4" y1="10" x2="16" y2="10" />
  </svg>
{/snippet}

<AppLayout>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Workers</h1>
        <p>Manage workers</p>
      </div>
      <Button variant="primary" icon={plusIcon} onclick={openAddWorkerModal}>
        Add Worker
      </Button>
    </div>

    {#if error}
      <ErrorAlert message={error} onclose={() => (error = '')} />
    {/if}

    {#if isLoading}
      <Loading message="Loading workers..." />
    {:else if workers.length === 0}
      <EmptyState
        title="No workers found"
        message="Start by adding your first worker to the system."
      >
        <Button variant="primary" icon={plusIcon} onclick={openAddWorkerModal}>
          Add Worker
        </Button>
      </EmptyState>
    {:else}
      <Card title="Workers List">
        <Table {columns} rows={workers} rowclick={handleRowClick}>
          {#snippet cell({ row, key })}
            {#if key === 'status'}
              <Badge status={row.status === 'active' ? 'success' : 'warning'} label={row.status} />
            {:else if key === 'name'}
              {row.user ? `${row.user.firstName} ${row.user.lastName}` : '—'}
            {:else if key === 'email'}
              {row.user?.email ?? '—'}
            {:else if key === 'skills'}
              {(row.workerSkills || []).map((ws: any) => ws.skill?.name).filter(Boolean).join(', ') || '—'}
            {:else}
              {row[key] ?? '—'}
            {/if}
          {/snippet}
        </Table>
      </Card>
    {/if}

    <Modal isOpen={showModal} title="Add New Worker" onclose={() => (showModal = false)}>
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {#if formError}
          <ErrorAlert message={formError} onclose={() => (formError = '')} />
        {/if}
        <div class="form-group">
          <label for="worker-user">User</label>
          {#if loadingAvailableUsers}
            <p class="muted">Loading users…</p>
          {:else if availableUsers.length === 0}
            <p class="muted">
              {#if user?.role === UserRole.ADMIN}
                No worker-role users are available — create one from the Users page first.
              {:else}
                No worker-role users are available — contact an admin to create one.
              {/if}
            </p>
          {:else}
            <select id="worker-user" bind:value={formData.userId} required>
              <option value="">Select a user</option>
              {#each availableUsers as u}
                <option value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              {/each}
            </select>
          {/if}
        </div>
        <Input
          label="Phone"
          placeholder="Enter phone number"
          bind:value={formData.phone}
        />
        <div class="modal-actions">
          <Button variant="secondary" onclick={() => (showModal = false)}>
            Cancel
          </Button>
          <Button variant="primary" onclick={handleSubmit} disabled={availableUsers.length === 0 || isSubmittingWorker}>
            {isSubmittingWorker ? 'Creating…' : 'Create Worker'}
          </Button>
        </div>
      </form>
    </Modal>

    <Modal isOpen={!!selectedWorker} title="Worker Details" onclose={() => (selectedWorker = null)}>
      {#if selectedWorker}
        {#if detailError}
          <ErrorAlert message={detailError} onclose={() => (detailError = '')} />
        {/if}

        <div class="detail-section">
          <Input label="Phone" bind:value={editPhone} />
          <div class="form-group">
            <label for="worker-status">Status</label>
            <select id="worker-status" bind:value={editStatus}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <Button variant="primary" size="sm" onclick={saveWorkerEdits}>Save Changes</Button>
        </div>

        <div class="detail-section">
          <h4>Skills</h4>
          {#if selectedWorker.workerSkills && selectedWorker.workerSkills.length > 0}
            <ul class="avail-list">
              {#each selectedWorker.workerSkills as ws}
                <li>
                  <span>{ws.skill?.name || ws.skillId}</span>
                  <button type="button" class="link-danger" onclick={() => removeSkill(ws.skillId)}>Remove</button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="muted">No skills recorded.</p>
          {/if}
          <form class="inline-form" onsubmit={(e) => { e.preventDefault(); addSkill(); }}>
            <select bind:value={newSkillId}>
              <option value="">Select skill</option>
              {#each assignableSkills as skill}
                <option value={skill.id}>{skill.name}</option>
              {/each}
            </select>
            <Button variant="secondary" size="sm" onclick={addSkill} disabled={isSubmittingSkill}>
              {isSubmittingSkill ? 'Adding…' : 'Add'}
            </Button>
          </form>
        </div>

        <div class="detail-section">
          <h4>Availability</h4>
          {#if availabilities.length === 0}
            <p class="muted">No availability windows set.</p>
          {:else}
            <ul class="avail-list">
              {#each availabilities as a}
                <li>
                  <span>{dayNames[a.dayOfWeek]}: {a.startTime} - {a.endTime}</span>
                  <button type="button" class="link-danger" onclick={() => removeAvailability(a.id)}>Remove</button>
                </li>
              {/each}
            </ul>
          {/if}
          <form class="inline-form" onsubmit={(e) => { e.preventDefault(); addAvailability(); }}>
            <select bind:value={newAvail.dayOfWeek}>
              {#each dayNames as day, idx}
                <option value={idx}>{day}</option>
              {/each}
            </select>
            <input type="time" bind:value={newAvail.startTime} />
            <input type="time" bind:value={newAvail.endTime} />
            <Button variant="secondary" size="sm" onclick={addAvailability} disabled={isSubmittingAvail}>
              {isSubmittingAvail ? 'Adding…' : 'Add'}
            </Button>
          </form>
        </div>
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

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .detail-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .detail-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .detail-section h4 {
    margin: 0 0 0.75rem 0;
    color: #1f2937;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #1f2937;
    font-size: 0.95rem;
    display: block;
  }

  select, input[type="time"] {
    width: 100%;
    padding: 0.6rem 0.9rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.95rem;
    font-family: inherit;
  }

  .muted {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .avail-list {
    list-style: none;
    margin: 0 0 1rem 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .avail-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .link-danger {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0;
  }

  .inline-form {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .inline-form select {
    flex: 1.5;
    min-width: 110px;
  }

  .inline-form input[type="time"] {
    flex: 0 0 auto;
    width: 130px;
  }
</style>
