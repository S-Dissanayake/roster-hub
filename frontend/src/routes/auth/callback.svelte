<script lang="ts">
  import { auth } from '../../lib/stores/auth';
  import ErrorAlert from '../../lib/components/ErrorAlert.svelte';

  let error = $state('');

  $effect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const kcError = params.get('error_description') || params.get('error');

    if (kcError) {
      error = kcError;
      return;
    }

    if (!code) {
      error = 'Missing authorization code from Keycloak';
      return;
    }

    auth.handleCallback(code)
      .then(() => {
        window.location.href = '/dashboard';
      })
      .catch((err: any) => {
        error = err.message || 'Login failed';
      });
  });
</script>

<div class="callback-page">
  {#if error}
    <div class="callback-box">
      <ErrorAlert message={error} />
      <a href="/">Back to login</a>
    </div>
  {:else}
    <div class="spinner"></div>
    <p>Completing sign-in…</p>
  {/if}
</div>

<style>
  .callback-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .callback-box {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
  }

  .callback-box a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 600;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .callback-page p {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
