<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TreemapVisualizationView from './TreemapVisualizationView.svelte';

  const { Story } = defineMeta({
    title: 'Dashboard/TreemapVisualizationView',
    component: TreemapVisualizationView,
    tags: ['autodocs'],
    argTypes: {
      width: {
        control: 'number',
        description: 'Width of the visualization',
      },
      height: {
        control: 'number',
        description: 'Height of the visualization',
      },
      isLoading: {
        control: 'boolean',
        description: 'Whether data is loading',
      },
      error: {
        control: 'text',
        description: 'Error message to display',
      },
    },
  });

  // Mock treemap data - simulating a typical bundle structure
  const mockTreemapData = {
    name: 'root',
    children: [
      {
        name: 'node_modules',
        children: [
          {
            name: 'react',
            bundledSize: 128000,
            originalSize: 256000,
            gzipSize: 45000,
            fileType: 'javascript',
            isThirdParty: true,
            packageName: 'react',
            filePath: 'node_modules/react/index.js',
          },
          {
            name: 'react-dom',
            bundledSize: 312000,
            originalSize: 520000,
            gzipSize: 98000,
            fileType: 'javascript',
            isThirdParty: true,
            packageName: 'react-dom',
            filePath: 'node_modules/react-dom/index.js',
          },
          {
            name: 'lodash',
            bundledSize: 245000,
            originalSize: 480000,
            gzipSize: 72000,
            fileType: 'javascript',
            isThirdParty: true,
            packageName: 'lodash',
            filePath: 'node_modules/lodash/lodash.js',
          },
          {
            name: 'd3',
            children: [
              {
                name: 'd3-scale',
                bundledSize: 28000,
                originalSize: 45000,
                gzipSize: 9000,
                fileType: 'javascript',
                isThirdParty: true,
                packageName: 'd3-scale',
                filePath: 'node_modules/d3-scale/index.js',
              },
              {
                name: 'd3-array',
                bundledSize: 32000,
                originalSize: 52000,
                gzipSize: 11000,
                fileType: 'javascript',
                isThirdParty: true,
                packageName: 'd3-array',
                filePath: 'node_modules/d3-array/index.js',
              },
              {
                name: 'd3-hierarchy',
                bundledSize: 24000,
                originalSize: 38000,
                gzipSize: 8000,
                fileType: 'javascript',
                isThirdParty: true,
                packageName: 'd3-hierarchy',
                filePath: 'node_modules/d3-hierarchy/index.js',
              },
            ],
          },
        ],
      },
      {
        name: 'src',
        children: [
          {
            name: 'components',
            children: [
              {
                name: 'Button.tsx',
                bundledSize: 8500,
                originalSize: 12000,
                gzipSize: 3200,
                fileType: 'typescript',
                isThirdParty: false,
                filePath: 'src/components/Button.tsx',
              },
              {
                name: 'Card.tsx',
                bundledSize: 6200,
                originalSize: 9000,
                gzipSize: 2400,
                fileType: 'typescript',
                isThirdParty: false,
                filePath: 'src/components/Card.tsx',
              },
              {
                name: 'Header.tsx',
                bundledSize: 15000,
                originalSize: 22000,
                gzipSize: 5500,
                fileType: 'typescript',
                isThirdParty: false,
                filePath: 'src/components/Header.tsx',
              },
            ],
          },
          {
            name: 'pages',
            children: [
              {
                name: 'Home.tsx',
                bundledSize: 12000,
                originalSize: 18000,
                gzipSize: 4200,
                fileType: 'typescript',
                isThirdParty: false,
                filePath: 'src/pages/Home.tsx',
              },
              {
                name: 'Dashboard.tsx',
                bundledSize: 24000,
                originalSize: 35000,
                gzipSize: 8500,
                fileType: 'typescript',
                isThirdParty: false,
                filePath: 'src/pages/Dashboard.tsx',
              },
            ],
          },
          {
            name: 'utils',
            children: [
              {
                name: 'helpers.ts',
                bundledSize: 4500,
                originalSize: 7000,
                gzipSize: 1800,
                fileType: 'typescript',
                isThirdParty: false,
                filePath: 'src/utils/helpers.ts',
              },
              {
                name: 'api.ts',
                bundledSize: 8000,
                originalSize: 12000,
                gzipSize: 3000,
                fileType: 'typescript',
                isThirdParty: false,
                filePath: 'src/utils/api.ts',
              },
            ],
          },
        ],
      },
      {
        name: 'assets',
        children: [
          {
            name: 'styles.css',
            bundledSize: 48000,
            originalSize: 65000,
            gzipSize: 12000,
            fileType: 'css',
            isThirdParty: false,
            filePath: 'assets/styles.css',
          },
          {
            name: 'logo.png',
            bundledSize: 24000,
            originalSize: 24000,
            gzipSize: 24000,
            fileType: 'image',
            isThirdParty: false,
            filePath: 'assets/logo.png',
          },
        ],
      },
    ],
  };

  // Smaller dataset for testing
  const smallTreemapData = {
    name: 'root',
    children: [
      {
        name: 'app.js',
        bundledSize: 52000,
        originalSize: 75000,
        gzipSize: 18000,
        fileType: 'javascript',
        isThirdParty: false,
        filePath: 'src/app.js',
      },
      {
        name: 'vendor.js',
        bundledSize: 312000,
        originalSize: 520000,
        gzipSize: 98000,
        fileType: 'javascript',
        isThirdParty: true,
        packageName: 'vendor-bundle',
        filePath: 'node_modules/vendor.js',
      },
      {
        name: 'styles.css',
        bundledSize: 28000,
        originalSize: 45000,
        gzipSize: 9000,
        fileType: 'css',
        isThirdParty: false,
        filePath: 'src/styles.css',
      },
    ],
  };
