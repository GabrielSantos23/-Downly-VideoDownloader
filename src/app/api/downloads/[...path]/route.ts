import { NextRequest, NextResponse } from "next/server";

// FastAPI backend URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
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
    const response = await fetch(`${API_BASE_URL}/downloads/${filePath}`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend: ${response.status}`, errorText);

      // If file not found, return 404
      if (response.status === 404) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      return NextResponse.json(
        { error: "Failed to download file", details: errorText },
        { status: response.status }
      );
    }

    // Get the file content
    const blob = await response.blob();

    // Create a new response with the file content
    const headers = new Headers();

    // Copy content-type and content-disposition headers
    if (response.headers.has("content-type")) {
      headers.set("content-type", response.headers.get("content-type")!);
    }

    if (response.headers.has("content-disposition")) {
      headers.set(
        "content-disposition",
        response.headers.get("content-disposition")!
      );
    } else {
      // If no content-disposition header, set a default one
      headers.set(
        "content-disposition",
        `attachment; filename=${filePath.split("/").pop()}`
      );
    }

    // Return the file
    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("File download API error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
