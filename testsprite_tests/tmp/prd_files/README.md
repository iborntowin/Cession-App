# 🚀 Cession Management System

> **A comprehensive, enterprise-grade financial management platform for wage garnishment (cession sur salaire) operations in Tunisia**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/nassimmaaoui/cession-app)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/nassimmaaoui/cession-app/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/nassimmaaoui/cession-app)
[![Java](https://img.shields.io/badge/Java-17+-orange.svg)](https://adoptium.net/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## 🌟 Live Demo & Screenshots

🔗 **[Live Demo](https://cession-app-demo.vercel.app)** | 📱 **[Mobile Demo](https://expo.dev/@nassimmaaoui/cession-mobile)**

<div align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="45%" />
  <img src="docs/screenshots/client-management.png" alt="Client Management" width="45%" />
</div>

## ✨ Key Features

### 🏢 **Core Business Operations**
- **Client Management**: Complete client lifecycle with document management and verification
- **Cession Tracking**: Real-time wage garnishment monitoring with automated calculations
- **Payment Processing**: Integrated payment tracking with multiple status workflows
- **Document Management**: Secure PDF upload/download with Supabase Storage integration
- **Financial Analytics**: Advanced reporting with predictive insights and trend analysis

### 💼 **Business Intelligence**
- **Smart Dashboard**: Real-time KPIs with interactive charts and performance metrics
- **Predictive Analytics**: AI-powered insights for risk assessment and portfolio optimization
- **Advanced Reporting**: Customizable reports with export capabilities (PDF, Excel, CSV)
- **Portfolio Management**: Client performance tracking with risk scoring algorithms

### 🛍️ **Inventory & Sales Management**
- **Product Catalog**: Complete inventory management with category organization
- **Stock Tracking**: Real-time stock levels with automated reorder alerts
- **Sales Analytics**: Profit margin analysis with performance tracking
- **Multi-channel Sales**: Integrated selling platform with transaction history

### 💰 **Financial Management**
- **Expense Tracking**: Categorized expense management with budget controls
- **Income Management**: Revenue tracking with source categorization
- **Financial Reports**: Comprehensive P&L statements and cash flow analysis
- **Tax Compliance**: Automated calculations for Tunisian tax requirements

### 🌐 **Multi-Platform Excellence**
- **Desktop Application**: Native Tauri app for Windows, macOS, and Linux
- **Web Application**: Progressive Web App with offline capabilities
- **Mobile Application**: React Native app with full feature parity
- **Cross-Platform Sync**: Real-time data synchronization across all platforms

## 🏗️ Architecture & Tech Stack

### **System Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Desktop App   │    │   Web Client    │    │   Mobile App    │
│   (Tauri/Rust)  │    │  (SvelteKit)    │    │ (React Native)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴───────────┐
                    │     REST API Gateway    │
                    │   (Spring Boot 3.x)    │
                    └─────────────┬───────────┘
                                  │
                    ┌─────────────┴───────────┐
                    │    Database Layer       │
                    │  PostgreSQL/H2/Supabase │
                    └─────────────────────────┘
```

### **Technology Stack Deep Dive**

#### 🖥️ **Frontend Technologies**
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Desktop UI** | Tauri + Rust | Native desktop performance with web technologies |
| **Web Framework** | SvelteKit | Reactive UI with server-side rendering |
| **Mobile Framework** | React Native + Expo | Cross-platform mobile development |
| **Styling** | Tailwind CSS | Utility-first CSS framework with custom design system |
| **State Management** | Svelte Stores | Reactive state management with persistence |
| **Charts & Analytics** | Chart.js | Interactive data visualization |
| **Internationalization** | sveltekit-i18n | Multi-language support (EN, FR, AR) with RTL |

#### ⚙️ **Backend Technologies**
| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Framework** | Spring Boot 3.2.5 | Enterprise-grade REST API development |
| **Security** | Spring Security + JWT | Authentication, authorization, and CORS |
| **Database ORM** | Spring Data JPA + Hibernate | Object-relational mapping with query optimization |
| **Database** | PostgreSQL/H2 | Production PostgreSQL, H2 for development |
| **File Storage** | Supabase Storage | Secure document management with CDN |
| **PDF Generation** | iText | Dynamic PDF generation for reports and documents |
| **Validation** | Bean Validation | Input validation with custom constraints |

#### 📱 **Mobile Technologies**
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | React Native 0.79.5 | Native mobile performance |
| **Development** | Expo SDK 53 | Rapid development and deployment |
| **Navigation** | React Navigation 7 | Type-safe navigation with deep linking |
| **State Management** | React Context + Hooks | Centralized state management |
| **Offline Support** | AsyncStorage + NetInfo | Offline-first architecture |
| **Networking** | Axios | HTTP client with interceptors and retry logic |

#### 🚀 **DevOps & Infrastructure**
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Containerization** | Docker + Docker Compose | Development environment standardization |
| **Build Tools** | Maven + npm + Cargo | Multi-language build automation |
| **Testing** | JUnit 5 + Vitest + Jest | Comprehensive testing strategy |
| **CI/CD** | GitHub Actions | Automated testing and deployment |
| **Deployment** | Vercel + Render + Railway | Multi-platform deployment strategy |
| **Monitoring** | Built-in Health Checks | Application monitoring and diagnostics |

#### 🔧 **Development Tools**
| Tool | Purpose |
|------|---------|
| **TypeScript** | Type safety for frontend development |
| **ESLint + Prettier** | Code quality and formatting |
| **Svelte Check** | Svelte-specific type checking |
| **Maven Surefire** | Java testing and reporting |
| **PowerShell Scripts** | Automated build and deployment |

## 🎨 UI/UX Highlights

### **Design System Excellence**
- **Glassmorphism Design**: Modern glass-effect UI with backdrop blur and transparency
- **Gradient Aesthetics**: Carefully crafted color gradients for visual hierarchy
- **Micro-interactions**: Smooth animations and transitions using Svelte transitions
- **Responsive Grid**: CSS Grid and Flexbox for perfect layouts across devices

### **Accessibility Features**
- **WCAG 2.1 Compliance**: Full accessibility support with ARIA labels
- **Keyboard Navigation**: Complete keyboard accessibility for all interactions
- **Screen Reader Support**: Semantic HTML with proper heading structure
- **High Contrast Mode**: Support for users with visual impairments
- **RTL Language Support**: Full right-to-left layout for Arabic language

### **User Experience Enhancements**
- **Progressive Loading**: Skeleton screens and optimistic UI updates
- **Error Recovery**: Graceful error handling with user-friendly messages
- **Offline Support**: Service worker implementation for offline functionality
- **Smart Search**: Instant search with fuzzy matching and filters
- **Contextual Help**: In-app guidance and tooltips for complex features

### **Visual Design Features**
- **Dark/Light Themes**: Automatic theme switching based on system preferences
- **Custom Iconography**: Heroicons integration with custom business icons
- **Data Visualization**: Interactive charts with drill-down capabilities
- **Print Optimization**: CSS print styles for professional document printing

## ⚡ Performance & Scalability

### **Frontend Optimizations**
- **Code Splitting**: Dynamic imports for reduced initial bundle size
- **Tree Shaking**: Elimination of unused code in production builds
- **Image Optimization**: WebP format with lazy loading and responsive images
- **Service Worker**: Intelligent caching strategy for improved performance
- **Bundle Analysis**: Webpack bundle analyzer for optimization insights

### **Backend Performance**
- **Connection Pooling**: HikariCP for efficient database connections
- **Query Optimization**: JPA query optimization with proper indexing
- **Caching Strategy**: Application-level caching for frequently accessed data
- **Async Processing**: Non-blocking operations for improved throughput
- **Memory Management**: JVM tuning for optimal garbage collection

### **Database Optimizations**
- **Strategic Indexing**: Optimized database indexes for query performance
- **Connection Management**: Efficient connection pooling and timeout handling
- **Query Performance**: Hibernate query optimization and N+1 problem prevention
- **Data Archiving**: Automated data archiving for historical records

### **Scalability Measures**
- **Horizontal Scaling**: Stateless architecture for easy horizontal scaling
- **Load Balancing**: Ready for load balancer integration
- **Database Sharding**: Architecture supports database partitioning
- **CDN Integration**: Supabase CDN for global asset delivery

## 🔒 Security Features

### **Authentication & Authorization**
- **JWT Security**: Secure token-based authentication with refresh tokens
- **Role-Based Access**: Granular permissions system with user roles
- **Session Management**: Secure session handling with automatic expiration
- **Password Security**: BCrypt hashing with salt for password storage

### **Data Protection**
- **Input Validation**: Comprehensive server-side validation with sanitization
- **SQL Injection Prevention**: Parameterized queries and ORM protection
- **XSS Protection**: Content Security Policy and input sanitization
- **CSRF Protection**: Cross-site request forgery prevention

### **Infrastructure Security**
- **HTTPS Enforcement**: TLS encryption for all data transmission
- **CORS Configuration**: Strict cross-origin resource sharing policies
- **File Upload Security**: Virus scanning and file type validation
- **Environment Variables**: Secure configuration management

### **Compliance & Privacy**
- **GDPR Compliance**: Data protection and user privacy controls
- **Audit Logging**: Comprehensive audit trail for all user actions
- **Data Encryption**: Encryption at rest and in transit
- **Backup Security**: Encrypted backups with secure storage

## 📱 Cross-Platform Support

### **Desktop Application (Tauri)**
- **Windows**: Windows 10+ with MSI and NSIS installers
- **macOS**: macOS 10.13+ with DMG and App Store distribution
- **Linux**: Ubuntu 18.04+, CentOS 7+, Fedora 30+ with AppImage, DEB, and RPM packages
- **Auto-Updates**: Built-in update mechanism with delta updates
- **Native Integration**: System tray, notifications, and file associations

### **Web Application**
- **Progressive Web App**: Installable web app with offline capabilities
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Responsive Design**: Optimized for tablets and desktop browsers
- **PWA Features**: Push notifications, background sync, and app-like experience

### **Mobile Application**
- **iOS**: iOS 13+ with App Store distribution
- **Android**: Android 8+ (API 26+) with Google Play Store distribution
- **Expo Go**: Development builds for testing and preview
- **Over-the-Air Updates**: Instant updates without app store approval

### **Platform-Specific Features**
- **Windows**: Windows Hello integration, Jump Lists, and Live Tiles
- **macOS**: Touch Bar support, macOS menu integration, and Spotlight search
- **iOS**: Face ID/Touch ID, Siri Shortcuts, and iOS 14 widgets
- **Android**: Biometric authentication, Android Auto, and adaptive icons

## 🛠️ Installation & Setup

### **Prerequisites**
```bash
# Required Software
- Java 17+ (OpenJDK recommended)
- Node.js 18+ with npm
- Rust 1.70+ (for Tauri builds)
- Maven 3.8+
- Git 2.30+

# Optional for Development
- Docker & Docker Compose
- PostgreSQL 13+ (for production database)
- VS Code with recommended extensions
```

### **Quick Start (Development)**
```bash
# 1. Clone the repository
git clone https://github.com/nassimmaaoui/cession-app.git
cd cession-app

# 2. Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start with Docker (Recommended)
docker-compose up -d

# 4. Or start manually
# Backend
cd backend
mvn spring-boot:run

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Mobile (new terminal)
cd mobile-client
npm install
npm start
```

### **Production Deployment**
```bash
# Automated production build
./build-production.ps1 -Clean -Target "all"

# Manual deployment
./deploy-production.ps1 -Clean -OutputDir "dist"

# Docker production
docker-compose -f docker-compose.prod.yml up -d
```

### **Environment Configuration**
```bash
# Backend Configuration (.env)
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/cessionapp
SPRING_DATASOURCE_USERNAME=your_username
SPRING_DATASOURCE_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Frontend Configuration
PUBLIC_BACKEND_URL=http://localhost:8082/api/v1
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 📚 API Documentation

### **Core API Endpoints**

#### **Authentication**
```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

#### **Client Management**
```http
GET    /api/v1/clients              # List all clients
POST   /api/v1/clients              # Create new client
GET    /api/v1/clients/{id}         # Get client details
PUT    /api/v1/clients/{id}         # Update client
DELETE /api/v1/clients/{id}         # Delete client
```

#### **Cession Management**
```http
GET    /api/v1/cessions             # List all cessions
POST   /api/v1/cessions             # Create new cession
GET    /api/v1/cessions/{id}        # Get cession details
PUT    /api/v1/cessions/{id}        # Update cession
DELETE /api/v1/cessions/{id}        # Delete cession
```

#### **Payment Processing**
```http
GET    /api/v1/payments             # List all payments
POST   /api/v1/payments             # Record new payment
GET    /api/v1/payments/{id}        # Get payment details
PUT    /api/v1/payments/{id}        # Update payment
```

#### **Document Management**
```http
POST   /api/v1/documents/upload     # Upload document
GET    /api/v1/documents/{id}       # Download document
DELETE /api/v1/documents/{id}       # Delete document
```

#### **Financial Analytics**
```http
GET    /api/v1/financial/summary    # Financial summary
GET    /api/v1/financial/reports    # Generate reports
GET    /api/v1/financial/analytics  # Advanced analytics
```

#### **Inventory Management**
```http
GET    /api/v1/products             # List products
POST   /api/v1/products             # Create product
PUT    /api/v1/products/{id}        # Update product
DELETE /api/v1/products/{id}        # Delete product
POST   /api/v1/stock-movements      # Record stock movement
```

### **API Response Format**
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2025-01-15T10:30:00Z",
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### **Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🧪 Testing

### **Testing Strategy**
- **Unit Tests**: 85%+ code coverage with JUnit 5 and Vitest
- **Integration Tests**: API endpoint testing with Spring Boot Test
- **E2E Tests**: User workflow testing with Playwright
- **Performance Tests**: Load testing with JMeter
- **Security Tests**: OWASP ZAP security scanning

### **Backend Testing**
```bash
# Run all tests
mvn test

# Run with coverage
mvn test jacoco:report

# Run specific test class
mvn test -Dtest=ClientControllerTest

# Integration tests
mvn test -Dtest=*IntegrationTest
```

### **Frontend Testing**
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

### **Mobile Testing**
```bash
# Run Jest tests
npm test

# Run on device
npm run test:device

# Performance testing
npm run test:performance
```

### **Test Coverage Reports**
- **Backend**: JaCoCo reports in `backend/target/site/jacoco/`
- **Frontend**: Vitest coverage in `frontend/coverage/`
- **Mobile**: Jest coverage in `mobile-client/coverage/`

## 🚀 Deployment

### **Development Deployment**
```bash
# Local development
npm run dev              # Frontend development server
mvn spring-boot:run      # Backend development server
npm start               # Mobile development server

# Docker development
docker-compose up -d
```

### **Production Deployment**

#### **Cloud Deployment (Recommended)**
```bash
# Frontend (Vercel)
vercel --prod

# Backend (Railway)
railway deploy

# Database (Supabase)
# Managed PostgreSQL with automatic backups
```

#### **Self-Hosted Deployment**
```bash
# Build production artifacts
./build-production.ps1 -Clean -Target "all"

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Manual deployment
java -jar backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar
```

#### **Desktop Application Distribution**
```bash
# Build desktop installers
npm run tauri:build:production

# Artifacts generated:
# - Windows: MSI and NSIS installers
# - macOS: DMG and App bundle
# - Linux: AppImage, DEB, and RPM packages
```

### **CI/CD Pipeline**
```yaml
# GitHub Actions workflow
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Run backend tests
        run: mvn test
      - name: Run frontend tests
        run: cd frontend && npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: ./deploy-production.ps1
```

### **Environment-Specific Configurations**
- **Development**: H2 database, debug logging, hot reload
- **Staging**: PostgreSQL, info logging, performance monitoring
- **Production**: PostgreSQL, error logging, security hardening

## 🤝 Contributing

### **Development Workflow**
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Code Standards**
- **Java**: Google Java Style Guide with Checkstyle
- **TypeScript/JavaScript**: ESLint + Prettier configuration
- **Svelte**: Svelte-specific linting rules
- **Commit Messages**: Conventional Commits specification

### **Pull Request Guidelines**
- Include comprehensive tests for new features
- Update documentation for API changes
- Ensure all CI checks pass
- Add screenshots for UI changes
- Follow the existing code style

### **Development Setup**
```bash
# Install development dependencies
npm install -g @tauri-apps/cli
cargo install tauri-cli

# Setup pre-commit hooks
npm run prepare

# Run development servers
npm run dev:all
```

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### **License Summary**
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ❌ Liability
- ❌ Warranty

## 📧 Contact & Support

### **Project Maintainer**
- **Name**: Nassim Maaoui
- **Email**: nassim.maaoui@example.com
- **LinkedIn**: [linkedin.com/in/nassimmaaoui](https://linkedin.com/in/nassimmaaoui)
- **GitHub**: [@nassimmaaoui](https://github.com/nassimmaaoui)

### **Support Channels**
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/nassimmaaoui/cession-app/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/nassimmaaoui/cession-app/discussions)
- 📚 **Documentation**: [Project Wiki](https://github.com/nassimmaaoui/cession-app/wiki)
- 💬 **Community**: [Discord Server](https://discord.gg/cession-app)

### **Business Inquiries**
- **Enterprise Support**: enterprise@cession-app.com
- **Consulting Services**: consulting@cession-app.com
- **Partnership Opportunities**: partnerships@cession-app.com

---

<div align="center">
  <p><strong>Built with ❤️ for the Tunisian financial services industry</strong></p>
  <p>
    <a href="#-live-demo--screenshots">Demo</a> •
    <a href="#-installation--setup">Installation</a> •
    <a href="#-api-documentation">API Docs</a> •
    <a href="#-contributing">Contributing</a> •
    <a href="#-license">License</a>
  </p>
</div>