</script>

<!--
  @component TreemapVisualizationView Stories

  Showcases the TreemapVisualizationView component with various data states.
  This component is a pure UI component that accepts treemap data as props,
  making it easy to test and demonstrate without network requests.
-->

<Story name="Default with Mock Data">
  <div class="h-[700px] w-full">
    <TreemapVisualizationView data={mockTreemapData} width={1200} height={600} />
  </div>
</Story>

<Story name="Small Dataset">
  <div class="h-[700px] w-full">
    <TreemapVisualizationView data={smallTreemapData} width={1200} height={600} />
  </div>
</Story>

<Story name="Loading State">
  <div class="h-[700px] w-full">
    <TreemapVisualizationView data={null} width={1200} height={600} isLoading={true} />
  </div>
</Story>

<Story name="Error State">
  <div class="h-[700px] w-full">
    <TreemapVisualizationView
      data={null}
      width={1200}
      height={600}
      isLoading={false}
      error="Failed to load treemap data. Please try again."
      onRetry={() => console.log('Retry clicked')}
    />
  </div>
</Story>

<Story name="Custom Dimensions">
  <div class="h-[500px] w-full">
    <TreemapVisualizationView data={smallTreemapData} width={800} height={400} />
  </div>
</Story>

<Story name="Responsive Width">
  <div class="h-[700px] w-full">
    <div class="mx-auto max-w-4xl">
      <TreemapVisualizationView data={mockTreemapData} height={600} />
    </div>
  </div>
</Story>

<Story name="Empty Data">
  <div class="h-[700px] w-full">
    <TreemapVisualizationView data={{ name: 'root', children: [] }} width={1200} height={600} />
  </div>
</Story>

<Story name="Deep Hierarchy">
  <div class="h-[700px] w-full">
    <TreemapVisualizationView
      data={{
        name: 'root',
        children: [
          {
            name: 'level1',
            children: [
              {
                name: 'level2',
                children: [
                  {
                    name: 'level3',
                    children: [
                      {
                        name: 'file1.js',
                        bundledSize: 50000,
                        originalSize: 75000,
                        gzipSize: 18000,
                        fileType: 'javascript',
                        isThirdParty: false,
                        filePath: 'src/level1/level2/level3/file1.js',
                      },
                      {
                        name: 'file2.js',
                        bundledSize: 30000,
                        originalSize: 45000,
                        gzipSize: 12000,
                        fileType: 'javascript',
                        isThirdParty: false,
                        filePath: 'src/level1/level2/level3/file2.js',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }}
      width={1200}
      height={600}
    />
  </div>
</Story>
