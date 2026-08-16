<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Column {
    key: string;
    label: string;
    width?: string;
  }

  interface Props {
    columns: Column[];
    rows: any[];
    rowclick?: (row: any) => void;
    // Optional snippet for rendering specific cells: receives { row, key }
    cell?: Snippet<[{ row: any; key: string }]>;
  }

  let { columns, rows, rowclick, cell }: Props = $props();
</script>

<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        {#each columns as col}
          <th style={col.width ? `width: ${col.width}` : ''}>{col.label}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
        <tr onclick={() => rowclick?.(row)}>
          {#each columns as col}
            <td>
              {#if cell}
                {@render cell({ row, key: col.key })}
              {:else}
                {row[col.key] ?? '—'}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrapper {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    max-height: calc(100vh - 320px);
    overflow: auto;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  thead {
    background: var(--color-bg-subtle);
  }

  th {
    position: sticky;
    top: 0;
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--color-bg-subtle);
    border-bottom: 1px solid var(--color-border);
    z-index: 1;
  }

  td {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-subtle);
    color: var(--color-text-body);
  }

  tbody tr {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  tbody tr:hover {
    background: var(--color-bg-hover);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
</style>
