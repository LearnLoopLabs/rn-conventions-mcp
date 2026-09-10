# Code comments: keep them tight

**Default: don't write overly verbose doc-blocks in code files when
clean, self-documenting code says the same thing.** Assume every line
you write is reviewed by a human.

**Why:** a multi-line comment restating what the next few lines of code
already make obvious is noise a reviewer has to read past. A comment
earns its place by carrying information the code can't — a non-obvious
constraint, a "why", a caveat that will bite someone later — not by
narrating what's already self-evident from good naming and structure.

**How to apply:**

- Before adding a comment, ask whether a clearer name, an extracted
  function, or simpler code would make the comment unnecessary. Prefer
  that over documenting the confusing version.
- When a comment is warranted, keep it to the smallest number of lines
  that convey the non-obvious part — one line beats three, three beats a
  ten-line block.
- Reserve real doc-blocks (multi-paragraph explanations, setup
  prerequisites, worked examples) for genuinely non-obvious setup steps
  a reader can't recover from the code itself — e.g. one-time CI/CD
  prerequisites — not as a default commenting style.
- This applies to comments in code and config files (`.ts`, `.js`,
  `.json` where supported, YAML, etc.). It does not apply to the
  standalone docs in this `docs/` category themselves, which exist to be
  read as documentation.
