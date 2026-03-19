---
name: git-safe-commit-push
description: Automates committing and pushing changes while ensuring a clean history of a single commit. Use when requested to commit and push changes, especially when pre-commit hooks or remote conflicts are expected.
---

# Git Safe Commit Push

This skill automates the process of committing and pushing changes, with built-in error handling for pre-commit hooks and remote conflicts, ensuring that only a single commit is pushed for the current task.

## Workflow

### 1. Staging and Committing

- **Action:** Stage relevant changes and attempt to commit.
- **Error Handling (Pre-commit/Lint/Tests):**
  - If the commit fails (e.g., due to lint errors or failing tests), analyze the output.
  - Fix the reported issues directly in the codebase.
  - Re-stage the fixes and retry the commit.
  - Repeat until the commit is successful.

### 2. Pushing to Remote

- **Action:** Attempt to push the commit to the remote repository.
- **Error Handling (Remote Rejected/Non-fast-forward):**
  - If the push fails because the remote contains changes not present locally:
    1. **Undo the local commit:** Run `git reset --soft HEAD~1`. This keeps your changes staged.
    2. **Sync with remote:** Run `git pull --rebase`. This fetches remote changes and applies your staged changes on top.
    3. **Resolve Conflicts:** If the pull/rebase results in conflicts, resolve them, then run `git add .` and `git rebase --continue` (or follow git's instructions).
    4. **Re-commit:** Once synced, run `git commit -m "[original message]"` (or use `git commit -C ORIG_HEAD` to reuse the message).
    5. **Retry Push:** Attempt `git push` again.

## Single Commit Guarantee

The goal of this skill is to avoid "fixup" or "merge" commits on the remote. By using `git reset --soft` and `git pull --rebase`, we ensure that the final result on the remote is a single, clean commit containing both the original work and any necessary fixes or remote updates.

## Verification

- Always run `git status` after a successful push to ensure the working directory is clean and the branch is up to date with the remote.
