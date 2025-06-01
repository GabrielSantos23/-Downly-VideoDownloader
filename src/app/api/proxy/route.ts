import { NextRequest, NextResponse } from "next/server";

// FastAPI backend URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

// Generic handler for all API requests
async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/api/proxy", "");
    const targetUrl = `${API_BASE_URL}${path}${url.search}`;

    const method = req.method;
    const headers = new Headers(req.headers);
    headers.delete("host"); // Remove host header to avoid conflicts

    // Clone the request with the new URL
    const apiReq = new Request(targetUrl, {
      method,
      headers,
      body:
        method !== "GET" && method !== "HEAD" ? await req.blob() : undefined,
      redirect: "follow",
    });

    const response = await fetch(apiReq);

    // Create a new response with the API response
    const data = await response.blob();

    // Return the response with appropriate status and headers
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to reach API server" },
      { status: 500 }
    );
  }
}

// Handle GET, POST, PUT, DELETE methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
