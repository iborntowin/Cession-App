# Cession Management App - README

This is a production-grade, enterprise-level web application for securely managing and monitoring wage garnishment (cession sur salaire) for clients in Tunisia.

## Project Structure

The project is organized into three main components:

- **Backend**: Spring Boot application with JWT authentication, REST APIs, and Supabase Storage integration
- **Frontend**: SvelteKit application with Tailwind CSS for responsive UI
- **Database**: PostgreSQL schema for clients, cessions, and documents

## Features

- **Client Management**: Create, view, update, and delete client records with required document uploads
- **Cession Management**: Track wage garnishments with auto-calculation of remaining balance and payoff date
- **Document Management**: Secure PDF uploads for national ID cards, job cards, and cession contracts
- **Admin-only Access**: JWT-based authentication for secure access control
- **Search & Filter**: Find cessions by status, client name, or dates
- **Mobile-Responsive**: Works seamlessly on phones and desktops

## Technology Stack

| Layer         | Stack                     | Hosting                       |
|---------------|---------------------------|-------------------------------|
| Frontend      | SvelteKit                 | Vercel or Netlify (Free tier) |
| Backend       | Spring Boot (Java)        | Render or Railway (Free tier) |
| Database      | PostgreSQL                | Supabase (Free tier)          |
| File Storage  | Supabase Storage          | Free tier                     |
| Auth System   | JWT                       | Secure login for admins       |

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL (or Supabase account)
- Maven

### Local Development

#### Backend

1. Navigate to the backend directory:
   ```
   cd cession-app/backend
   ```

2. Copy the `.env.example` file to `.env` and update the values:
   ```
   cp .env.example .env
   ```

3. Run the application:
   ```
   ./mvnw spring-boot:run
   ```

#### Frontend

1. Navigate to the frontend directory:
   ```
   cd cession-app/frontend
   ```

2. Copy the `.env.example` file to `.env` and update the values:
   ```
   cp .env.example .env
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Run the development server:
   ```
   npm run dev
   ```

### Deployment

See the [DEPLOYMENT.md](DEPLOYMENT.md) file for detailed instructions on deploying the application to free-tier cloud services.

## Security

- All secrets, credentials, and API keys are stored in `.env` files (never hardcoded)
- JWT authentication for secure admin-only access
- CORS configuration to allow only the frontend URL
- File validation to ensure only PDFs are uploaded

## Default Credentials

For the demo application:
- Username: `admin`
- Password: `admin123`

## License

This project is licensed under the MIT License - see the LICENSE file for details.