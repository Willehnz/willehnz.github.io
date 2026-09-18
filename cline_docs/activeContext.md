## Current Task
Fix overhauled `view-logs.html` admin panel: data table and map failed to load after UI rewrite (perpetual spinners, `Admin init error` SyntaxError).

## Recent Changes
1. Admin Panel Overhaul Fixes (2026-09-18):
   - `8f02b0b` Complete admin panel overhaul: clean UI, fixed delete/request buttons, working map
   - `62bb661` Fixed broken `updateSortIndicators()` function
   - `66c8079` Fixed search bar double text (removed extra `Search` span), added debug logging + `window.database` check + explicit error rendering in `refreshData()`
   - `dc725af` Fixed truncated `formatDevice()`: restored body + closing brace (was 136 open / 135 close braces; caused `missing } after function body`)
   - `265d62e` Fixed unescaped quotes in `formatDevice` return (caused `Unexpected identifier 'browser'`)

2. Theme System Enhancements (earlier):
   - Fixed theme synchronization timeout issue
   - Added theme state verification
   - Optimized theme change detection
   - Added smooth theme transitions
   - Fixed Quirks Mode rendering
   - Improved error handling and recovery

3. Form Handling Improvements:
   - Added theme change event listener
   - Implemented form reinitialization on theme changes
   - Improved form state management during theme updates

## Current State
1. Admin Panel (`view-logs.html` / `view-logs-new.js` / `src/features/admin/admin-new.js`):
   - Root cause of spinner hang: `formatDevice(loc)` at ~line 309 was truncated (missing body + `}`), swallowing `renderPagination()` and failing whole-module parse; then a follow-up bad quote fix emitted `return "<span class="browser">"` (inner quotes terminated the string).
   - Correct line: `return '<span class="browser">' + browser + ver + '</span>' + plat;` (single quotes outside, plain doubles inside).
   - Local file valid: `node --check` passes. Pushed `265d62e` to `origin/main`.
   - PENDING VERIFICATION: live GitHub Pages file was still 19921 bytes (broken version) at last check — likely Pages deploy delay + browser JS caching. Retest pending: hard refresh (Ctrl+Shift+R) with DevTools "Disable cache" or private window; expect `[Admin] Starting admin panel initialization...` then `Admin panel initialized successfully`; table/map load; search/Delete/Request work.
   - Note: local `read_files` view may show stale/escaped content (`\"`) vs raw bytes — trust `python repr()` / char-code checks.

2. Theme System:
   - Real-time theme synchronization between pages
   - Reliable state verification
   - Optimized change detection
   - Visual transition effects
   - Standards-compliant rendering
   - Comprehensive error handling
   - Loading state management
   - Toast notification system

3. Form System:
   - Theme-aware form generation
   - Dynamic form updates on theme changes
   - State preservation during updates
   - Improved validation

## Notes
- Browser console `moz-extension://.../contentscript.js` errors and `MaxListenersExceededWarning` are browser-extension (MetaMask-like) noise — ignore; filter console with `-moz-extension`.
- `favicon.ico 404` is harmless (missing icon), unrelated to table/map.
- `logger.js:39` in error lines is just where the error is logged, not where it is thrown — expand stack trace for real source.
- Pre-push hook auto-bumps `src/core/version.js`; unstage/revert it when committing a logic-only fix to keep commits clean.
- PowerShell env: no `sed`/`head`; prefer `Select-Object -Skip/-First`, `node --check`, `python -c`.
