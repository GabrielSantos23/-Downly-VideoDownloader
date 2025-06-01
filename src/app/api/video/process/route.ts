import { NextRequest, NextResponse } from "next/server";

// FastAPI backend URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward the request to the FastAPI backend
    const response = await fetch(`${API_BASE_URL}/video/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend: ${response.status}`, errorText);
      return NextResponse.json(
        { error: "Failed to process video", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Video processing API error:", error);
    return NextResponse.json(
      { error: "Failed to process video request" },
      { status: 500 }
    );
  }
}
