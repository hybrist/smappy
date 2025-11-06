<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import SuggestionCard from '$lib/components/suggestions/SuggestionCard.svelte';

  const { Story } = defineMeta({
    title: 'Suggestions/SuggestionCard',
    component: SuggestionCard,
    tags: ['autodocs'],
    argTypes: {
      suggestion: { control: 'object' },
      projectName: { control: 'text' },
    },
  });

  const baseSuggestion = {
    id: 1,
    analysisRunId: 1,
    links: [],
  };
</script>

<Story
  name="Critical Severity"
  args={{
    suggestion: {
      ...baseSuggestion,
      type: 'TREE_SHAKING',
      severity: 'critical',
      title: 'Unused exports detected in large module',
      description:
        'The module "src/utils/helpers.js" exports 15 functions but only 3 are used. This indicates poor tree-shaking and could significantly increase bundle size.',
      links: [
        {
          entityType: 'Module',
          entityId: 42,
          entityPath: 'src/utils/helpers.js',
        },
      ],
    },
    projectName: 'my-app',
  }}
/>

<Story
  name="Warning Severity"
  args={{
    suggestion: {
      ...baseSuggestion,
      id: 2,
      type: 'DUPLICATE_CODE',
      severity: 'warning',
      title: 'Duplicate code detected across modules',
      description:
        'Similar code patterns were found in multiple modules. Consider extracting common functionality into a shared utility module to reduce duplication and bundle size.',
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
    projectName: 'my-app',
  }}
/>

<Story
  name="Info Severity"
  args={{
    suggestion: {
      ...baseSuggestion,
      id: 3,
      type: 'LARGE_DEPENDENCY',
      severity: 'info',
      title: 'Large third-party dependency detected',
      description:
        'The package "moment" (288KB) is relatively large. Consider using a lighter alternative like "date-fns" or "dayjs" to reduce bundle size.',
      links: [
        {
          entityType: 'Module',
          entityId: 100,
          entityPath: 'node_modules/moment/moment.js',
        },
      ],
    },
    projectName: 'my-app',
  }}
/>

<Story
  name="No Links"
  args={{
    suggestion: {
      ...baseSuggestion,
      id: 4,
      type: 'OPTIMIZATION',
      severity: 'info',
      title: 'Bundle optimization suggestion',
      description:
        'Your bundle could benefit from code splitting. Consider using dynamic imports for route-level components to improve initial load time.',
      links: [],
    },
  }}
/>

<Story
  name="Multiple Links"
  args={{
    suggestion: {
      ...baseSuggestion,
      id: 5,
      type: 'CODE_QUALITY',
      severity: 'warning',
      title: 'Multiple modules with circular dependencies',
      description:
        'Circular dependencies detected between several modules. This can lead to initialization issues and make the codebase harder to maintain.',
      links: [
        {
          entityType: 'Module',
          entityId: 20,
          entityPath: 'src/services/api.js',
        },
        {
          entityType: 'Module',
          entityId: 21,
          entityPath: 'src/services/auth.js',
        },
        {
          entityType: 'Module',
          entityId: 22,
          entityPath: 'src/services/user.js',
        },
        {
          entityType: 'Dependency',
          entityId: 50,
        },
      ],
    },
    projectName: 'my-app',
  }}
/>

<Story
  name="Without Project Name"
  args={{
    suggestion: {
      ...baseSuggestion,
      type: 'TREE_SHAKING',
      severity: 'critical',
      title: 'Unused exports detected',
      description: 'Some exports are not being used and could be removed.',
      links: [
        {
          entityType: 'Module',
          entityId: 42,
          entityPath: 'src/utils/helpers.js',
        },
      ],
    },
  }}
/>
