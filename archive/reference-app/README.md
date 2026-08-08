# Candidate Tracker prototype

React + TypeScript prototype based on the imported Figma design context.

## Run

```bash
npm install
npm run dev
```

## Architecture notes

- UI imports data through `src/data/repository.ts` only.
- Dummy data lives in `src/data/mock/` and can be removed when an API-backed repository is added.
- Shared product types live in `src/domain/`.
- Feature pages live in `src/features/`.
- Reusable layout/UI components live in `src/components/`.

To connect a backend later, implement `CandidateTrackerRepository` from:

```txt
src/data/repositories/candidateTrackerRepository.ts
```

Then swap the export in:

```txt
src/data/repository.ts
```
