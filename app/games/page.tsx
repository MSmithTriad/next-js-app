"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Game, PaginatedResponse } from "@/types/game";
import { useAuth } from "@/contexts/AuthContext";

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGame, setNewGame] = useState({
    name: "",
    genre: "",
    rating: 0,
    price: 0,
    description: "",
    releaseDate: "",
    platform: "",
  });

  const { token, user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const fetchGames = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
      });

      const response = await fetch(`/api/games?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data: PaginatedResponse<Game> = await response.json();

      if (response.status === 401) {
        logout();
        router.push("/login");
        return;
      }

      if (data.success) {
        setGames(data.data);
        setTotalPages(data.meta.totalPages);
      } else {
        setError(data.message || "Failed to fetch games");
      }
    } catch (err) {
      setError("Failed to fetch games");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchGames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, token]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this game?") || !token)
      return;

    try {
      const response = await fetch(`/api/games/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        fetchGames();
      } else {
        alert(data.error || "Failed to delete game");
      }
    } catch (err) {
      alert("Failed to delete game");
      console.error(err);
    }
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    try {
      const gameData = {
        ...newGame,
        rating: Number(newGame.rating),
        price: Number(newGame.price),
        releaseDate: newGame.releaseDate || null,
        platform: newGame.platform || null,
      };

      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(gameData),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddForm(false);
        setNewGame({
          name: "",
          genre: "",
          rating: 0,
          price: 0,
          description: "",
          releaseDate: "",
          platform: "",
        });
        fetchGames();
      } else {
        alert(data.error || "Failed to add game");
      }
    } catch (err) {
      alert("Failed to add game");
      console.error(err);
    }
  };

  if (authLoading || (loading && games.length === 0)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            Loading games...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-white">
              Game Library
            </h1>
            {user && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                Welcome, {user.name}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white"
            >
              Home
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-white"
          />
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "Add Game"}
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddGame}
            className="mb-8 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow"
          >
            <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
              Add New Game
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Name *"
                required
                value={newGame.name}
                onChange={(e) =>
                  setNewGame({ ...newGame, name: e.target.value })
                }
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
              />
              <input
                type="text"
                placeholder="Genre *"
                required
                value={newGame.genre}
                onChange={(e) =>
                  setNewGame({ ...newGame, genre: e.target.value })
                }
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
              />
              <input
                type="number"
                placeholder="Rating (0-10) *"
                required
                min="0"
                max="10"
                step="0.1"
                value={newGame.rating}
                onChange={(e) =>
                  setNewGame({ ...newGame, rating: parseFloat(e.target.value) })
                }
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
              />
              <input
                type="number"
                placeholder="Price *"
                required
                min="0"
                step="0.01"
                value={newGame.price}
                onChange={(e) =>
                  setNewGame({ ...newGame, price: parseFloat(e.target.value) })
                }
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
              />
              <input
                type="date"
                placeholder="Release Date"
                value={newGame.releaseDate}
                onChange={(e) =>
                  setNewGame({ ...newGame, releaseDate: e.target.value })
                }
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
              />
              <input
                type="text"
                placeholder="Platform"
                value={newGame.platform}
                onChange={(e) =>
                  setNewGame({ ...newGame, platform: e.target.value })
                }
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white"
              />
              <textarea
                placeholder="Description"
                value={newGame.description}
                onChange={(e) =>
                  setNewGame({ ...newGame, description: e.target.value })
                }
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white md:col-span-2"
                rows={3}
              />
            </div>
            <button
              type="submit"
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Game
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <div
              key={game.id}
              className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-bold mb-2 text-black dark:text-white">
                {game.name}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                {game.genre}
              </p>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                  ⭐ {game.rating}
                </span>
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  ${game.price}
                </span>
              </div>
              {game.description && (
                <p className="text-zinc-700 dark:text-zinc-300 text-sm mb-4 line-clamp-3">
                  {game.description}
                </p>
              )}
              {game.platform && game.platform.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">
                    Platforms:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {game.platform.split(",").map((platform, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Link
                  href={`/games/${game.id}`}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
                >
                  View/Edit
                </Link>
                <button
                  onClick={() => handleDelete(game.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {games.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              {searchTerm
                ? "No games found matching your search."
                : "No games in the library yet."}
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-black dark:text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
