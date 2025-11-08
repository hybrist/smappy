<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import SuggestionList from '$lib/components/suggestions/SuggestionList.svelte';

  const { Story } = defineMeta({
    title: 'Suggestions/SuggestionList',
    component: SuggestionList,
    tags: ['autodocs'],
    argTypes: {
      suggestions: { control: 'object' },
      projectName: { control: 'text' },
    },
  });

  const mockSuggestions = [
    {
      id: 1,
      analysisRunId: 1,
      type: 'TREE_SHAKING',
      severity: 'critical',
      title: 'Unused exports in utility module',
      description:
        'The module "src/utils/helpers.js" exports 15 functions but only 3 are used. This indicates poor tree-shaking.',
      links: [
        {
          entityType: 'Module',
          entityId: 42,
          entityPath: 'src/utils/helpers.js',
        },
      ],
    },
    {
      id: 2,
      analysisRunId: 1,
      type: 'DUPLICATE_CODE',
      severity: 'warning',
      title: 'Duplicate code detected',
      description: 'Similar code patterns found across multiple components.',
      links: [
        {
          entityType: 'Module',
          entityId: 10,
          entityPath: 'src/components/Button.js',
        },
        {
          entityType: 'Module',
          entityId: 11,
          entityPath: 'src/components/Input.js',
        },
      ],
    },
    {
      id: 3,
      analysisRunId: 1,
      type: 'LARGE_DEPENDENCY',
      severity: 'info',
      title: 'Large third-party dependency',
      description:
        'The package "moment" is relatively large. Consider a lighter alternative like "dayjs".',
      links: [
        {
          entityType: 'Module',
          entityId: 100,
          entityPath: 'node_modules/moment/moment.js',
        },
      ],
    },
    {
      id: 4,
      analysisRunId: 1,
      type: 'TREE_SHAKING',
      severity: 'warning',
      title: 'Partial tree-shaking in lodash',
      description: 'Only some lodash functions are used but the entire library is included.',
      links: [
        {
          entityType: 'Module',
          entityId: 101,
          entityPath: 'node_modules/lodash/lodash.js',
        },
      ],
    },
    {
      id: 5,
      analysisRunId: 1,
      type: 'CODE_SPLITTING',
      severity: 'info',
      title: 'Consider code splitting for routes',
      description: 'Use dynamic imports for route components to improve initial load time.',
      links: [],
    },
    {
      id: 6,
      analysisRunId: 1,
      type: 'DUPLICATE_CODE',
      severity: 'critical',
      title: 'Critical code duplication in core modules',
      description:
        'Significant code duplication found in authentication and user management modules.',
      links: [
        {
          entityType: 'Module',
          entityId: 20,
          entityPath: 'src/auth/login.js',
        },
        {
          entityType: 'Module',
          entityId: 21,
          entityPath: 'src/auth/register.js',
        },
      ],
    },
  ];
</script>

<Story
  name="With Multiple Suggestions"
  args={{
    suggestions: mockSuggestions,
    projectName: 'my-app',
  }}
/>

<Story
  name="Empty List"
  args={{
    suggestions: [],
    projectName: 'my-app',
  }}
/>

<Story
  name="Only Critical"
  args={{
    suggestions: mockSuggestions.filter((s) => s.severity === 'critical'),
    projectName: 'my-app',
  }}
/>

<Story
  name="Only Warnings"
  args={{
    suggestions: mockSuggestions.filter((s) => s.severity === 'warning'),
    projectName: 'my-app',
  }}
/>

<Story
  name="Only Info"
  args={{
    suggestions: mockSuggestions.filter((s) => s.severity === 'info'),
    projectName: 'my-app',
  }}
/>

<Story
  name="Single Type"
  args={{
    suggestions: mockSuggestions.filter((s) => s.type === 'TREE_SHAKING'),
    projectName: 'my-app',
  }}
/>

<Story
  name="Without Project Name"
  args={{
    suggestions: mockSuggestions,
  }}
/>

<Story
  name="Large List"
  args={{
    suggestions: [
      ...mockSuggestions,
      ...mockSuggestions.map((s, i) => ({ ...s, id: s.id + 100 + i })),
      ...mockSuggestions.map((s, i) => ({ ...s, id: s.id + 200 + i })),
    ],
    projectName: 'my-app',
  }}
/>
