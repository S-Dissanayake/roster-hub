<script lang="ts">
  import { auth } from '../lib/stores/auth';
  import Button from '../lib/components/Button.svelte';
  import Input from '../lib/components/Input.svelte';
  import ErrorAlert from '../lib/components/ErrorAlert.svelte';

  let error = $state('');
  let isLoading = $state(false);

  async function handleLogin() {
    error = '';
    isLoading = true;

    try {
      await auth.login();
      // Browser navigates away to Keycloak here; isLoading intentionally left true.
    } catch (err: any) {
      error = err.message;
      isLoading = false;
    }
  }

  // Check if already authenticated
  $effect(() => {
    if ($auth.isAuthenticated) {
      window.location.href = '/dashboard';
    }
  });
</script>

<div class="login-page">
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>🏥 Roster Flow</h1>
        <p>Care-Sector Rostering System</p>
      </div>

      {#if error}
        <ErrorAlert message={error} onclose={() => (error = '')} />
      {/if}

      <div class="login-info">
        <p>
          This application uses Keycloak for authentication.
          You'll be redirected to Keycloak to sign in.
        </p>
      </div>

      <div class="login-actions">
        <Button
          variant="primary"
          size="lg"
          disabled={isLoading}
          onclick={handleLogin}
          fullWidth
        >
          {isLoading ? 'Redirecting…' : 'Login with Keycloak'}
        </Button>
      </div>

      <div class="login-footer">
        <p>Redirecting after authentication...</p>
      </div>
    </div>
  </div>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: url('/background.jpg') center / cover no-repeat;
  }

  .login-container {
    width: 100%;
    max-width: 600px;
    padding: 2rem;

  }

  .login-box {
    background: white;
    border-radius: 8px;
    box-shadow: 0 15px 25px 2px rgba(0, 0, 0, 0.3);
    padding: 2rem;
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-header h1 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 1.75rem;
  }

  .login-header p {
    margin: 0;
    color: #6b7280;
    font-size: 0.95rem;
  }

  .login-info {
    background: #f0f9ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    color: #1e40af;
  }

  .login-info p {
    margin: 0 0 0.5rem 0;
  }

  .login-info p:last-child {
    margin-bottom: 0;
  }

  .login-actions {
    margin-bottom: 1.5rem;
  }

  .login-footer {
    text-align: center;
    font-size: 0.85rem;
    color: #6b7280;
  }

  .login-footer p {
    margin: 0;
  }
</style>
