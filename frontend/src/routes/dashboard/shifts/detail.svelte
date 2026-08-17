<script lang="ts">
  import AppLayout from '../../../lib/components/AppLayout.svelte';
  import Card from '../../../lib/components/Card.svelte';
  import Button from '../../../lib/components/Button.svelte';
  import Input from '../../../lib/components/Input.svelte';
  import Badge from '../../../lib/components/Badge.svelte';
  import Loading from '../../../lib/components/Loading.svelte';
  import ErrorAlert from '../../../lib/components/ErrorAlert.svelte';
  import { data } from '../../../lib/stores/data';
  import * as api from '../../../lib/api/client';
  import { ApiConflictError } from '../../../lib/api/client';
  import type { Shift, EligibilityReason } from '../../../types/api';

  interface Props {
    id: string;
  }

  let { id }: Props = $props();

  let shift = $state<Shift | null>(null);
  let isLoading = $state(true);
  let loadError = $state('');

  let participants = $derived($data.participants);
  let workers = $derived($data.workers);
  let skills = $derived($data.skills);

  const reasonLabels: Record<string, string> = {
    INACTIVE_WORKER: 'Worker is inactive',
    MISSING_SKILL: 'Missing required skill',
    NOT_AVAILABLE: 'Not available during shift hours',
    SHIFT_OVERLAP: 'Overlapping shift assignment',
  };

  const statusColors: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
    draft: 'info',
    published: 'success',
    cancelled: 'danger',
    completed: 'primary',
    pending: 'info',
    accepted: 'success',
    rejected: 'danger',
  };

  async function loadAll() {
    isLoading = true;
    loadError = '';
    try {
      const [s] = await Promise.all([
        api.getShift(id),
        data.loadParticipants(),
        data.loadWorkers(),
        data.loadSkills(),
      ]);
      shift = s;
    } catch (err: any) {
      loadError = err.message;
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (id) loadAll();
  });

  // --- Edit shift ---
  let editForm = $state({ participantId: '', date: '', startTime: '', endTime: '', status: '', notes: '' });
  let editing = $state(false);
  let saveError = $state('');

  function startEdit() {
    if (!shift) return;
    editForm = {
      participantId: shift.participantId,
      date: shift.date,
      startTime: shift.startTime.slice(0, 5),
      endTime: shift.endTime.slice(0, 5),
      status: shift.status,
      notes: shift.notes || '',
    };
    editing = true;
    saveError = '';
  }

  async function saveShift() {
    saveError = '';
    try {
      const updated = await data.updateShiftData(id, editForm as any);
      shift = { ...shift, ...updated };
      editing = false;
    } catch (err: any) {
      saveError = err.message;
    }
  }

  // --- Requirements ---
  let newReqSkillId = $state('');
  let reqError = $state('');
  let isSubmittingReq = $state(false);

  async function addRequirement() {
    if (isSubmittingReq) return;
    reqError = '';
    if (!newReqSkillId) {
      reqError = 'Select a skill';
      return;
    }
    isSubmittingReq = true;
    try {
      const req = await data.addShiftRequirement(id, { skillId: newReqSkillId });
      if (shift) shift = { ...shift, requirements: [...(shift.requirements || []), req] };
      newReqSkillId = '';
    } catch (err: any) {
      reqError = err.message;
    } finally {
      isSubmittingReq = false;
    }
  }

  async function removeRequirement(reqId: string) {
    try {
      await data.removeShiftRequirement(id, reqId);
      if (shift) shift = { ...shift, requirements: (shift.requirements || []).filter(r => r.id !== reqId) };
    } catch (err: any) {
      reqError = err.message;
    }
  }

  // --- Assignments ---
  let newAssignmentWorkerId = $state('');
  let assignError = $state('');
  let assignReasons = $state<EligibilityReason[] | null>(null);
  let assignDetails = $state<Record<string, any> | null>(null);
  let assigning = $state(false);

  async function createAssignment() {
    assignError = '';
    assignReasons = null;
    assignDetails = null;
    if (!newAssignmentWorkerId) {
      assignError = 'Select a worker';
      return;
    }
    assigning = true;
    try {
      const assignment = await data.addAssignment(id, { workerId: newAssignmentWorkerId });
      if (shift) shift = { ...shift, assignments: [...(shift.assignments || []), assignment] };
      newAssignmentWorkerId = '';
    } catch (err: any) {
      if (err instanceof ApiConflictError) {
        assignError = err.message;
        assignReasons = err.reasons || null;
        assignDetails = err.details || null;
      } else {
        assignError = err.message;
      }
    } finally {
      assigning = false;
    }
  }

  function workerLabel(workerId: string): string {
    const w = workers.find((x: any) => x.id === workerId);
    if (!w) return workerId;
    return w.user ? `${w.user.firstName} ${w.user.lastName}` : workerId;
  }

  function participantLabel(participantId: string): string {
    const p = participants.find((x: any) => x.id === participantId);
    return p ? `${p.firstName} ${p.lastName}` : participantId;
  }
</script>

