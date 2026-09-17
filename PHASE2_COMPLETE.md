# Phase 2: Theme System Overhaul - COMPLETED

## Changes Made

### 2.1 Eliminated CSS Duplication ✓

**Before:**
- `westpac.css`: 257 lines (80% duplicated base styles)
- `winz.css`: 263 lines (80% duplicated base styles)
- Adding a new theme required copying 250+ lines of CSS
- Changes to base layout required editing 3+ files

**After:**
- `base-theme.css`: ~180 lines (single source of truth for all theme layout)
- `westpac.css`: 25 lines (only CSS variable overrides)
- `winz.css`: 28 lines (only CSS variable overrides)
- `ird.css`: 24 lines (only CSS variable overrides)
- `acc.css`: 24 lines (only CSS variable overrides)
- All theme-specific values use CSS custom properties
- Base layout changes only need to happen in ONE file

**Files Created:**
- `themes/base-theme.css` - Base theme with CSS custom properties

**Files Simplified:**
- `themes/westpac.css` - From 257 lines → 25 lines
- `themes/winz.css` - From 263 lines → 28 lines
- `style.css` - Cleaned up, removed duplicated theme styles

### 2.2 Added More Themes ✓

**New Themes Added:**
- **IRD (Inland Revenue)** - Dark blue government theme
- **ACC** - Red accident compensation theme

Both were trivial to create — just a CSS file with variable overrides and a config entry.

**Files Created:**
- `themes/ird.css`
- `themes/acc.css`

**Files Updated:**
- `themes/config.js` - Added IRD and ACC theme configurations

### 2.3 Theme Preview in Admin ✓

**New Feature:**
- Preview button next to theme dropdown in admin panel
- Opens a modal with an iframe showing the selected theme
- Preview mode banner shows which theme is being previewed
- Form submission disabled in preview mode
- Close with X button, overlay click, or Escape key

**Files Updated:**
- `view-logs.html` - Added preview button and modal HTML
- `view-logs.js` - Added `setupThemePreview()` function
- `script.js` - Added `applyPreviewTheme()` function for preview mode
- `style.css` - Added preview modal and button styles

## CSS Architecture

```
themes/
├── base-theme.css     ← All layout/styles using CSS variables
├── westpac.css        ← Variable overrides only (25 lines)
├── winz.css           ← Variable overrides only (28 lines)
├── ird.css            ← Variable overrides only (24 lines)
├── acc.css            ← Variable overrides only (24 lines)
└── config.js          ← Theme content/config (titles, badges, etc.)
```

### Available CSS Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `--primary-color` | Main brand color | `#DA1710` |
| `--primary-hover` | Button hover state | `#B5140E` |
| `--primary-color-rgb` | RGB for opacity | `218, 23, 16` |
| `--bg-color` | Page background | `#f7f7f7` |
| `--card-bg` | Card background | `white` |
| `--text-color` | Main text | `#333` |
| `--text-muted` | Secondary text | `#666` |
| `--border-color` | Card borders | `#ddd` |
| `--badge-bg` | Badge background | `#f8f9fa` |
| `--badge-border` | Badge border | `transparent` |
| `--info-bg` | Info box background | `#f8f9fa` |
| `--info-border` | Info box border | `transparent` |
| `--header-bg` | Header background | `white` |
| `--header-bg-image` | Header image | `url(...)` |
| `--header-overlay` | Header overlay | `rgba(...)` |
| `--logo-height` | Logo height | `40px` |
| `--logo-padding` | Logo container padding | `0 10px` |
| `--logo-min-height` | Logo container min-height | `auto` |
| `--button-width` | CTA button width | `200px` |
| `--info-list-style` | Info list style | `inside` / `none` |
| `--info-list-item-margin` | List item margin | `0` |
| `--info-list-item-padding` | List item padding | `0` |
| `--info-list-item-before` | List item bullet | `none` / `"✓"` |

## Adding a New Theme

Now takes just 2 steps:

### Step 1: Create CSS file (e.g., `themes/police.css`)
```css
:root {
    --primary-color: #003087;
    --primary-hover: #002060;
    --primary-color-rgb: 0, 48, 135;
    --bg-color: #f0f4f8;
    /* ... other overrides as needed ... */
}
```

### Step 2: Add to `themes/config.js`
```javascript
police: {
    name: "NZ Police",
    logo: "./assets/police-logo.svg",
    primaryColor: "#003087",
    secondaryColor: "#002060",
    styles: "themes/police.css",
    content: { /* titles, badges, form fields, etc. */ }
}
```

### Step 3: Add to admin dropdown in `view-logs.html`
```html
<option value="police">NZ Police</option>
```

That's it! No more copying 250 lines of CSS.

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Theme CSS files | 2 × ~260 lines | 4 × ~25 lines + 1 × 180 lines base |
| Total theme CSS | ~520 lines | ~280 lines |
| Adding a new theme | Copy 250+ lines | Create 25-line file |
| Base layout changes | Edit 3+ files | Edit 1 file |
| Theme preview | Not available | Built-in modal preview |
| Available themes | 2 | 4 |

## Next Steps

Phase 2 is complete. The theme system is now:
- **Maintainable** - Single source of truth for layout
- **Extensible** - New themes in minutes, not hours
- **Previewable** - See themes before applying them
- **Consistent** - All themes use the same base structure

**Ready for Phase 3: Admin Panel UI/UX Overhaul** (when you're ready to proceed)