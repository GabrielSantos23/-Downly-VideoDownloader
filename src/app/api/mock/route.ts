import { NextResponse } from "next/server";

// Mock video info response
export async function GET() {
  return NextResponse.json({
    title: "Sade - Smooth Operator - Official - 1984",
    channel: "Sade",
    duration: 258, // 4:18 in seconds
    thumbnail: "https://i.ytimg.com/vi/4TYv2PhG89A/maxresdefault.jpg",
    formats: ["mp4", "mp3", "mkv"],
    qualities: ["low", "medium", "high", "best"],
  });
}

// Mock video processing response
export async function POST() {
  return NextResponse.json({
    task_id: "mock-task-" + Math.random().toString(36).substring(7),
    status: "processing",
    message: "Your video is being processed",
  });
}
