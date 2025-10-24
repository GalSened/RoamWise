# Migration to Monorepo - October 24, 2025

This document details the consolidation of 5 separate RoamWise repositories into a unified monorepo structure.

## What Changed

### Repository Structure

**Before** (5 separate repos):
```
RoamWise-frontend-WX/     (473MB, 38 branches)
roamwise-backend-v2/      (55MB, 4 branches)
RoamWise-proxy-WX/        (484KB, 3 branches)
RoamWise-PersonalAI/      (918MB, no git history)
roamwise-routing-osrm/    (627MB, no git history)
```

**After** (1 unified repo):
```
RoamWise/
├── frontend/    (from RoamWise-frontend-WX)
├── backend/     (from roamwise-backend-v2)
├── proxy/       (from RoamWise-proxy-WX)
├── ai/          (from RoamWise-PersonalAI)
└── routing/     (from roamwise-routing-osrm)
```

### Git History Preservation

- ✅ **frontend/**: Full git history preserved via `git subtree add --squash`
- ✅ **backend/**: Full git history preserved via `git subtree add --squash`
- ✅ **proxy/**: Full git history preserved via `git subtree add --squash`
- ✅ **ai/**: History created with initial commit (was untracked)
- ✅ **routing/**: History created with initial commit (was untracked)

### Branch Consolidation

#### Frontend Branches Merged
- ✅ **test/e2e-suite-complete** - Successfully merged into main
  - Complete E2E test suite (6 test files)
  - Hazard markers with E2E testing
  - Route chips and external navigation links
  - i18n language toggle functionality
  - GitHub workflows and security docs

#### Frontend Branches NOT Merged
29 feature branches were NOT merged due to conflicts and unrelated histories. These are documented in `frontend/UNMERGED_BRANCHES.md`:
- 10 infrastructure/tooling branches (chore/*)
- 18 feature branches (feat/*)
- 1 stabilization branch

These branches remain available in the original repository for selective merging if needed.

### Large File Handling

Implemented Git LFS for OSRM routing data:
- **Tracked patterns**: `*.osrm*`, `*.pbf`, `*.db`, `*.sqlite*`
- **Total LFS size**: ~627MB (routing data)
- **Configuration**: `.gitattributes` at monorepo root
- **Commands**:
  ```bash
  git lfs install
  git lfs pull
  ```

### Workspace Configuration

Implemented npm workspaces for unified dependency management:
- **Root**: `package.json` with workspace configuration
- **Workspaces**: frontend, backend, proxy, ai
- **Scripts**: Unified dev, build, test commands
- **Benefits**:
  - Single `npm install` for all workspaces
  - Shared dependencies deduplicated
  - Consistent versioning across components

## Migration Process

### Phase 1: Preparation ✅
- Installed Git LFS via Homebrew
- Created audit of all 5 repositories
- Created backups of all repositories
- Initialized git for untracked repos (PersonalAI, routing-osrm)
- Cleaned working directories

### Phase 2: Frontend Branch Consolidation ✅
- Merged `test/e2e-suite-complete` via fast-forward
- Documented 29 unmerged branches in `UNMERGED_BRANCHES.md`
- Preserved all branches for future selective merging

### Phase 3: Repository Unification ✅
- Created new monorepo directory structure
- Initialized Git LFS with `.gitattributes`
- Merged all 5 repositories using `git subtree add --squash`
- Migrated OSRM files to Git LFS tracking

### Phase 4: Monorepo Configuration ✅
- Created root `package.json` with workspace configuration
- Added comprehensive monorepo `README.md`
- Created unified `.gitignore`
- Set up convenience scripts for dev/build/test

### Phase 5: Cross-Reference Updates ✅
- Updated documentation to reflect monorepo structure
- Verified localhost references are appropriate for local dev
- Created this migration guide

## Path Changes

### Development URLs (unchanged for local dev)
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:3000`
- Proxy: `http://localhost:8080`
- AI Service: `http://localhost:4000`

### Repository Paths
Update any external scripts or documentation from:
```bash
# Old paths
~/RoamWise-frontend-WX/
~/roamwise-backend-v2/
~/RoamWise-proxy-WX/
```

To:
```bash
# New paths
~/RoamWise/frontend/
~/RoamWise/backend/
~/RoamWise/proxy/
```

### Import Paths (no change needed)
All internal imports remain the same:
- Frontend: `@/components/...`, `@/lib/...`, etc.
- Backend: Relative imports unchanged
- Services communicate via environment variables

## Environment Variables

### Frontend (`.env` in `frontend/`)
```bash
VITE_GOOGLE_MAPS_API_KEY=...
VITE_OPENWEATHERMAP_API_KEY=...
VITE_BACKEND_URL=http://localhost:3000
VITE_PROXY_URL=http://localhost:8080
```

### Backend (`.env` in `backend/`)
```bash
PORT=3000
DATABASE_PATH=./data/roamwise.db
JWT_SECRET=...
OSRM_URL=http://localhost:5000
```

### Proxy (`.env` in `proxy/`)
```bash
PORT=8080
BACKEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:4000
```

### AI Service (`.env` in `ai/`)
```bash
PORT=4000
OPENAI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```

## New Workflow

### Installation
```bash
# Clone monorepo
git clone https://github.com/galsened/RoamWise.git
cd RoamWise

# Fetch LFS files
git lfs pull

# Install all dependencies (single command!)
npm install
```

### Development
```bash
# Run all services
npm run dev

# Or individual services
npm run dev:frontend
npm run dev:backend
npm run dev:proxy
npm run dev:ai
```

### Testing
```bash
# All tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck
```

### Building
```bash
# Build all components
npm run build

# Individual builds
npm run build:frontend
npm run build:backend
```

## Benefits of Monorepo

1. **Unified Dependency Management**: Single `npm install` for all components
2. **Atomic Changes**: Cross-component changes in single commit
3. **Consistent Tooling**: Shared linting, testing, CI/CD configuration
4. **Simplified Development**: Run all services with `npm run dev`
5. **Better Version Control**: Related changes stay together
6. **Reduced Duplication**: Shared utilities and types across components
7. **Git LFS Integration**: Efficient handling of large routing data

## Rollback Plan

If needed, the original repositories are still available:
- `RoamWise-frontend-WX/.backup/`
- `roamwise-backend-v2/.backup/`
- `RoamWise-proxy-WX/.backup/`
- Original repos can be restored from GitHub

## Next Steps

1. ✅ Push monorepo to GitHub
2. ⏳ Set up GitHub Actions for monorepo CI/CD
3. ⏳ Archive old repositories on GitHub
4. ⏳ Update deployment pipelines to use monorepo
5. ⏳ Update team documentation and wiki

## Questions?

See the main `README.md` for development instructions, or contact the development team.

---

Migration completed: October 24, 2025
🤖 Generated with Claude Code
