# Overview

This is a **Crypto Brokerage SaaS platform** built as a full-stack application enabling users to invest in curated crypto portfolios, participate in staking programs, and join community challenges. The platform features a React frontend with Express.js backend, PostgreSQL database, and implements professional-grade authentication through Replit's OAuth system.

The application follows a clean architecture pattern with clear separation between client, server, and shared components. It provides both user and admin interfaces, with comprehensive portfolio management, staking rewards calculation, and community engagement features.

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
- **Users**: Core user management with KYC status and role-based access
- **Portfolios**: Curated crypto investment packages with strategy tags and risk levels
- **UserPortfolios**: Investment tracking with returns calculation
- **Staking System**: Multi-tier staking plans with APY rates and lock periods
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
- **Staking Operations**: Plan management, reward calculations, and user staking tracking
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

## Hosting & Deployment
- **Replit**: Development and hosting platform with integrated services
- **Environment Variables**: Secure configuration management for database URLs and secrets