<AppLayout>
  <div class="page">
    <div class="page-header">
      <div>
        <a href="/dashboard/shifts" class="back-link">&larr; Back to Shifts</a>
        <h1>Shift Detail</h1>
      </div>
      {#if shift}
        <a href={`/dashboard/shifts/${id}/eligibility`}>
          <Button variant="secondary">View Eligibility Report</Button>
        </a>
      {/if}
    </div>

    {#if loadError}
      <ErrorAlert message={loadError} onclose={() => (loadError = '')} />
    {/if}

    {#if isLoading}
      <Loading message="Loading shift..." />
    {:else if shift}
      <div class="grid">
        <Card title="Shift Info">
          {#if !editing}
            <div class="info-rows">
              <div class="info-row"><span class="label">Participant:</span> {participantLabel(shift.participantId)}</div>
              <div class="info-row"><span class="label">Date:</span> {shift.date}</div>
              <div class="info-row"><span class="label">Time:</span> {shift.startTime} - {shift.endTime}</div>
              <div class="info-row"><span class="label">Status:</span> <Badge status={statusColors[shift.status]} label={shift.status} /></div>
              {#if shift.notes}
                <div class="info-row"><span class="label">Notes:</span> {shift.notes}</div>
              {/if}
            </div>
            <Button variant="primary" size="sm" onclick={startEdit}>Edit Shift</Button>
          {:else}
            {#if saveError}
              <ErrorAlert message={saveError} onclose={() => (saveError = '')} />
            {/if}
            <form onsubmit={(e) => { e.preventDefault(); saveShift(); }}>
              <div class="form-group">
                <label for="edit-participant">Participant</label>
                <select id="edit-participant" bind:value={editForm.participantId}>
                  {#each participants as p}
                    <option value={p.id}>{p.firstName} {p.lastName}</option>
                  {/each}
                </select>
              </div>
              <Input label="Date" type="date" bind:value={editForm.date} />
              <Input label="Start Time" type="time" bind:value={editForm.startTime} />
              <Input label="End Time" type="time" bind:value={editForm.endTime} />
              <div class="form-group">
                <label for="edit-status">Status</label>
                <select id="edit-status" bind:value={editForm.status}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <Input label="Notes" bind:value={editForm.notes} />
              <div class="modal-actions">
                <Button variant="secondary" onclick={() => (editing = false)}>Cancel</Button>
                <Button variant="primary" onclick={saveShift}>Save</Button>
              </div>
            </form>
          {/if}
        </Card>

        <Card title="Required Skills">
          {#if reqError}
            <ErrorAlert message={reqError} onclose={() => (reqError = '')} />
          {/if}
          {#if (shift.requirements || []).length === 0}
            <p class="muted">No skill requirements set for this shift.</p>
          {:else}
            <ul class="req-list">
              {#each shift.requirements || [] as req}
                <li>
                  <span>{req.skill?.name || req.skillId}</span>
                  <button type="button" class="link-danger" onclick={() => removeRequirement(req.id)}>Remove</button>
                </li>
              {/each}
            </ul>
          {/if}
          <form class="inline-form" onsubmit={(e) => { e.preventDefault(); addRequirement(); }}>
            <select bind:value={newReqSkillId}>
              <option value="">Select skill</option>
              {#each skills as skill}
                <option value={skill.id}>{skill.name}</option>
              {/each}
            </select>
            <Button variant="secondary" size="sm" onclick={addRequirement} disabled={isSubmittingReq}>
              {isSubmittingReq ? 'Adding…' : 'Add'}
            </Button>
          </form>
        </Card>

        <Card title="Assignments">
          {#if assignError}
            <div class="conflict-box">
              <ErrorAlert message={assignError} onclose={() => (assignError = '')} />
              {#if assignReasons && assignReasons.length > 0}
                <ul class="reasons">
                  {#each assignReasons as reason}
                    <li>{reasonLabels[reason] || reason}</li>
                  {/each}
                </ul>
              {/if}
              {#if assignDetails?.missingSkillNames?.length}
                <p class="muted">Missing skills: {assignDetails.missingSkillNames.join(', ')}</p>
              {/if}
            </div>
          {/if}

          {#if (shift.assignments || []).length === 0}
            <p class="muted">No workers assigned yet.</p>
          {:else}
            <ul class="req-list">
              {#each shift.assignments || [] as assignment}
                <li>
                  <span>{workerLabel(assignment.workerId)}</span>
                  <Badge status={statusColors[assignment.status]} label={assignment.status} />
                </li>
              {/each}
            </ul>
          {/if}

          <form class="inline-form" onsubmit={(e) => { e.preventDefault(); createAssignment(); }}>
            <select bind:value={newAssignmentWorkerId}>
              <option value="">Select worker</option>
              {#each workers as worker}
                <option value={worker.id}>{worker.user ? `${worker.user.firstName} ${worker.user.lastName}` : worker.id}</option>
              {/each}
            </select>
            <Button variant="primary" size="sm" disabled={assigning} onclick={createAssignment}>
              {assigning ? 'Assigning…' : 'Assign Worker'}
            </Button>
          </form>
        </Card>
      </div>
    {/if}
  </div>
</AppLayout>

<style>
  .page { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .back-link {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    display: inline-block;
    color: #6b7280;
    text-decoration: none;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    border: 2px solid #dbdde0;
    &:hover { 
      background-color: #f3f4f6; 
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05); 
    }
  }

  .page-header h1 { margin: 0; color: #1f2937; font-size: 2rem; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
    align-items: start;
  }

  .info-rows { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .info-row .label { font-weight: 600; color: #6b7280; margin-right: 0.5rem; }
  .muted { color: #6b7280; font-size: 0.9rem; }

  form { display: flex; flex-direction: column; gap: 1rem; }

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

  .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 0.5rem; }

  .req-list { list-style: none; margin: 0 0 1rem 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .req-list li {
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

  .inline-form select { flex: 1; }

  .conflict-box { margin-bottom: 1rem; }
  .reasons { margin: 0.5rem 0; padding-left: 1.25rem; color: #92400e; }
</style>
