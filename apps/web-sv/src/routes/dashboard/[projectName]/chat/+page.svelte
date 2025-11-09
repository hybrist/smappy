<script lang="ts">
  import Chat from '$lib/components/Chat.svelte';
  import DashboardLayout from '../DashboardLayout.svelte';
  import type { AnalysisSummary } from '$lib/server/query/types';

  interface Props {
    data: {
      projectName: string;
      analysis: AnalysisSummary | null;
      error?: string;
    };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>AI Chat - {data.projectName} - Smappy</title>
</svelte:head>

<DashboardLayout>
  {#if data.error}
    <div
      class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20"
    >
      <p class="text-sm text-red-600 dark:text-red-400">
        Error loading analysis: {data.error}
      </p>
    </div>
  {:else}
    <div class="h-[calc(100vh-10rem)]">
      <Chat projectName={data.projectName} analysis={data.analysis ?? undefined} />
    </div>
  {/if}
</DashboardLayout>
