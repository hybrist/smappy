<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PageHeader from './PageHeader.svelte';

  const { Story } = defineMeta({
    title: 'UI/PageHeader',
    component: PageHeader,
    tags: ['autodocs'],
    argTypes: {
      title: {
        control: 'text',
      },
      description: {
        control: 'text',
      },
    },
  });
</script>

<script>
  import Button from './Button.svelte';
</script>

<!--
  @component PageHeader Stories

  Showcases the PageHeader component with different configurations.
-->

<Story name="Basic">
  <PageHeader title="Bundle Overview" />
</Story>

<Story name="With Description">
  <PageHeader
    title="Bundle Overview"
    description="Analyze your bundle size, dependencies, and optimization opportunities."
  />
</Story>

<Story name="With Action Button">
  <PageHeader title="Suggestions" description="Optimization suggestions for your bundle">
    {#snippet actions()}
      <Button variant="primary">Generate Suggestions</Button>
    {/snippet}
  </PageHeader>
</Story>

<Story name="With Multiple Actions">
  <PageHeader title="Compare Runs" description="Compare bundle analysis across different runs">
    {#snippet actions()}
      <Button variant="secondary">Export Data</Button>
      <Button variant="primary">New Comparison</Button>
    {/snippet}
  </PageHeader>
</Story>

<Story name="Long Title and Description">
  <PageHeader
    title="Advanced Bundle Analysis Dashboard with Detailed Metrics"
    description="This comprehensive dashboard provides in-depth analysis of your bundle size, dependencies, code splitting opportunities, and performance optimization recommendations. Use the tools below to explore your bundle structure and identify areas for improvement."
  >
    {#snippet actions()}
      <Button variant="ghost">Help</Button>
      <Button variant="primary">Settings</Button>
    {/snippet}
  </PageHeader>
</Story>

<Story name="Minimal">
  <PageHeader title="Dependencies" description="View and analyze module dependencies" />
</Story>

<Story name="With Link Action">
  <PageHeader title="Documentation" description="Learn more about bundle optimization">
    {#snippet actions()}
      <Button variant="link">View Docs →</Button>
    {/snippet}
  </PageHeader>
</Story>
