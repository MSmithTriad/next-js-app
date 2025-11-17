import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { gameSchema } from "@/lib/validation";
import { verifyToken } from "@/lib/auth";

// GET /api/games - Get all games with pagination and search
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Access token required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10"))
    );
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "DESC" : "ASC";
    const search = searchParams.get("search") || "";

    // Valid sort columns
    const validSortColumns = ["name", "genre", "rating", "price", "created_at"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "name";

    let query = `
      SELECT 
        id, name, genre, rating, price, description, 
        release_date as "releaseDate", platform,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM games 
    `;
    let countQuery = "SELECT COUNT(*) FROM games";
    const queryParams: (string | number)[] = [];
    const countParams: string[] = [];

    // Add search filter if provided
    if (search) {
      const searchCondition =
        " WHERE (name ILIKE $1 OR genre ILIKE $1 OR description ILIKE $1)";
      query += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // Add sorting and pagination
    query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT $${
      queryParams.length + 1
    } OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Execute both queries
    const [gamesResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams),
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      data: gamesResult.rows,
      meta: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      message: "Games retrieved successfully",
    });
  } catch (error) {
    console.error("GET /api/games error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve games",
      },
      { status: 500 }
    );
  }
}

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Access token required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate using Joi schema
    const { error, value } = gameSchema.validate(body);
    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.details.map((detail) => ({
            field: detail.path.join("."),
            message: detail.message,
          })),
        },
        { status: 400 }
      );
    }

    const { name, genre, rating, price, description, releaseDate, platform } =
      value;

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
        user.userId,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: "Game created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/games error:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Game with this name already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create game",
      },
      { status: 500 }
    );
  }
}
