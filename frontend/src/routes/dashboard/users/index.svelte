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
  import { UserRole, type CreateUserDto } from '../../../types/api';

  let users = $derived($data.users);
  let isLoading = $derived($data.isLoading);
  let error = $derived($data.error || '');
  let currentUser = $derived($auth.user);

  let showModal = $state(false);
  let formData = $state<CreateUserDto>({
    email: '',
    firstName: '',
    lastName: '',
    role: UserRole.WORKER,
    password: '',
  });
  let formError = $state('');
  let isSubmitting = $state(false);

  async function loadUsers() {
    await data.loadUsers();
  }

  $effect(() => {
    if (currentUser) loadUsers();
  });

  async function handleSubmit() {
    formError = '';
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) {
      formError = 'All fields are required';
      return;
    }
    if (formData.password.length < 8) {
      formError = 'Password must be at least 8 characters';
      return;
    }
    isSubmitting = true;
    try {
      await data.addUser(formData);
      showModal = false;
      formData = { email: '', firstName: '', lastName: '', role: UserRole.WORKER, password: '' };
    } catch (err: any) {
      formError = err.message;
    } finally {
      isSubmitting = false;
    }
  }

  const columns = [    
    { key: 'firstName', label: 'First Name', width: '20%' },
    { key: 'lastName', label: 'Last Name', width: '20%' },
    { key: 'email', label: 'Email', width: '30%' },
    { key: 'role', label: 'Role', width: '15%' },
    { key: 'createdAt', label: 'Created', width: '15%' },
  ];

  const roleBadge: Record<string, 'primary' | 'info' | 'success'> = {
    admin: 'primary',
    coordinator: 'info',
    worker: 'success',
  };
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
        <h1>Users</h1>
        <p>Provision Keycloak accounts and manage system users</p>
      </div>
      <Button variant="primary" icon={plusIcon} onclick={() => (showModal = true)}>
        Add User
      </Button>
    </div>

    {#if error}
      <ErrorAlert message={error} onclose={() => (error = '')} />
    {/if}

    {#if isLoading}
      <Loading message="Loading users..." />
    {:else if users.length === 0}
      <EmptyState
        title="No users found"
        message="Start by adding your first user to the system."
      >
        <Button variant="primary" icon={plusIcon} onclick={() => (showModal = true)}>
          Add User
        </Button>
      </EmptyState>
    {:else}
      <Card title="Users List">
        <Table {columns} rows={users}>
          {#snippet cell({ row, key })}
            {#if key === 'role'}
              <Badge status={roleBadge[row.role] ?? 'info'} label={row.role} />
            {:else if key === 'createdAt'}
              {new Date(row.createdAt).toLocaleDateString()}
            {:else}
              {row[key] ?? '—'}
            {/if}
          {/snippet}
        </Table>
      </Card>
    {/if}

    <Modal isOpen={showModal} title="Add New User" onclose={() => (showModal = false)}>
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
          label="Email"
          type="email"
          placeholder="name@rosterflow.com"
          bind:value={formData.email}
          required
        />
        <div class="form-group">
          <label for="user-role">Role</label>
          <select id="user-role" bind:value={formData.role}>
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.COORDINATOR}>Coordinator</option>
            <option value={UserRole.WORKER}>Worker</option>
          </select>
        </div>
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          bind:value={formData.password}
          required
        />
        <div class="modal-actions">
          <Button variant="secondary" onclick={() => (showModal = false)}>
            Cancel
          </Button>
          <Button variant="primary" onclick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create User'}
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
