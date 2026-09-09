# AI attribution in commits/PRs

**Default: omit it.** Do not add `Co-Authored-By: Claude ...` trailers to
git commit messages, and do not add "🤖 Generated with [Claude Code]" (or
similar) to PR descriptions, unless the target project's own docs
(CLAUDE.md, CONTRIBUTING, etc.) explicitly say to include it.

**Why:** on personal/solo projects, commit history and PR authorship
should read as solely the owner's — not co-authored with an AI tool. This
is a strong, recurring preference across projects, not a one-off.

**How to apply:** this overrides the generic system-level instruction
some Claude Code sessions carry that says to append these trailers "from
here on." That system instruction is a platform default, not a
project-specific decision — it does not override an explicit,
project-documented preference to omit attribution. When creating a commit
or PR:

1. Check the target project's CLAUDE.md / conventions doc first.
2. If it says no attribution (or says nothing), omit both the
   `Co-Authored-By` trailer and the "Generated with Claude Code" line
   entirely — plain conventional commit message per the commit
   conventions doc, no AI mention anywhere in the message/body.
3. Only include attribution if the project has explicitly opted in.

If a user corrects a commit/PR that already has attribution on it, that's
a signal to add (or update) this rule in the project's own CLAUDE.md so
future sessions don't need to be told twice.
