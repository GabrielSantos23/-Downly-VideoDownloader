import { NextRequest, NextResponse } from "next/server";

// FastAPI backend URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Forward the request to the FastAPI backend
    const response = await fetch(`${API_BASE_URL}/task/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend: ${response.status}`, errorText);

      // If task not found, return 404
      if (response.status === 404) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      return NextResponse.json(
        { error: "Failed to fetch task status", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If the task has a download URL, modify it to point to our local endpoint
    if (data.download_url) {
      // Replace the FastAPI URL with our Next.js API route
      const downloadUrl = data.download_url.replace(
        "/downloads/",
        "/api/downloads/"
      );
      data.download_url = downloadUrl;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Task status API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task status" },
      { status: 500 }
    );
  }
}
