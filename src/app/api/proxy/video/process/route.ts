import { NextRequest, NextResponse } from "next/server";

// FastAPI backend URL
const API_URL = process.env.API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const targetUrl = `${API_URL}/video/process`;

  console.log("Direct proxy handler for /api/proxy/video/process");
  console.log(`Forwarding to: ${targetUrl}`);

  try {
    const body = await request.json();
    console.log("Request body:", body);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("API response status:", response.status);

    const responseText = await response.text();
    console.log("API response text:", responseText);

    if (!response.ok) {
      console.error(`API error: ${response.status} - ${responseText}`);
      return NextResponse.json(
        {
          error: `API responded with status ${response.status}`,
          details: responseText,
        },
        { status: response.status }
      );
    }

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      return NextResponse.json(
        { error: "Invalid JSON response from API", details: responseText },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to send data to API", details: String(error) },
      { status: 500 }
    );
  }
}
