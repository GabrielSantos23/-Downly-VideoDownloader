import { NextRequest, NextResponse } from "next/server";

// FastAPI backend URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path } = params;

    if (!path || path.length === 0) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Construct the file path
    const filePath = path.join("/");

    // Forward the request to the FastAPI backend
    const response = await fetch(`${API_BASE_URL}/processed/${filePath}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend: ${response.status}`, errorText);

      // If file not found, return 404
      if (response.status === 404) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      return NextResponse.json(
        { error: "Failed to delete file", details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("File deletion API error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
