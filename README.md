# Game Library App - Next.js

A full-stack game management application built with Next.js 16, featuring database integration with AWS RDS PostgreSQL and JWT authentication.

## Features

- **Full CRUD Operations**: Create, Read, Update, and Delete games
- **JWT Authentication**: Secure user registration and login
- **PostgreSQL Database**: Connected to AWS RDS for persistent storage
- **Search & Pagination**: Filter and browse games efficiently
- **Responsive Design**: Built with Tailwind CSS and dark mode support
- **Next.js API Routes**: Server-side API endpoints integrated in the same application

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: JWT (jsonwebtoken, bcryptjs)
- **Validation**: Joi
- **Database Client**: node-postgres (pg)

## Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Variables**:
   The `.env.local` file contains the AWS database credentials and JWT secret.

3. **Run the Development Server**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

1. **Home Page**: Visit the landing page at `http://localhost:3000`
2. **Login/Register**: Create an account or log in via the `/login` page
3. **Game Library**: After authentication, access `/games` to:
   - View all games with pagination
   - Search for games by name, genre, or description
   - Add new games using the "Add Game" button
   - Edit or delete existing games by clicking on individual game cards

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token

### Games (Protected - Requires JWT)

- `GET /api/games` - Get all games (with pagination and search)
- `GET /api/games/[id]` - Get a specific game
- `POST /api/games` - Create a new game
- `PUT /api/games/[id]` - Update a game
- `DELETE /api/games/[id]` - Delete a game

### Health Check

- `GET /api/health` - Check API and database health

## Database Schema

The application uses the following PostgreSQL tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
  price DECIMAL(6,2) CHECK (price >= 0),
  description TEXT,
  release_date DATE,
  platform TEXT[],
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Project Structure

```
next-js-app/
├── app/
│   ├── api/              # Next.js API routes
│   ├── games/            # Game pages (list and detail)
│   ├── login/            # Authentication page
│   └── page.tsx          # Home page
├── contexts/
│   └── AuthContext.tsx   # Authentication context
├── lib/
│   ├── auth.ts          # JWT utilities
│   ├── db.ts            # PostgreSQL connection
│   └── validation.ts    # Joi schemas
├── types/
│   └── game.ts          # TypeScript interfaces
└── .env.local           # Environment variables
```

## Building for Production

```bash
npm run build
npm start
```

## Learn More

To learn more about Next.js, check out:

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## Deploy on Vercel

Deploy easily using the [Vercel Platform](https://vercel.com/new).
