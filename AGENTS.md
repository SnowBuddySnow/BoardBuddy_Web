# BoardBuddy Web Agent Instructions

BoardBuddy Web is deployed only through Vercel: `develop` is staging and `main` is production. Do
not add a web Docker container or server-side web deployment to the backend hosts.

The backend database is an implementation detail managed declaratively by Atlas Open Source. It is
intentionally view-free. Web code must depend on documented HTTP API contracts, never database
tables, database views, or assumptions that would require adding a backend database view.

The authoritative backend decision is
`BoardBuddy_Backend/docs/architecture-decisions/0001-atlas-without-database-views.md` in the sibling
repository.
