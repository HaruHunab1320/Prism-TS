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
      label: 'Core Concepts',
      items: [
        'concepts/syntax',
        'concepts/confidence-operators',
        'concepts/uncertainty-propagation',
        'concepts/control-flow',
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
  ],
  
  apiSidebar: [
    {
      type: 'category',
      label: 'Core API',
      items: [
        'api/core/parser',
        'api/core/runtime',
        'api/core/types',
        'api/core/values',
      ],
    },
    {
      type: 'category',
      label: 'Confidence API',
      items: [
        'api/confidence/extractor',
        'api/confidence/calibration',
        'api/confidence/patterns',
      ],
    },
    {
      type: 'category',
      label: 'LLM API',
      items: [
        'api/llm/providers',
        'api/llm/configuration',
      ],
    },
  ],
};

export default sidebars;