# Web TODO List

| # | Severity | Title | Description |
|---:|:---:|---|---|
| **WEB-01** | Resolved | Development authentication exposed | Development account selection now uses the normal `/auth/login` endpoint and an HTTP-only server session cookie. Development mode and its fixed local password are explicit, and the API fails startup for unsupported authentication modes. |
| **WEB-02** | High | Insufficient API authorization | Candidate list and detail requests are not protected by complete role and project-level authorization. Frontend redirects and hidden controls do not prevent direct API access. |
| **WEB-03** | Resolved | Confidential notes filtered by API | The API removes private notes and fields from Hiring Manager responses. Unit and database HTTP tests cover list and detail endpoints. |
| **WEB-04** | Resolved | Stale data after account switching | Account switching now unmounts the application layout during the identity change, clears user-specific query data, removes stale session entries, and remounts routed pages under a `session.userId` key. |
| **WEB-05** | Resolved | Unsafe current-session cache keys | The current session now uses the stable `['auth', 'session']` query key. Authentication no longer depends on URL parameters or session storage. |
| **WEB-06** | Resolved | Mixed server-state management | Session, users, projects, candidates, project details, candidate details, and rejection follow-ups now use user-scoped TanStack Query hooks. Remaining effects synchronize debounce timers or browser events rather than owning server data. |
| **WEB-07** | Resolved | Request cancellation | Data queries pass TanStack Query abort signals into fetch. Account switching cancels pending queries before changing identity. |
| **WEB-08** | Medium | Sensitive data over-fetching | Breadcrumbs request complete project and candidate records when they only need names. Full candidate responses can contain notes, contact details, activity history, and rejection data. |
| **WEB-09** | Medium | Missing runtime response validation | API results are trusted through TypeScript casts. TypeScript does not validate network data at runtime, so malformed responses can cause incorrect state or render failures. |
| **WEB-10** | Resolved | Production API URL silently falls back | `VITE_API_URL` is required and the frontend fails explicitly when it is absent. |
| **WEB-11** | Medium | External URLs are not validated | `candidate.linkedinProfileUrl` is placed directly into `href`. Only approved protocols—normally `https:`—should be accepted and validated by the server. |
| **WEB-12** | Resolved | TypeScript strict mode | Strict compilation is enabled and passes. |
| **WEB-13** | Partial | Automated tests | Workflow helper and cache-invalidation tests now exist alongside API and database tests. Browser journeys were tested manually; automated component and browser suites remain absent. |
| **WEB-14** | Medium | Modals are not accessible dialogs | Route modals lack `role="dialog"`, `aria-modal`, title association, focus trapping, initial focus, Escape handling, and focus restoration. |
| **WEB-15** | Medium | Form fields lack associated labels | Several inputs use headings as visual labels without `<label>`, `id`, or `aria-labelledby`. Screen readers may not identify the purpose of those fields. |
| **WEB-16** | Medium | Custom filter menus lack keyboard behavior | Rejection filter menus expose `aria-expanded` but do not implement complete keyboard navigation, focus movement, Escape closing, or menu semantics. |
| **WEB-17** | Medium | Inconsistent and silent error handling | User and breadcrumb query failures are hidden, clipboard failures are ignored, and confirmation callbacks can reject without a visible error state. |
| **WEB-18** | Resolved | Root errors and unknown routes | A root error boundary displays render failures with a return link. The existing wildcard route displays unknown routes. |
| **WEB-19** | Partial | Breadcrumb routing | Global candidate-change events were removed; workflow mutations invalidate shared queries. Breadcrumbs still parse route paths with regular expressions. |
| **WEB-20** | Partial | Server-side workflow rules | API role/stage/status guards now protect transitions. Project access and project-wide offer invariants remain pending; see `../PRODUCTION-READINESS.md`. |
| **WEB-21** | Low | Nonfunctional resume download button | The visible “Download” button has no handler. It should either perform the advertised action or be removed. |
| **WEB-22** | Low | Redundant data requests | Candidate pages, breadcrumbs, and pipeline screens independently request overlapping data. Pipeline loading also requests both stage-specific and complete candidate collections. |
| **WEB-23** | Low | Client-side filtering may not scale | Rejection follow-ups and some project/candidate views load broad result sets and filter them in the browser. This increases transfer size and exposes more data than the current view needs. |
| **WEB-24** | Low | No type-aware or accessibility linting | ESLint uses standard TypeScript rules but not type-aware rules or `eslint-plugin-jsx-a11y`, so several semantic and accessibility problems are not detected automatically. |
