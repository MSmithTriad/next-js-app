import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Joi, { type ObjectSchema } from 'joi';
import { body, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import { IncomingMessage } from 'http';

interface CustomRequest extends Request {
  [key: string]: any;
  user?: any;
}

dotenv.config();

const app = express();
const port = process.env['PORT'] || 4000;

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS Security: Restricted origins
const corsOptions = {
  origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Rate Limiting: Prevents DoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Strict rate limiting for write operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 write operations per 15 minutes
  skip: (req) => req.method === 'GET',
});
app.use('/api/games', strictLimiter);

// Body parsing with size limits: Prevents memory attacks
app.use(
  express.json({
    limit: '10mb',
    verify: (req: { rawBody: Buffer } & IncomingMessage, _, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// Database configuration with better security
const pool = new Pool({
  host: process.env['DB_HOST'],
  port: parseInt(process.env['DB_PORT'] || '5432'),
  database: process.env['DB_NAME'],
  user: process.env['DB_USER'],
  password: process.env['DB_PASSWORD'],
  // Database Security: Proper SSL configuration
  ssl:
    process.env['DB_SSL'] === 'true'
      ? {
          rejectUnauthorized: false,
          ca: process.env['DB_CA_CERT'],
          cert: process.env['DB_CLIENT_CERT'],
          key: process.env['DB_CLIENT_KEY'],
        }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  query_timeout: 30000,
  statement_timeout: 30000,
});

const JWT_SECRET = process.env['JWT_SECRET'];

// Input validation schemas
const gameSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().trim(),
  genre: Joi.string().min(1).max(100).required().trim(),
  rating: Joi.number().min(0).max(10).precision(1).required(),
  price: Joi.number().min(0).max(9999.99).precision(2).required(),
  description: Joi.string().max(1000).allow('', null).trim(),
  releaseDate: Joi.date().iso().allow(null),
  platform: Joi.array().items(Joi.string().max(50)).max(10).allow(null),
}).options({ stripUnknown: true });

const idSchema = Joi.string().uuid().required();

// Auth middleware
const authenticateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }

  return jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user; // Now this works without type assertion
    return next();
  });
};

const validateRequest = (schema: ObjectSchema, source = 'body') => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[source]);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }
    req[source] = value;
    return next();
  };
};

const validateIdParam = (req: Request, res: Response, next: NextFunction) => {
  const { error } = idSchema.validate(req.params['id']);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: [
        {
          field: 'id',
          message: error.message,
        },
      ],
    });
  }
  return next();
};

// Logging middleware (sanitized)
const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const sanitizedHeaders = { ...req.headers };
  delete sanitizedHeaders.authorization;
  delete sanitizedHeaders.cookie;

  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
};
app.use(logRequest);

// Auth routes
app.post(
  '/api/auth/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().isLength({ min: 1 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const result = await pool.query(
        'INSERT INTO users (email, password, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name',
        [email, hashedPassword, name]
      );

      const user = result.rows[0];

      if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return res.status(500).json({ success: false, error: 'Internal server error' });
      }

      // Generate JWT
      const token = jwt.sign({ userId: user['id'], email: user.email }, JWT_SECRET, {
        expiresIn: '24h',
      });

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user['id'],
            email: user.email,
            name: user.name,
          },
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

app.post(
  '/api/auth/login',
  [body('email').isEmail().normalizeEmail(), body('password').exists()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const result = await pool.query(
        'SELECT id, email, name, password FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return res.status(500).json({ success: false, error: 'Internal server error' });
      }

      // Generate JWT
      const token = jwt.sign({ userId: user['id'], email: user.email }, JWT_SECRET, {
        expiresIn: '24h',
      });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user['id'],
            email: user.email,
            name: user.name,
          },
        },
        message: 'Login successful',
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Health check (no auth required)
app.get('/api/health', async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const dbResponseTime = Date.now() - start;

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        dbResponseTime: `${dbResponseTime}ms`,
        timestamp: new Date().toISOString(),
        version: process.env['API_VERSION'] || '1.0.0',
      },
    });
  } catch (error) {
    console.error('Health check failed:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
    });
  }
});

