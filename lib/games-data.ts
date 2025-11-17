import { Game } from "@/types/game";

// In-memory storage for demo purposes
// In production, you would use a database like the Express API does
export const games: Game[] = [
  {
    id: "1",
    name: "The Legend of Zelda: Breath of the Wild",
    genre: "Action-Adventure",
    rating: 9.7,
    price: 59.99,
    description: "An open-world adventure game set in the kingdom of Hyrule.",
    releaseDate: "2017-03-03",
    platform: ["Nintendo Switch", "Wii U"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "God of War",
    genre: "Action",
    rating: 9.5,
    price: 49.99,
    description:
      "Follow Kratos and his son Atreus on an epic journey through Norse mythology.",
    releaseDate: "2018-04-20",
    platform: ["PlayStation 4", "PlayStation 5", "PC"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Elden Ring",
    genre: "Action RPG",
    rating: 9.3,
    price: 59.99,
    description:
      "A dark fantasy action RPG developed by FromSoftware and George R.R. Martin.",
    releaseDate: "2022-02-25",
    platform: [
      "PC",
      "PlayStation 4",
      "PlayStation 5",
      "Xbox One",
      "Xbox Series X/S",
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Minecraft",
    genre: "Sandbox",
    rating: 9.0,
    price: 26.95,
    description:
      "A sandbox game where players can build and explore blocky worlds.",
    releaseDate: "2011-11-18",
    platform: ["PC", "Mobile", "Console"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Stardew Valley",
    genre: "Simulation",
    rating: 8.9,
    price: 14.99,
    description:
      "A farming simulation game where you inherit your grandfather's old farm plot.",
    releaseDate: "2016-02-26",
    platform: ["PC", "Mobile", "Console"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
