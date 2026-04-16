Learnings from verifying sub-pages:
- Found module resolution issue in app/api/notifications/[id]/route.js and app/api/notifications/[id]/read/route.js which used incorrect relative path for mock/server. Fixed by correcting the relative path.
- Next.js build runs successfully with no errors.

- Restricted scope to admin pages only by reverting unrelated UI changes (like Dashboard components, BottomNav, and BalanceCard) and unrelated API mock data changes. Verified that the Next.js build passes cleanly after the cleanup.

### Admin Redesign Refinements
- Modified `app/components/AdminSidebar.js` to change the background from a dark green gradient (`bg-[linear-gradient(...)]`) to a softer ivory/white surface (`bg-[#F9FBF9]`) that aligns with the mobile app identity, bringing the UI into a more cohesive "product" feel.
- Modified `app/components/admin/AdminUi.js` to soften borders, box-shadows, and background tints. Updated `AdminSurface` and `AdminButton` to use subtler emerald tones.
- Re-architected the main `System Pulse` dashboard header in `app/admin/page.js` away from a heavy `bg-emerald-700` box to an airy white surface with soft blurred emerald background accents.
- Preserved existing `app/api/*` and mock configurations to remain completely decoupled from the scope creep previously identified.
