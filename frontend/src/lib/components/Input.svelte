<script lang="ts">
  interface Props {
    label?: string;
    type?: string;
    placeholder?: string;
    value?: string | number;
    error?: string;
    required?: boolean;
    id?: string;
    onchange?: (value: string) => void;
  }

  let {
    label,
    type = 'text',
    placeholder,
    value = $bindable(''),
    error,
    required = false,
    id = `input-${Math.random()}`,
    onchange,
  }: Props = $props();
</script>

<div class="form-group">
  {#if label}
    <label for={id}>
      {label}
      {#if required}
        <span class="required">*</span>
      {/if}
    </label>
  {/if}
  <input
    {id}
    {type}
    {placeholder}
    bind:value
    onchange={(e) => onchange?.(e.currentTarget.value)}
    class:error={!!error}
  />
  {#if error}
    <span class="error-message">{error}</span>
  {/if}
</div>

<style>
  .form-group {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
  }

  label {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
    font-size: 0.95rem;
  }

  .required {
    color: var(--color-danger);
  }

  input {
    padding: 0.6rem 0.9rem;
    border: 1px solid var(--color-border-input);
    border-radius: var(--radius-sm);
    font-size: 0.95rem;
    font-family: inherit;
    transition: all 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: var(--color-brand);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  input.error {
    border-color: var(--color-danger);
  }

  .error-message {
    color: var(--color-danger);
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }
</style>
