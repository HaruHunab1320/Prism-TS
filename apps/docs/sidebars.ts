import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/first-program',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: [
        'reference/quick-reference',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/syntax',
        'concepts/confidence-operators',
        'concepts/uncertainty-propagation',
        'concepts/control-flow',
        'concepts/pattern-matching',
        'concepts/modules',
        'concepts/syntax-highlighting-demo',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/llm-integration',
        'guides/confidence-extraction',
        'guides/error-handling',
        'guides/best-practices',
        'guides/examples',
      ],
    },
    {
      type: 'category',
      label: 'Developer Tools',
      items: [
        'tools/index',
        'tools/cli',
        'tools/repl',
        'tools/vscode',
      ],
    },
  ],
  
  apiSidebar: [
    {
      type: 'category',
      label: 'Packages',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: '@prism-lang/core',
          items: [
            'api/core/parser',
            'api/core/runtime',
            'api/core/types',
            'api/core/values',
          ],
        },
        {
          type: 'category',
          label: '@prism-lang/confidence',
          items: [
            'api/confidence/extractor',
            'api/confidence/calibration',
            'api/confidence/patterns',
            'api/confidence/sources',
          ],
        },
        {
          type: 'category',
          label: '@prism-lang/llm',
          items: [
            'api/llm/providers',
            'api/llm/configuration',
          ],
        },
        {
          type: 'category',
          label: '@prism-lang/validator',
          items: [
            'api/validator/overview',
            'api/validator/syntax-validation',
            'api/validator/type-checking',
            'api/validator/linting',
            'api/validator/streaming',
            'api/validator/utilities',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
