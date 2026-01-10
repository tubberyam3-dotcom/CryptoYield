# Overview

This is **Reflux Capital**, a professional investment brokerage and advisory platform built as a full-stack application enabling users to invest in bonds, shares, and curated portfolios. The platform features a React frontend with Express.js backend, PostgreSQL database, and implements professional-grade authentication through Replit's OAuth system and password-based authentication.

The application follows a clean architecture pattern with clear separation between client, server, and shared components. It provides both user and admin interfaces, with comprehensive portfolio management, bond investment tracking, and community engagement features.

## Documentation

- **AI Agent User Guide**: See `docs/USER_GUIDE_AI.md` for comprehensive documentation of all user flows, API endpoints, and step-by-step instructions for deposits, investments, withdrawals, rewards, and more. This guide is structured for AI agents to consume and assist users.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom theme provider supporting dark/light modes with CSS variables

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the entire stack
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit OAuth integration with session management using connect-pg-simple

## Database Schema Design
- **Users**: Core user management with KYC status, role-based access, and multi-account types (personal, business, joint)
- **Joint Accounts**: Couples/family joint account support with secure join codes
- **Portfolios**: Curated investment packages (stocks, ETFs, mutual funds) with strategy tags and risk levels
- **UserPortfolios**: Investment tracking with returns calculation
- **Bond Products**: Government, corporate, and municipal bonds with yield rates and maturity periods
- **UserBonds**: Bond investment tracking with purchase dates and expected returns
- **Community Challenges**: Group and solo investment challenges with progress tracking
- **Sessions**: Secure session storage for authentication persistence

## Authentication & Authorization
- **OAuth Provider**: Replit's OpenID Connect for secure user authentication
- **Session Management**: PostgreSQL-backed sessions with configurable TTL
- **Role-Based Access**: User and admin roles with protected routes and admin-only features
- **Security**: JWT tokens with automatic refresh and proper error handling

## Data Layer
- **ORM**: Drizzle with PostgreSQL dialect for type-safe database operations
- **Connection Pool**: Neon serverless PostgreSQL with WebSocket support
- **Migrations**: Drizzle Kit for schema management and database migrations
- **Validation**: Zod schemas for runtime type validation and API input sanitization

## API Structure
- **Portfolio Management**: CRUD operations for investment portfolios with admin controls
- **Bond Operations**: Product management, yield calculations, and user bond investment tracking
- **Joint Account Management**: Account creation, join code system, and partner linking
- **Challenge System**: Community challenge creation, joining, and progress tracking
- **User Dashboard**: Comprehensive statistics and activity tracking
- **Admin Panel**: Administrative controls for platform management

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: TypeScript-first ORM with automatic type generation

## Authentication Services
- **Replit OAuth**: OpenID Connect authentication provider
- **Session Storage**: PostgreSQL-based session management with connect-pg-simple

## UI/UX Libraries
- **Radix UI**: Headless UI components for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide Icons**: Icon library for consistent visual elements
- **Recharts**: Chart library for portfolio performance visualization

## Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking across frontend and backend
- **TanStack Query**: Data fetching and caching for React applications
- **Wouter**: Lightweight routing library for React

## Email Notifications
- **Service**: Nodemailer for SMTP-based email delivery
- **Configuration**: Admin-configurable SMTP settings stored in systemSettings table
- **Templates**: Welcome emails, deposit confirmations, stock purchase updates, and reward notifications
- **Security**: SMTP passwords are write-only (never returned in API responses), stored server-side only
- **Note**: Email service is configured through the admin panel (Email section in sidebar). User dismissed SendGrid integration - using custom SMTP configuration instead.

## Hosting & Deployment
- **Replit**: Development and hosting platform with integrated services
- **Environment Variables**: Secure configuration management for database URLs and secrets