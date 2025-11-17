import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const dbResponseTime = Date.now() - start;

    return NextResponse.json({
      success: true,
      data: {
        status: "healthy",
        database: "connected",
        dbResponseTime: `${dbResponseTime}ms`,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || "1.0.0",
      },
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Health check failed",
      },
      { status: 500 }
    );
  }
}
