# Project workflow

For user-authorized changes to this repository, complete the work, run the checks appropriate to the change, and then synchronize the completed change to GitHub:

1. Review `git status` and the exact diff before committing.
2. Stage and commit only files changed for the current task. Preserve pre-existing staged, unstaged, and untracked user work.
3. Do not commit secrets, credentials, local caches, generated dependencies, or unrelated files.
4. Push the task's commit to `origin/main`. If the remote has advanced, integrate it safely; never force-push to make synchronization succeed.
5. Verify the pushed commit is on `origin/main` and report the commit hash. If commit or push fails, state what remains local and why.

Do not create a commit for a read-only task. Do not bundle unrelated user changes into a task commit.
