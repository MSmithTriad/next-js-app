import { NextRequest, NextResponse } from "next/server";
import { games } from "@/lib/games-data";
import { Game } from "@/types/game";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const game = games.find((g) => g.id === id);

    if (!game) {
      return NextResponse.json(
        {
          success: false,
          error: "Game not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: game,
      message: "Game retrieved successfully",
    });
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const gameIndex = games.findIndex((g) => g.id === id);

    if (gameIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Game not found",
        },
        { status: 404 }
      );
    }

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

    const updatedGame: Game = {
      ...games[gameIndex],
      name: body.name.trim(),
      genre: body.genre.trim(),
      rating: Number(body.rating),
      price: Number(body.price),
      description: body.description?.trim() || undefined,
      releaseDate: body.releaseDate || undefined,
      platform: body.platform || undefined,
      updatedAt: new Date().toISOString(),
    };

    games[gameIndex] = updatedGame;

    return NextResponse.json({
      success: true,
      data: updatedGame,
      message: "Game updated successfully",
    });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const gameIndex = games.findIndex((g) => g.id === id);

    if (gameIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Game not found",
        },
        { status: 404 }
      );
    }

    games.splice(gameIndex, 1);

    return NextResponse.json({
      success: true,
      data: null,
      message: "Game deleted successfully",
    });
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
