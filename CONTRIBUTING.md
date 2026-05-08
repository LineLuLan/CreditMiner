# Contributing to CreditMiner

> Internal team workflow guide. Read this **before** your first commit.

---

## 1. Branching Model

```
main      ─── stable releases / deploy only (never commit directly)
  │
  ▼
develop   ─── integration branch, always working
  │
  ├─▶ backend    ── all backend (Java/Spring Boot/Weka) work
  └─▶ frontend   ── all frontend (Next.js) work
```

| Branch | Purpose | Who pushes |
|---|---|---|
| `main` | Tagged releases, deploy target | Lead only, via merge from `develop` |
| `develop` | Integration | Anyone, via merge from `backend`/`frontend` |
| `backend` | BE day-to-day work | BE engineers |
| `frontend` | FE day-to-day work | FE engineers |

---

## 2. Sync Rules — **NO REBASE, NO FORCE PUSH**

| From → To | Method | When |
|---|---|---|
| `backend` ↔ `develop` | `git merge --no-ff` (bidirectional) | After each BE task / pulling FE-related shared changes |
| `frontend` ↔ `develop` | `git merge --no-ff` (bidirectional) | After each FE task / pulling BE-related shared changes |
| `develop` → `main` | `git merge --no-ff` | Only on release/deploy |
| `docs/*.md` updates | Edit on owning branch → merge to `develop` → merge to siblings | After every tracker update |

### Why `--no-ff`?
History stays linear-readable but is **never rewritten**. Each merge produces a discoverable commit anchor — easy to revert, easy to bisect.

### Forbidden operations
- `git rebase` on shared branches
- `git push --force` / `--force-with-lease` on shared branches
- `git commit --amend` after pushing
- Skipping pre-commit hooks (`--no-verify`)

If you absolutely need one of these, ask the lead first.

---

## 3. Daily Workflow

### Backend engineer

```bash
# Start of day — pull latest develop into backend
git checkout backend
git fetch origin
git merge --no-ff origin/develop -m "chore: sync develop -> backend"
git push origin backend

# Work on a task...
git add <files>
git commit -m "feat(be): <description>"
git push origin backend

# When task is done — propagate to develop
git checkout develop
git merge --no-ff backend -m "chore: merge backend -> develop"
git push origin develop
```

### Frontend engineer

Same flow, swap `backend` ↔ `frontend`.

### Updating a docs/ tracker

```bash
# Edit on whichever branch you are working on
git add docs/BE_Tracker.md
git commit -m "docs: update BE_Tracker — task BE-12 done"
git push origin <your-branch>

# Sync to develop and the sibling branch
git checkout develop
git merge --no-ff <your-branch> -m "docs: sync trackers"
git push origin develop

# Pull develop into the sibling branch (so they see latest tracker)
git checkout <sibling-branch>
git merge --no-ff develop -m "chore: pull tracker updates"
git push origin <sibling-branch>
```

> **Tip**: use `scripts/sync-branches.ps1` to automate the merge dance.

---

## 4. Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>           # optional
<footer>         # optional, e.g. "Closes #12"
```

### Types
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `chore` — tooling, deps, repo hygiene
- `test` — adding/fixing tests
- `refactor` — code change that neither adds a feature nor fixes a bug
- `perf` — performance improvement
- `style` — formatting only

### Scopes
- `be` — backend
- `fe` — frontend
- `db` — database
- `ci` — CI/CD
- `docs` — documentation

### Examples
```
feat(be): implement /api/predict endpoint with RandomForest inference
fix(fe): debounce search input on customer table
docs: update BE_Handoff with v2 PredictResponse schema
chore(ci): add Maven cache to backend-ci workflow
```

---

## 5. Trackers (the source of truth)

All in `docs/`:

| File | Owner | Update when |
|---|---|---|
| `BE_Tracker.md` | BE team | Start/finish a BE task |
| `FE_Tracker.md` | FE team | Start/finish a FE task |
| `BE_Handoff.md` | BE → FE | API contract changes |
| `FE_Handoff.md` | FE → BE | New ask from FE |
| `Project_Roadmap.md` | Lead | Weekly milestone review |
| `Test_Walkthrough.md` | Whoever ships the feature | New feature ready for E2E |
| `Feature_Critical.md` | Lead | MVP scope changes |

**Rule:** every commit that closes a task must update the relevant tracker in the same commit.

---

## 6. Code Style

- **Java**: Google Java Style Guide (4-space indent, 120-char lines)
- **TypeScript**: ESLint + Prettier (config in `web/`)
- **SQL**: lowercase keywords, snake_case identifiers, one column per line in CREATE TABLE
- **YAML**: 2-space indent, no tabs
- **Markdown**: ATX headers, fenced code blocks with language, no trailing whitespace

---

## 7. Pull Requests (optional, but encouraged for cross-branch work)

This project allows direct pushes for speed, but for **cross-branch** work or anything touching `main`, open a PR:

1. PR title = commit message subject
2. Body uses the template (auto-loaded from `.github/pull_request_template.md` if present)
3. Reviewer checks: tracker updated? tests added? handoff doc current?

---

## 8. When in Doubt

- **Conflicts during merge?** Resolve manually — never `git merge --abort` and try `rebase` instead. Commit the resolution.
- **Pushed something wrong?** Make a NEW commit that reverts/fixes it. Never rewrite history.
- **Branch out-of-sync after long hiatus?** Pull `develop` into your branch via `merge --no-ff` first, resolve conflicts, then continue.
- **Need to share docs change with everyone fast?** Update on `develop`, then merge to both `backend` and `frontend`.

Questions → ping the lead. Better to ask than to push and break.
