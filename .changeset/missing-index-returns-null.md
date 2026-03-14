---
"@prism-lang/core": patch
---

Bracket access on objects with missing keys now returns null instead of throwing, matching JS-like semantics for dynamic property lookups.
