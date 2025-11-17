import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { gameSchema, idSchema } from "@/lib/validation";
import { verifyToken } from "@/lib/auth";

// GET /api/games/[id] - Get a single game by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Access token required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate UUID
    const { error } = idSchema.validate(id);
    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: [
            {
              field: "id",
              message: error.message,
            },
          ],
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
        SELECT 
          id, name, genre, rating, price, description, 
          release_date as "releaseDate", platform,
          created_at as "createdAt", updated_at as "updatedAt"
        FROM games 
        WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: "Game retrieved successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Game not found",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("GET /api/games/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve game",
      },
      { status: 500 }
    );
  }
}

// PUT /api/games/[id] - Update a game
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Access token required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate UUID
    const { error: idError } = idSchema.validate(id);
    if (idError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: [
            {
              field: "id",
              message: idError.message,
            },
          ],
        },
        { status: 400 }
      );
    }

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
        id,
        user.userId,
      ]
    );

    if (result.rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: "Game updated successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Game not found",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("PUT /api/games/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update game",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[id] - Delete a game
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Access token required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate UUID
    const { error } = idSchema.validate(id);
    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: [
            {
              field: "id",
              message: error.message,
            },
          ],
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "DELETE FROM games WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount && result.rowCount > 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Game deleted successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Game not found",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("DELETE /api/games/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete game",
      },
      { status: 500 }
    );
  }
}
