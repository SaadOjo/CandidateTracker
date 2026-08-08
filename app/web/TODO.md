# Web TODO List

| # | Severity | Title | Description |
|---:|:---:|---|---|
| **WEB-01** | Critical | Development authentication exposed | `devUserId`, session storage, `x-dev-user-id`, and `DevAccountSwitcher` are available without a production-only guard. A deployed client can select another user identity while the backend trusts the development header. |
| **WEB-02** | High | Insufficient API authorization | Candidate list and detail requests are not protected by complete role and project-level authorization. Frontend redirects and hidden controls do not prevent direct API access. |
| **WEB-03** | High | Confidential notes filtered in React | `human_resource_only` notes are sent to the browser and filtered by `InternalNotes.tsx`. Unauthorized information must be removed by the API before serialization. |
| **WEB-04** | Resolved | Stale data after account switching | Account switching now unmounts the application layout during the identity change, clears user-specific query data, removes stale session entries, and remounts routed pages under a `session.userId` key. |
| **WEB-05** | Medium | Unsafe current-session cache keys | Sessions are cached using the complete URL search string. Modal parameters create unnecessary session entries, and old session entries can briefly reappear after switching accounts. |
| **WEB-06** | Resolved | Mixed server-state management | Session, users, projects, candidates, project details, candidate details, and rejection follow-ups now use user-scoped TanStack Query hooks. Remaining effects synchronize debounce timers or browser events rather than owning server data. |
| **WEB-07** | Medium | Request race conditions | Project, pipeline, and candidate requests are not cancelled. Older requests can finish after newer requests and overwrite newer state. |
| **WEB-08** | Medium | Sensitive data over-fetching | Breadcrumbs request complete project and candidate records when they only need names. Full candidate responses can contain notes, contact details, activity history, and rejection data. |
| **WEB-09** | Medium | Missing runtime response validation | API results are trusted through TypeScript casts. TypeScript does not validate network data at runtime, so malformed responses can cause incorrect state or render failures. |
| **WEB-10** | Medium | Production API URL silently falls back | If `VITE_API_URL` is missing, the frontend uses `http://localhost:4000`. A production build should fail instead of sending requests to the user’s localhost. |
| **WEB-11** | Medium | External URLs are not validated | `candidate.linkedinProfileUrl` is placed directly into `href`. Only approved protocols—normally `https:`—should be accepted and validated by the server. |
| **WEB-12** | Medium | TypeScript strict mode disabled | `web/tsconfig.app.json` does not enable `"strict": true`. Strong nullability, implicit type, and function safety checks are therefore not fully enforced. |
| **WEB-13** | High | No automated tests | The web workspace has no unit, component, integration, or browser tests. Workflow-heavy code such as `candidateDetailHelpers.ts` has no regression protection. |
| **WEB-14** | Medium | Modals are not accessible dialogs | Route modals lack `role="dialog"`, `aria-modal`, title association, focus trapping, initial focus, Escape handling, and focus restoration. |
| **WEB-15** | Medium | Form fields lack associated labels | Several inputs use headings as visual labels without `<label>`, `id`, or `aria-labelledby`. Screen readers may not identify the purpose of those fields. |
| **WEB-16** | Medium | Custom filter menus lack keyboard behavior | Rejection filter menus expose `aria-expanded` but do not implement complete keyboard navigation, focus movement, Escape closing, or menu semantics. |
| **WEB-17** | Medium | Inconsistent and silent error handling | User and breadcrumb query failures are hidden, clipboard failures are ignored, and confirmation callbacks can reject without a visible error state. |
| **WEB-18** | Medium | No root error boundary or 404 route | Unexpected render failures can blank the application, and unknown routes can render an empty shell because no root error boundary or wildcard route exists. |
| **WEB-19** | Low | Breadcrumb routing is brittle | Breadcrumbs parse URLs with regular expressions and use a global `candidate-tracker:candidate-changed` event. This duplicates router and query-cache responsibilities. |
| **WEB-20** | Medium | Client-side workflow rules are not security controls | Role checks and transition availability are calculated in React. The API must independently enforce every permission, state transition, and project-access invariant. |
| **WEB-21** | Low | Nonfunctional resume download button | The visible “Download” button has no handler. It should either perform the advertised action or be removed. |
| **WEB-22** | Low | Redundant data requests | Candidate pages, breadcrumbs, and pipeline screens independently request overlapping data. Pipeline loading also requests both stage-specific and complete candidate collections. |
| **WEB-23** | Low | Client-side filtering may not scale | Rejection follow-ups and some project/candidate views load broad result sets and filter them in the browser. This increases transfer size and exposes more data than the current view needs. |
| **WEB-24** | Low | No type-aware or accessibility linting | ESLint uses standard TypeScript rules but not type-aware rules or `eslint-plugin-jsx-a11y`, so several semantic and accessibility problems are not detected automatically. |