// Protected routes
app.get('/api/games', authenticateToken, async (req, res) => {
  try {
    // Pagination parameters
    const page = req.query['page'] ? Math.max(1, parseInt(req.query['page'].toString()) || 1) : 1;
    const limit = req.query['limit']
      ? Math.min(100, Math.max(1, parseInt(req.query['limit'].toString()) || 10))
      : 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query['sortBy']?.toString() || 'name';
    const sortOrder = req.query['sortOrder'] === 'desc' ? 'DESC' : 'ASC';
    const search = req.query['search'] || '';

    // Valid sort columns
    const validSortColumns = ['name', 'genre', 'rating', 'price', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';

    let query = `
      SELECT 
        id, name, genre, rating, price, description, 
        release_date as "releaseDate", platform,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM games 
    `;
    let countQuery = 'SELECT COUNT(*) FROM games';
    let queryParams = [];
    let countParams = [];

    // Add search filter if provided
    if (search) {
      const searchCondition = ' WHERE (name ILIKE $1 OR genre ILIKE $1 OR description ILIKE $1)';
      query += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // Add sorting and pagination
    query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT $${queryParams.length + 1} OFFSET $${
      queryParams.length + 2
    }`;
    queryParams.push(limit, offset);

    // Execute both queries
    const [gamesResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams),
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: gamesResult.rows,
      meta: {
        // Changed from 'pagination' to 'meta' to match frontend
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      message: 'Games retrieved successfully',
    });
  } catch (error) {
    console.error('GET /api/games error:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve games',
    });
  }
});

app.get('/api/games/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT 
          id, name, genre, rating, price, description, 
          release_date as "releaseDate", platform,
          created_at as "createdAt", updated_at as "updatedAt"
        FROM games 
        WHERE id = $1
      `,
      [req.params['id']]
    );

    if (result.rows.length > 0) {
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Game retrieved successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }
  } catch (error) {
    console.error('GET /api/games/:id error:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve game',
    });
  }
});

app.post(
  '/api/games',
  authenticateToken,
  validateRequest(gameSchema),
  async (req: CustomRequest, res: Response) => {
    try {
      const { name, genre, rating, price, description, releaseDate, platform } = req.body;

      const result = await pool.query(
        `
        INSERT INTO games (name, genre, rating, price, description, release_date, platform, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING 
          id, name, genre, rating, price, description, 
          release_date as "releaseDate", platform,
          created_at as "createdAt", updated_at as "updatedAt"
      `,
        [
          name,
          genre,
          rating,
          price,
          description || null,
          releaseDate || null,
          platform || null,
          req.user['id'], // Now this works without type assertion
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Game created successfully',
      });
    } catch (error: any) {
      console.error('POST /api/games error:', error.message);

      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          error: 'Game with this name already exists',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create game',
        });
      }
    }
  }
);

app.put(
  '/api/games/:id',
  authenticateToken,
  validateIdParam,
  validateRequest(gameSchema),
  async (req: CustomRequest, res: Response) => {
    try {
      const { name, genre, rating, price, description, releaseDate, platform } = req.body;

      const result = await pool.query(
        `
        UPDATE games 
        SET 
          name = $1, genre = $2, rating = $3, price = $4, 
          description = $5, release_date = $6, platform = $7, 
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $9
        WHERE id = $8
        RETURNING 
          id, name, genre, rating, price, description, 
          release_date as "releaseDate", platform,
          created_at as "createdAt", updated_at as "updatedAt"
      `,
        [
          name,
          genre,
          rating,
          price,
          description || null,
          releaseDate || null,
          platform || null,
          req.params['id'],
          req.user['id'],
        ]
      );

      if (result.rows.length > 0) {
        res.json({
          success: true,
          data: result.rows[0],
          message: 'Game updated successfully',
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Game not found',
        });
      }
    } catch (error) {
      console.error('PUT /api/games/:id error:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: 'Failed to update game',
      });
    }
  }
);

app.delete('/api/games/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM games WHERE id = $1 RETURNING id', [
      req.params['id'],
    ]);

    if (result.rowCount && result.rowCount > 0) {
      res.json({
        success: true,
        data: null,
        message: 'Game deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }
  } catch (error) {
    console.error('DELETE /api/games/:id error:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete game',
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use((err, res) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Secure API Server running on http://localhost:${port}`);
  console.log(`Health check available at http://localhost:${port}/api/health`);
});
