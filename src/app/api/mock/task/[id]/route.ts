import { NextResponse } from "next/server";

// Mock task status response
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Simulate different progress states based on the current time
  const progress = Math.min(100, (Date.now() % 10000) / 100);

  if (progress >= 100) {
    return NextResponse.json({
      status: "completed",
      progress: 100,
      message: "Download ready!",
      download_url: "/mock-download.mp4",
    });
  }

  return NextResponse.json({
    status: "processing",
    progress: Math.floor(progress),
    message: `Processing video... ${Math.floor(progress)}%`,
  });
}
