<script lang="ts">
  import './app.css';
  import { auth } from './lib/stores/auth';

  // Import all route components
  import LoginPage from './routes/login.svelte';
  import AuthCallbackPage from './routes/auth/callback.svelte';
  import DashboardIndex from './routes/dashboard/index.svelte';
  import UsersIndex from './routes/dashboard/users/index.svelte';
  import WorkersIndex from './routes/dashboard/workers/index.svelte';
  import ParticipantsIndex from './routes/dashboard/participants/index.svelte';
  import ShiftsIndex from './routes/dashboard/shifts/index.svelte';
  import ShiftDetail from './routes/dashboard/shifts/detail.svelte';
  import EligibilityPage from './routes/dashboard/shifts/eligibility.svelte';
  import AssignmentsIndex from './routes/dashboard/assignments/index.svelte';
  import MyAssignmentsPage from './routes/dashboard/assignments/me.svelte';

  let currentPath = $state(window.location.pathname || '/');
  let isInitialized = $state(false);

  // Reactive auth state via store auto-subscription
  let authState = $derived($auth);

  // Initialize auth on mount
  $effect(() => {
    auth.initialize().then(() => {
      isInitialized = true;
    });
  });

  // Handle popstate navigation
  $effect(() => {
    const handlePop = () => {
      currentPath = window.location.pathname || '/';
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  });

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    currentPath = path;
    window.scrollTo(0, 0);
  }

  // Extract path params
  function matchRoute(pattern: RegExp, path: string): RegExpMatchArray | null {
    return path.match(pattern);
  }

  type RouteName =
    | 'login'
    | 'auth-callback'
    | 'dashboard'
    | 'users'
    | 'workers'
    | 'participants'
    | 'shifts'
    | 'shift-detail'
    | 'eligibility'
    | 'assignments'
    | 'myassignments'
    | null;

  interface RouteResult {
    name: RouteName;
    params: Record<string, string>;
  }

  let routeResult = $derived.by((): RouteResult => {
    if (!isInitialized) return { name: null, params: {} };

    const p = currentPath;

    // Public routes (no auth required)
    if (p === '/auth/callback') return { name: 'auth-callback', params: {} };

    if (p === '/' || p === '/login' || p === '/auth') {
      if (authState.isAuthenticated) {
        // Will redirect below
        return { name: 'dashboard', params: {} };
      }
      return { name: 'login', params: {} };
    }

    // Protected routes
    if (!authState.isAuthenticated) {
      return { name: 'login', params: {} };
    }

    if (p === '/dashboard') return { name: 'dashboard', params: {} };

    if (p === '/dashboard/users') return { name: 'users', params: {} };

    if (p === '/dashboard/workers') return { name: 'workers', params: {} };

    if (p === '/dashboard/participants') return { name: 'participants', params: {} };

    if (p === '/dashboard/shifts') return { name: 'shifts', params: {} };

    const eligibilityMatch = matchRoute(/^\/dashboard\/shifts\/([^/]+)\/eligibility$/, p);
    if (eligibilityMatch) return { name: 'eligibility', params: { id: eligibilityMatch[1] } };

    const shiftDetailMatch = matchRoute(/^\/dashboard\/shifts\/([^/]+)$/, p);
    if (shiftDetailMatch) return { name: 'shift-detail', params: { id: shiftDetailMatch[1] } };

    if (p === '/dashboard/assignments/me') return { name: 'myassignments', params: {} };

    if (p === '/dashboard/assignments') return { name: 'assignments', params: {} };

    // fallback
    return { name: 'dashboard', params: {} };
  });

  // Side-effect navigation for auth redirects
  $effect(() => {
    if (!isInitialized) return;
    const { name } = routeResult;
    const p = currentPath;

    if (name === 'auth-callback') return;

    if ((p === '/' || p === '/login' || p === '/auth') && authState.isAuthenticated) {
      navigate('/dashboard');
    } else if (p.startsWith('/dashboard') && !authState.isAuthenticated) {
      navigate('/');
    }
  });
</script>

{#if !isInitialized}
  <div class="loading-screen">
    <div class="spinner"></div>
    <p>Initializing RosterFlow...</p>
  </div>
{:else if routeResult.name === 'auth-callback'}
  <AuthCallbackPage />
{:else if routeResult.name === 'login'}
  <LoginPage />
{:else if routeResult.name === 'dashboard'}
  <DashboardIndex />
{:else if routeResult.name === 'users'}
  <UsersIndex />
{:else if routeResult.name === 'workers'}
  <WorkersIndex />
{:else if routeResult.name === 'participants'}
  <ParticipantsIndex />
{:else if routeResult.name === 'shifts'}
  <ShiftsIndex />
{:else if routeResult.name === 'shift-detail'}
  <ShiftDetail id={routeResult.params.id} />
{:else if routeResult.name === 'eligibility'}
  <EligibilityPage shiftId={routeResult.params.id} />
{:else if routeResult.name === 'assignments'}
  <AssignmentsIndex />
{:else if routeResult.name === 'myassignments'}
  <MyAssignmentsPage />
{:else}
  <div class="error-screen">
    <h1>Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/dashboard">Go to Dashboard</a>
  </div>
{/if}

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: var(--color-bg-page);
    color: #1f2937;
    line-height: 1.5;
  }

  :global(html, body, #app) {
    height: 100%;
    width: 100%;
  }

  :global(#app) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: transparent;
    gap: 1rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-brand);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading-screen p {
    color: var(--color-text-secondary);
    font-size: 1rem;
    margin: 0;
    font-weight: 500;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    text-align: center;
    gap: 1rem;
  }

  .error-screen h1 {
    margin: 0;
    color: #1f2937;
  }

  .error-screen p {
    margin: 0;
    color: #6b7280;
  }

  .error-screen a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 600;
  }
</style>
