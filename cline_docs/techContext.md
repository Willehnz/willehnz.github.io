# Technical Context

## Technologies Used
- Frontend: HTML, CSS, JavaScript
- Backend: Firebase
- Map Integration (specific service to be determined)
- Version Control: Git

## Development Setup
- Project root: willehnz.github.io
- Firebase configuration required
- Map service API keys needed
- Multiple theme configurations

## File Structure
- HTML Entry Points:
  - index.html (main application)
  - view-logs.html (logging interface)
- JavaScript Organization:
  - Core scripts in src/core/
  - Feature modules in src/features/
  - Utility functions in src/utils/
- Styling:
  - Core styles in src/styles/
  - Theme-specific styles in themes/
  - Organization branding assets in assets/

## Technical Constraints
- Browser Compatibility:
  - Browser detection handling implemented
  - Cross-browser styling considerations
- Firebase Dependencies:
  - Requires proper initialization
  - Database rules configuration
- Theme Requirements:
  - Support for multiple organization themes
  - Dynamic theme switching
- Location Services:
  - Requires location tracking permissions
  - Map integration dependencies

## Development Tools
- Git for version control
- Firebase development tools
- Map service development tools (TBD)

## Deployment
- Hosted on GitHub Pages (indicated by repository name)
- Firebase hosting configuration
- Version management through update-version.js
