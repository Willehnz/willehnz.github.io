# System Patterns

## Architecture
- Modular structure with clear separation of concerns:
  - `/src/core/` - Core initialization and version management
  - `/src/features/` - Feature-specific modules
  - `/src/utils/` - Utility functions and helpers
  - `/src/styles/` - CSS styling and layout
  - `/themes/` - Organization-specific theming

## Key Technical Decisions
1. Feature Modularity
   - Admin functionality isolated in features/admin
   - Form handling in features/form
   - Location tracking in features/location
   - Theme management in features/theme

2. Style Organization
   - Core styles in src/styles/core.css
   - Feature-specific styles in respective CSS files
   - Theme-specific styles in themes directory
   - Utility classes in utilities.css

3. Firebase Integration
   - Firebase initialization handled in core
   - Database rules defined in database.rules.json

4. Version Management
   - Version tracking in src/core/version.js
   - Update script in scripts/update-version.js

## Design Patterns
- Manager Pattern for various features (ThemeManager, ContentManager)
- Handler Pattern for specific functionalities (FormHandler, MapHandler)
- Utility Pattern for browser detection and common functions

## File Organization
- Assets stored in /assets
- Scripts for maintenance in /scripts
- Source code modularized in /src
- Themes separated in /themes

## Code Structure
- Feature-based organization
- Clear separation between core functionality and features
- Utility functions isolated for reusability
- Theme configuration separate from core styles
