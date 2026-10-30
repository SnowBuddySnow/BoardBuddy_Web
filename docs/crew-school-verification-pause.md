# Temporary crew school-verification pause

While school-email verification is being prepared, crew search and the join dialog stop advertising mandatory verification unless the API explicitly reports global enforcement enabled. Applicants can submit a correct PIN for manager review without school-email verification.

Crew settings show the requirement as paused for all schools and disable its checkbox. Saving other settings omits `schoolVerificationRequired`, preserving the server's saved preference for a future rollout. Optional verified-school automatic joining continues to explain its manager-review fallback.

Deploy to staging through Vercel from the checked `develop` revision. Keep Preview Branch Tracking disabled and leave production/main for a separate release. The backend pause must be deployed too; UI copy alone does not change admission rules.

Validation: component regressions cover paused and legacy API responses, the join dialog, and a settings save that preserves the stored preference. The full suite, TypeScript/build, bundle budget and zero-warning ESLint are checked before release.
