<script lang="ts">
  import AppLayout from '../../../lib/components/AppLayout.svelte';
  import Card from '../../../lib/components/Card.svelte';
  import Badge from '../../../lib/components/Badge.svelte';
  import Loading from '../../../lib/components/Loading.svelte';
  import ErrorAlert from '../../../lib/components/ErrorAlert.svelte';
  import * as api from '../../../lib/api/client';

  interface Props {
    shiftId: string;
  }

  let { shiftId }: Props = $props();

  let eligibilityReport = $state<any>(null);
  let isLoading = $state(false);
  let error = $state('');

  async function loadEligibility() {
    if (!shiftId) return;

    isLoading = true;
    error = '';

    try {
      eligibilityReport = await api.checkShiftEligibility(shiftId);
    } catch (err: any) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (shiftId) loadEligibility();
  });

  const reasonLabels: Record<string, string> = {
    INACTIVE_WORKER: 'Worker is inactive',
    MISSING_SKILL: 'Missing required skill',
    NOT_AVAILABLE: 'Not available during shift hours',
    SHIFT_OVERLAP: 'Overlapping shift assignment',
  };
</script>

<AppLayout>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Shift Eligibility</h1>
        <p>Review worker eligibility for this shift</p>
      </div>
    </div>

    {#if error}
      <ErrorAlert message={error} onclose={() => (error = '')} />
    {/if}

    {#if isLoading}
      <Loading message="Checking eligibility..." />
    {:else if eligibilityReport}
      <div class="eligibility-grid">
        {#each eligibilityReport.workers as result}
          <Card
            title={result.workerName}
            subtitle={result.eligible ? '✓ Eligible' : '✕ Not Eligible'}
          >
            <div class="eligibility-status">
              {#if result.eligible}
                <Badge status="success" label="ELIGIBLE" />
              {:else}
                <Badge status="danger" label="NOT ELIGIBLE" />
              {/if}
            </div>

            {#if result.reasons && result.reasons.length > 0}
              <div class="reasons">
                <h4>Reasons for ineligibility:</h4>
                <ul>
                  {#each result.reasons as reason}
                    <li>
                      <span class="reason-label">{reasonLabels[reason] || reason}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if result.details}
              <div class="details">
                {#if result.details.missingSkillNames && result.details.missingSkillNames.length > 0}
                  <div class="detail-section">
                    <h5>Missing Skills:</h5>
                    <p>{result.details.missingSkillNames.join(', ')}</p>
                  </div>
                {/if}
                {#if result.details.overlappingAssignmentIds && result.details.overlappingAssignmentIds.length > 0}
                  <div class="detail-section">
                    <h5>Overlapping Assignments:</h5>
                    <p>{result.details.overlappingAssignmentIds.join(', ')}</p>
                  </div>
                {/if}
              </div>
            {/if}
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

  .eligibility-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .eligibility-status {
    margin-bottom: 1rem;
  }

  .reasons {
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 6px;
    padding: 1rem;
    margin: 1rem 0;
  }

  .reasons h4 {
    margin: 0 0 0.5rem 0;
    color: #92400e;
    font-size: 0.95rem;
  }

  .reasons ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .reasons li {
    color: #78350f;
    margin-bottom: 0.25rem;
  }

  .reason-label {
    font-weight: 500;
  }

  .details {
    margin-top: 1rem;
  }

  .detail-section {
    margin-bottom: 1rem;
  }

  .detail-section h5 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .detail-section p {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
  }
</style>
