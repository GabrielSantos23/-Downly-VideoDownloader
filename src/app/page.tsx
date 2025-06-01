"use client";

import React, { useState } from "react";
import { ThemeToggle } from "../components/theme/ThemeToggle";
import VideoForm from "../components/forms/VideoForm";

export interface TaskStatus {
  status: string;
  progress: number;
  message?: string;
  download_url?: string;
  error?: string;
}

export default function Home() {
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [videoTaskStatus, setVideoTaskStatus] = useState<TaskStatus | null>(
    null
  );
  const [audioTaskId, setAudioTaskId] = useState<string | null>(null);
  const [audioTaskStatus, setAudioTaskStatus] = useState<TaskStatus | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<string>("04:18");

  console.log(videoInfo);
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h2
              className={`${videoInfo ? "block" : "hidden"} text-xl font-bold`}
            >
              Downly
            </h2>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <section
        id="download-section"
        className="flex flex-col items-center justify-center py-8 px-4 mx-auto w-full"
      >
        <VideoForm
          videoInfo={videoInfo}
          isAnalyzing={isAnalyzing}
          videoTaskId={videoTaskId}
          videoTaskStatus={videoTaskStatus}
          audioTaskId={audioTaskId}
          audioTaskStatus={audioTaskStatus}
          error={error}
          setVideoInfo={setVideoInfo}
          setIsAnalyzing={setIsAnalyzing}
          setVideoTaskId={setVideoTaskId}
          setVideoTaskStatus={setVideoTaskStatus}
          setAudioTaskId={setAudioTaskId}
          setAudioTaskStatus={setAudioTaskStatus}
          setError={setError}
          setVideoDuration={setVideoDuration}
          videoDuration={videoDuration}
        />
      </section>
    </div>
  );
}
