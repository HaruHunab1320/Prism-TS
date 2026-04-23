# Proposed Repo Shape

Suggested standalone layout:

```text
lumina-micro/
  README.md
  paper/
    research_note.md
    appendix_methods.md
    results_table.md
    case_gallery.md
  runtime/
  demo/
  tools/
  examples/
  contracts/
  verifiers/
  data_builders/
  artifacts/
```

## Root README should do three jobs

1. say the claim in one paragraph
2. show the fastest command to run
3. point to the paper and audit docs

## Demo-first, audit-backed

The root should be demo-first.

The paper and appendix should be easy to find, but they should not replace the runnable artifact as the main entrypoint.
