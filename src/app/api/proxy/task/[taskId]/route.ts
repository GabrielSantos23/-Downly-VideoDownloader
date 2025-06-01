import { NextRequest, NextResponse } from "next/server";

// FastAPI backend URL
const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  const targetUrl = `${API_URL}/task/${taskId}`;

  console.log(`Direct proxy handler for /api/proxy/task/${taskId}`);
  console.log(`Forwarding to: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
      { error: "Failed to fetch data from API", details: String(error) },
      { status: 500 }
    );
  }
}
