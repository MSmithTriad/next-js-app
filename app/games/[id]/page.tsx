"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Game, ApiResponse } from "@/types/game";

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedGame, setEditedGame] = useState<Partial<Game>>({});
  const router = useRouter();
  const [gameId, setGameId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setGameId(p.id));
  }, [params]);

  useEffect(() => {
    if (!gameId) return;

    const fetchGame = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/games/${gameId}`);
        const data: ApiResponse<Game> = await response.json();

        if (data.success && data.data) {
          setGame(data.data);
          setEditedGame(data.data);
        } else {
          setError(data.error || "Failed to fetch game");
        }
      } catch (err) {
        setError("Failed to fetch game");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  const handleSave = async () => {
    if (!game) return;

    try {
      const gameData = {
        ...editedGame,
        rating: Number(editedGame.rating),
        price: Number(editedGame.price),
        platform:
          typeof editedGame.platform === "string"
            ? (editedGame.platform as string).split(",").map((p) => p.trim())
            : editedGame.platform,
      };

      const response = await fetch(`/api/games/${game.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gameData),
      });

      const data: ApiResponse<Game> = await response.json();

      if (data.success && data.data) {
        setGame(data.data);
        setEditedGame(data.data);
        setIsEditing(false);
      } else {
        alert(data.error || "Failed to update game");
      }
    } catch (err) {
      alert("Failed to update game");
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!game || !confirm("Are you sure you want to delete this game?")) return;

    try {
      const response = await fetch(`/api/games/${game.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        router.push("/games");
      } else {
        alert(data.error || "Failed to delete game");
      }
    } catch (err) {
      alert("Failed to delete game");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            Loading game...
          </p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
            {error || "Game not found"}
          </div>
          <Link
            href="/games"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-black dark:text-white">
            Game Details
          </h1>
          <Link
            href="/games"
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white"
          >
            Back to Games
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black dark:text-white">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={editedGame.name || ""}
                  onChange={(e) =>
                    setEditedGame({ ...editedGame, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black dark:text-white">
                  Genre *
                </label>
                <input
                  type="text"
                  required
                  value={editedGame.genre || ""}
                  onChange={(e) =>
                    setEditedGame({ ...editedGame, genre: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-black dark:text-white">
                    Rating (0-10) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="10"
                    step="0.1"
                    value={editedGame.rating || 0}
                    onChange={(e) =>
                      setEditedGame({
                        ...editedGame,
                        rating: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-black dark:text-white">
                    Price *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editedGame.price || 0}
                    onChange={(e) =>
                      setEditedGame({
                        ...editedGame,
                        price: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black dark:text-white">
                  Release Date
                </label>
                <input
                  type="date"
                  value={editedGame.releaseDate || ""}
                  onChange={(e) =>
                    setEditedGame({
                      ...editedGame,
                      releaseDate: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black dark:text-white">
                  Platforms (comma-separated)
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(editedGame.platform)
                      ? editedGame.platform.join(", ")
                      : editedGame.platform || ""
                  }
                  onChange={(e) =>
                    setEditedGame({ ...editedGame, platform: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black dark:text-white">
                  Description
                </label>
                <textarea
                  value={editedGame.description || ""}
                  onChange={(e) =>
                    setEditedGame({
                      ...editedGame,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
                  rows={5}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedGame(game);
                  }}
                  className="px-6 py-2 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2 text-black dark:text-white">
                  {game.name}
                </h2>
                <p className="text-xl text-zinc-600 dark:text-zinc-400">
                  {game.genre}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                    Rating
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    ⭐ {game.rating.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                    Price
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${game.price.toFixed(2)}
                  </p>
                </div>
                {game.releaseDate && (
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                      Release Date
                    </p>
                    <p className="text-lg font-semibold text-black dark:text-white">
                      {new Date(game.releaseDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {game.platform && game.platform.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-500 mb-2">
                    Platforms
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {game.platform.map((platform, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {game.description && (
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-500 mb-2">
                    Description
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {game.description}
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Game
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Game
                </button>
              </div>

              {(game.createdAt || game.updatedAt) && (
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-500">
                  {game.createdAt && (
                    <p>Created: {new Date(game.createdAt).toLocaleString()}</p>
                  )}
                  {game.updatedAt && (
                    <p>
                      Last Updated: {new Date(game.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
