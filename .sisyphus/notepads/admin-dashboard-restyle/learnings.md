Learnings from verifying sub-pages:
- Found module resolution issue in app/api/notifications/[id]/route.js and app/api/notifications/[id]/read/route.js which used incorrect relative path for mock/server. Fixed by correcting the relative path.
- Next.js build runs successfully with no errors.
