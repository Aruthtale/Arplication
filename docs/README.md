# ArToolbox Module - Project Documentation

## Overview

ArToolbox is a comprehensive offline-first utility module designed to provide users with a wide range of practical tools directly within the Arplication ecosystem. Built with a focus on privacy, speed, and user experience, ArToolbox offers essential utilities without requiring internet connectivity or external dependencies.

## Key Features

### Core Modules

1. **QR & Barcode Suite**
   - QR Code generator with customizable colors and sizes
   - Barcode scanning from camera or uploaded images
   - Download and share generated QR codes
   - Local history tracking

2. **Text & Development Tools**
   - Case converters (UPPERCASE, lowercase, Title Case, camelCase, snake_case, kebab-case)
   - Word and character counter with detailed statistics
   - Base64 encoder/decoder
   - SHA-256 hash generator
   - JSON beautifier and minifier

3. **Quick Calculator**
   - Discount and tax calculator
   - Aspect ratio calculator for images
   - Unit converter for common measurements

4. **Color Studio**
   - Color picker with HEX/RGB/HSL support
   - Palate extraction from uploaded images
   - Color combination suggestions

5. **Local History Manager**
   - Persistent storage of tool usage history
   - Quick access and management of previous sessions
   - Data storage locally using LocalStorage/IndexedDB

## Technical Specifications

### Architecture
- **Framework**: React 19 with TypeScript
- **State Management**: Local state with useState and useEffect hooks
- **Storage**: Custom service for local persistence (toolboxDb.js)
- **Styling**: Tailwind CSS with custom Neubrutalist design system
- **Native Features**: Capacitor integration for mobile capabilities

### Design System
- **Theme**: Neubrutalist with bold borders, sharp shadows, and vibrant colors
- **Components**: Bento grid layout with interactive cards and modals
- **Responsiveness**: Fully responsive design for mobile and desktop
- **Accessibility**: Semantic HTML with proper ARIA labels

### Data Handling
- **Offline-First**: All operations performed locally
- **Privacy**: No data transmitted to external servers
- **Persistence**: LocalStorage/IndexedDB for history tracking
- **Security**: Input sanitization and secure storage practices

## Installation & Setup

### Prerequisites
- Node.js 18+ (for development)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd arplication
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

### Build for Production
```bash
npm run build
```

## Usage

### Basic Usage

Once installed, access the ArToolbox module from the main navigation:

1. Navigate to the **Tools** section from the main menu
2. Click on any tool card to open
3. Use the interface as documented for each specific tool

### Module Navigation

The module features a clean, intuitive interface:

- **Bento Grid Layout**: Main dashboard with tool cards
- **Sub-views**: Detailed interfaces for each tool type
- **History Modal**: Access to previous sessions and actions
- **Responsive Design**: Optimized for both mobile and desktop

## Module Structure

```
src/components/modules/artoolbox/
├── ArToolboxModule.jsx           # Main module container
├── ToolboxBentoGrid.jsx          # Main dashboard grid
├── tools/                       # Individual tool components
│   ├── QrSuiteView.jsx          # QR Code generator and scanner
│   ├── TextDevView.jsx           # Text processing tools
│   ├── QuickCalcView.jsx         # Calculator tools
│   ├── ColorStudioView.jsx       # Color picker and palette tools
│   └── ToolboxHistoryModal.jsx    # History management interface
└── services/                    # Supporting services
    └── toolboxDb.js              # Local storage service
```

## API Reference

### toolboxDb Service

#### `getToolboxHistory()`
Returns all history items from local storage.

#### `addToolboxHistory({ toolType, title, dataPayload })`
Adds a new entry to the history.

#### `deleteToolboxHistoryItem(id)`
Removes a specific history item.

#### `clearToolboxHistory()`
Clears all history items.

## Development Guidelines

### Code Standards
- **ESLint**: Configure for React/TypeScript best practices
- **Prettier**: Code formatting with consistent styling
- **TypeScript**: Full type annotations for better developer experience

### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **End-to-End Tests**: User workflow testing

### Performance Optimization
- **Lazy Loading**: Load tools only when needed
- **Code Splitting**: Bundle optimization
- **Local Processing**: Minimize network requests

## Roadmap

### Phase 1 (Current)
- ✅ Basic tool implementations
- ✅ Local storage functionality
- ✅ Neubrutalist UI design
- ✅ Mobile optimization

### Phase 2 (Upcoming)
- [ ] Advanced QR Code features
- [ ] Export/import tool configurations
- [ ] Collaboration features
- [ ] Performance monitoring

### Phase 3 (Future)
- [ ] Machine learning integration
- [ ] Cloud sync capabilities
- [ ] Advanced analytics
- [ ] Third-party integrations

## Browser Compatibility

- **Chrome**: Fully supported
- **Firefox**: Fully supported
- **Safari**: Fully supported
- **Edge**: Fully supported
- **Mobile**: iOS and Android with Capacitor

## Accessibility

ArToolbox follows WCAG 2.1 AA guidelines:
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: Sufficient contrast ratios for text and UI elements
- **Focus Management**: Clear focus indicators and management

## Troubleshooting

### Common Issues

1. **Local Storage Not Available**
   - Error: "localStorage is not available"
   - Solution: Check browser settings or use a modern browser

2. **Camera Access Denied**
   - Error: "Permission denied for camera"
   - Solution: Grant camera permissions in browser settings

3. **QR Code Generation Fails**
   - Error: "Failed to create QR Code"
   - Solution: Check browser compatibility and ensure text is provided

### Support

For issues and support, please:
1. Check the browser console for detailed error messages
2. Verify browser compatibility
3. Clear browser cache and try again
4. Report issues through the official issue tracker

## License

This project is licensed under the MIT License. See the LICENSE file for more information.

## Acknowledgments

Special thanks to the open-source community for their valuable libraries and contributions:

- React ecosystem for UI development
- Tailwind CSS for styling
- Lucide React for icons
- QRCode.js for QR code generation
- Various other dependency packages

## Contact Information

For questions, issues, or feature requests:
- GitHub Issues: https://github.com/your-repo/issues
- Project Documentation: https://docs.your-project.com
- Support: support@your-project.com

---

*Last updated: 2026-09-19*
*Version: 0.3.0*