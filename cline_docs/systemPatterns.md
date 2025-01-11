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
   - Critical CSS inlined in HTML
   - Core styles in src/styles/core.css
   - Feature-specific styles in respective CSS files
   - Theme-specific styles in themes directory
   - Utility classes in utilities.css

3. Performance Optimization
   - Parallel module loading
   - Resource preloading
   - Critical path optimization
   - Connection timeouts
   - Graceful degradation

4. Firebase Integration
   - Optimized initialization with timeouts
   - Disabled persistence for speed
   - Reduced listener count
   - Write permission verification
   - Connection state management

5. Resource Management
   - Critical resources preloaded
   - Async script loading
   - Deferred non-critical resources
   - Optimized loading order
   - Enhanced caching strategy

6. Version Management
   - Version tracking in src/core/version.js
   - Update script in scripts/update-version.js
   - Version display optimization

## Design Patterns
1. Module Pattern
   - Mixed module architecture
   - Feature-based organization
   - Clear module boundaries
   - Simple dependencies
   - Basic error isolation
   - Global state for critical systems

2. Manager Pattern
   - ThemeManager for theme handling
   - ContentManager for content
   - Optimized initialization
   - Resource management
   - Error recovery

3. Handler Pattern
   - FormHandler for forms
   - MapHandler for maps
   - Efficient event handling
   - Resource cleanup
   - Error boundaries

4. Utility Pattern
   - Browser detection
   - Common functions
   - Performance utilities
   - Error handling
   - Resource management

## File Organization
1. Core Structure
   - Assets in /assets
   - Scripts in /scripts
   - Source in /src
   - Themes in /themes

2. Source Organization
   - Core initialization
   - Feature modules
   - Utility functions
   - Style management
   - Resource handling

3. Style Management
   - Critical styles inline
   - Core styles separate
   - Feature styles modular
   - Theme styles isolated
   - Utility classes organized

4. Resource Structure
   - Critical resources prioritized
   - Non-critical deferred
   - Async loading enabled
   - Caching optimized
   - Error handling improved

## Performance Patterns
1. Loading Strategy
   - Critical path optimization
   - Resource prioritization
   - Parallel loading
   - Async execution
   - Error recovery

2. Caching Strategy
   - Resource preloading
   - Browser caching
   - Memory management
   - Connection optimization
   - State persistence

3. Error Handling
   - Graceful degradation
   - Timeout management
   - Connection recovery
   - User feedback
   - State preservation

4. Resource Management
   - Memory optimization
   - Connection pooling
   - Listener management
   - Cache control
   - Load balancing

5. Theme Management
   - Global theme configuration
   - Firebase-based theme state
   - UI-driven theme updates with visual feedback
   - Real-time theme sync between pages
   - Enhanced error handling with toast notifications
   - Loading states and user feedback
   - Loading sequence:
     * Firebase SDK loads first
     * Theme config loads as script
     * Feature modules load last
   - Theme change workflow:
     * Update Firebase state
     * Firebase listener triggers theme update
     * Apply theme changes
     * Dispatch themeChanged event
     * View-logs receives event confirmation
     * Show success/error toast
     * Update form fields if needed
   - Event handling improvements:
     * Consistent event dispatch from Firebase listener
     * Event dispatch on all theme changes
     * Comprehensive error propagation
     * Reliable event confirmation

6. Event Handling
   - Theme change events
   - Firebase state events
   - Error propagation
   - User interaction events
   - System state events
