# Thesis Management System

A comprehensive web application for managing university thesis assignments, built with Node.js, Express, MySQL, and Vanilla JavaScript.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Role Management**: Support for students, instructors, and secretaries
- **Topic Management**: Create, read, update, and delete research topics
- **Thesis Lifecycle**: Complete thesis assignment and management workflow
- **File Attachments**: Upload and manage thesis-related documents
- **Presentation Scheduling**: Schedule and manage thesis presentations
- **Grading System**: Committee-based grading with comments
- **Export/Import**: Data import/export functionality for secretary role

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL 8.0
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Development**: Docker, Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd thesis-management-system
   ```

2. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker**

   ```bash
   docker-compose up --build
   ```

4. **Run database migrations**

   ```bash
   docker-compose exec app npm run migrate
   ```

5. **Seed the database**

   ```bash
   docker-compose exec app npm run seed
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api
   - Health Check: http://localhost:3000/api/health

## Default Test Accounts

After seeding, you can log in with these accounts:

**Students:**

- Email: `agis@example.com` | Password: `password123`
- Email: `maria@example.com` | Password: `password123`

**Instructors:**

- Email: `ioannis.k@uni.edu` | Password: `password123`
- Email: `sofia.n@uni.edu` | Password: `password123`

**Secretary:**

- Email: `secretary@uni.edu` | Password: `password123`

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Topics

- `GET /api/topics` - List all topics
- `GET /api/topics/:id` - Get specific topic
- `POST /api/topics` - Create new topic (instructor only)
- `PUT /api/topics/:id` - Update topic (instructor only)
- `DELETE /api/topics/:id` - Delete topic (instructor only)

### Development Commands

**Local Development:**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run migrations
npm run migrate

# Seed database
npm run seed

# Run tests
npm test
```

**Docker Development:**

```bash
# Build and start services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset database
docker-compose down -v
docker-compose up --build
```

## Project Structure

```
thesis-management-system/
├── src/
│   ├── config/          # Database and app configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware (auth, validation)
│   ├── models/          # Database models
│   ├── routes/          # Express routes
│   └── app.js           # Main application file
├── scripts/
│   ├── init.sql         # Database schema
│   ├── migrate.js       # Migration script
│   └── seed.js          # Database seeding
├── public/              # Static frontend files
├── uploads/             # File uploads directory
├── docker-compose.yml   # Docker services configuration
├── Dockerfile           # Application container
└── package.json         # Node.js dependencies
```

## Database Schema

The system uses the following main tables:

- **users**: Student, instructor, and secretary accounts
- **topics**: Research topics created by instructors
- **theses**: Thesis assignments and lifecycle management
- **committee_members**: Thesis committee management
- **invitations**: Committee invitation system
- **attachments**: File uploads and document management
- **presentations**: Presentation scheduling
- **grades**: Grading system with comments

## Security Features

- JWT-based authentication
- Role-based access control
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Security headers with Helmet.js

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.
