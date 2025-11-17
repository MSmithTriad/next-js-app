import { NextRequest, NextResponse } from "next/server";
import { Game } from "@/types/game";
import { games } from "@/lib/games-data";

// GET /api/games - Get all games with pagination and search
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10"))
    );
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    // Filter games by search
    let filteredGames = games;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredGames = games.filter(
        (game) =>
          game.name.toLowerCase().includes(searchLower) ||
          game.genre.toLowerCase().includes(searchLower) ||
          game.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort games
    const sortedGames = [...filteredGames].sort((a, b) => {
      const aValue = a[sortBy as keyof Game];
      const bValue = b[sortBy as keyof Game];

      if (aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    // Paginate
    const totalItems = sortedGames.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;
    const paginatedGames = sortedGames.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedGames,
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
    const body = await request.json();

    // Validate required fields
    if (
      !body.name ||
      !body.genre ||
      body.rating === undefined ||
      body.price === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: "Name, genre, rating, and price are required",
        },
        { status: 400 }
      );
    }

    // Validate rating and price ranges
    if (body.rating < 0 || body.rating > 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: "Rating must be between 0 and 10",
        },
        { status: 400 }
      );
    }

    if (body.price < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: "Price must be non-negative",
        },
        { status: 400 }
      );
    }

    const newGame: Game = {
      id: Date.now().toString(),
      name: body.name.trim(),
      genre: body.genre.trim(),
      rating: Number(body.rating),
      price: Number(body.price),
      description: body.description?.trim() || undefined,
      releaseDate: body.releaseDate || undefined,
      platform: body.platform || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    games.push(newGame);

    return NextResponse.json(
      {
        success: true,
        data: newGame,
        message: "Game created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/games error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create game",
      },
      { status: 500 }
    );
  }
}
