"use client";

import React, { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2, Send, User, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { TaskStatus } from "@/app/page";
import { Separator } from "../ui/separator";
import VideoDownloadCard from "./VideoDownloadCard";
import AudioDownloadCard from "./AudioDownloadCard";

// Define types for video formats
interface VideoFormat {
  resolution: string;
  ext: string;
  format_note: string;
  file_size: string;
}

interface AudioFormat {
  bitrate: string;
  ext: string;
  file_size: string;
}

interface VideoInfoType {
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
  video_formats: VideoFormat[];
  audio_formats: AudioFormat[];
  url: string;
}

// Form schema
const videoFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  format: z.enum(["mp4", "mp3", "mkv", "m4a", "ogg", "wav"]),
  quality: z.enum(["low", "medium", "high", "best"]),
  trim: z.boolean().default(false),
  trim_start: z.string().default("00:00"),
  trim_end: z.string().default("00:00"),
  selected_video_format: z.string().optional(),
  selected_audio_format: z.string().optional(),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

export default function VideoForm({
  videoInfo,
  isAnalyzing,
  videoTaskId,
  videoTaskStatus,
  audioTaskId,
  audioTaskStatus,
  error,
  setVideoInfo,
  setIsAnalyzing,
  setVideoTaskId,
  setVideoTaskStatus,
  setAudioTaskId,
  setAudioTaskStatus,
  setError,
  setVideoDuration,
  videoDuration,
}: {
  videoInfo: VideoInfoType | null;
  isAnalyzing: boolean;
  videoTaskId: string | null;
  videoTaskStatus: TaskStatus | null;
  audioTaskId: string | null;
  audioTaskStatus: TaskStatus | null;
  error: string | null;
  setVideoInfo: (info: VideoInfoType | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setVideoTaskId: (id: string | null) => void;
  setVideoTaskStatus: (status: TaskStatus | null) => void;
  setAudioTaskId: (id: string | null) => void;
  setAudioTaskStatus: (status: TaskStatus | null) => void;
  setError: (error: string | null) => void;
  setVideoDuration: (duration: string) => void;
  videoDuration: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof videoFormSchema>>({
    resolver: zodResolver(videoFormSchema) as any,
    defaultValues: {
      url: "https://youtu.be/4TYv2PhG89A?si=EH_5ocmXtQZTnYiP",
      format: "mp4",
      quality: "high",
      trim: false,
      trim_start: "00:00",
      trim_end: "04:18",
    },
  });

  const watchUrl = watch("url");
  const watchTrimStart = watch("trim_start");
  const watchTrimEnd = watch("trim_end");

  const handleAnalyzeUrl = async () => {
    if (!watchUrl) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Make actual API call to get video info
      const response = await fetch("/api/video/info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: watchUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch video info");
      }

      const data = await response.json();

      // Check if the API returned an error message
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
        setVideoInfo(null);
        return;
      }

      // Check if we have any video formats
      if (data.video_formats && data.video_formats.length === 0) {
        setError(
          "No video formats available. This video might be unavailable or region-restricted."
        );
        toast.error("No video formats available");
        setVideoInfo(null);
        return;
      }

      setVideoInfo(data);

      // Set video duration
      if (data.duration) {
        const formattedDuration = formatDuration(data.duration);
        setVideoDuration(formattedDuration);

        // Set default trim values
        setValue("trim_start", "00:00");
        setValue("trim_end", formattedDuration);
      }

      toast.success("Video information loaded successfully");
    } catch (err) {
      setError("Failed to analyze video. Please check the URL and try again.");
      toast.error("Failed to analyze video");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format duration from seconds to MM:SS or HH:MM:SS
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Validate time format
  const validateTimeFormat = (time: string): boolean => {
    // Check if it matches MM:SS or HH:MM:SS format
    const regex = /^([0-9]{1,2}):([0-5][0-9])(?::([0-5][0-9]))?$/;
    return regex.test(time);
  };

  // Handle form submission
  const onSubmit: SubmitHandler<z.infer<typeof videoFormSchema>> = async (
    data
  ) => {
    setError(null);

    // Validate time inputs
    if (!validateTimeFormat(data.trim_start)) {
      setError("Invalid start time format. Use MM:SS or HH:MM:SS");
      toast.error("Invalid start time format");
      return;
    }

    if (!validateTimeFormat(data.trim_end)) {
      setError("Invalid end time format. Use MM:SS or HH:MM:SS");
      toast.error("Invalid end time format");
      return;
    }

    // Create request payload
    const payload = {
      url: data.url,
      format: data.format,
      quality: data.quality,
      trim_start: data.trim_start,
      trim_end: data.trim_end,
      selected_video_format: data.selected_video_format || "",
      selected_audio_format: data.selected_audio_format || "",
    };

    try {
      const response = await fetch("/api/video/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to process video");
      }

      const result = await response.json();
      setVideoTaskId(result.task_id);
      setVideoTaskStatus({
        status: "processing",
        progress: 0,
        message: "Starting download...",
      });

      // Poll for task status
      pollVideoTaskStatus(result.task_id);
    } catch (err) {
      setError("Failed to process video. Please try again.");
      toast.error("Failed to process video");
    }
  };

  // Poll task status
  const pollVideoTaskStatus = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/task/${taskId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch task status");
        }

        const status = await response.json();
        setVideoTaskStatus(status);

        if (["completed", "failed"].includes(status.status)) {
          clearInterval(interval);

          if (status.status === "completed") {
            toast.success("Download ready!");
          } else {
            toast.error("Download failed");
          }
        }
      } catch (err) {
        console.error("Error polling task status:", err);
      }
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full ">
      <div className="space-y-4">
        <div
          className={`flex gap-2 w-full justify-center  ${
            videoInfo ? "" : "h-[calc(100vh-20rem)]"
          }`}
        >
          <div className="relative w-full flex flex-col gap-4 justify-center items-center">
            {!videoInfo && (
              <>
                <h2 className="text-6xl font-mono">Downly</h2>
                <p className="text-muted-foreground">
                  download youtube, intagram and twitter videos effortlessly
                </p>
              </>
            )}

            {/* Container relativo só pro input e botão */}
            <div
              className={`${
                videoInfo ? "w-full" : "w-full max-w-5xl"
              } relative w-full max-w-5xl`}
            >
              <Input
                type="url"
                id="video-url"
                placeholder="Paste YouTube, Instagram or Twitter video link here..."
                className={cn(
                  "h-12 text-lg pr-24 rounded-lg w-full",
                  errors.url && "border-destructive",
                  videoInfo ? "h-12" : "h-16 "
                )}
                {...register("url")}
              />
              <Button
                type="button"
                variant="default"
                onClick={handleAnalyzeUrl}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg"
                disabled={isAnalyzing || !watchUrl}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        {errors.url && (
          <p className="text-sm font-medium text-destructive">
            {errors.url.message}
          </p>
        )}
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}
      </div>

      {videoInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Video Player */}
          <div className="md:col-span-2">
            <Card className="overflow-hidden bg-background mb-4">
              <CardContent className="">
                <p className="">{videoInfo.title || "Video preview"}</p>
                <p className="text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {videoInfo.channel || "Unknown channel"}
                </p>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatDuration(videoInfo.duration || 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden bg-background">
              <CardContent className="">
                <div className="aspect-video">
                  {videoInfo.thumbnail ? (
                    <div className="relative w-full h-full ">
                      <ReactPlayer
                        url={watchUrl}
                        width="100%"
                        height="100%"
                        controls
                        light={videoInfo.thumbnail}
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">
                        {videoInfo.title || "Video preview"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Right Column - Controls */}
          <div className="space-y-6 md:border-l md:pl-4 md:border-border/30">
            <VideoDownloadCard
              videoInfo={videoInfo}
              taskId={videoTaskId}
              taskStatus={videoTaskStatus}
              setTaskId={setVideoTaskId}
              setTaskStatus={setVideoTaskStatus}
              videoDuration={videoDuration}
              watchUrl={watchUrl}
              watchTrimStart={watchTrimStart}
              watchTrimEnd={watchTrimEnd}
              setValue={setValue}
              isAnalyzing={isAnalyzing}
              register={register}
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
            />

            <AudioDownloadCard
              videoInfo={videoInfo}
              taskId={audioTaskId}
              taskStatus={audioTaskStatus}
              setTaskId={setAudioTaskId}
              setTaskStatus={setAudioTaskStatus}
              videoDuration={videoDuration}
              watchUrl={watchUrl}
              watchTrimStart={watchTrimStart}
              watchTrimEnd={watchTrimEnd}
              setValue={setValue}
              isAnalyzing={isAnalyzing}
              register={register}
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      )}

      {/* Task Status - Only show for pending/failed tasks */}
      {videoTaskId &&
        videoTaskStatus &&
        videoTaskStatus.status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>Video Processing Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge variant="outline" className="capitalize">
                  {videoTaskStatus.status}
                </Badge>
              </div>

              {videoTaskStatus.message && (
                <p className="text-muted-foreground">
                  {videoTaskStatus.message}
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {audioTaskId &&
        audioTaskStatus &&
        audioTaskStatus.status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>Audio Processing Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge variant="outline" className="capitalize">
                  {audioTaskStatus.status}
                </Badge>
              </div>

              {audioTaskStatus.message && (
                <p className="text-muted-foreground">
                  {audioTaskStatus.message}
                </p>
              )}
            </CardContent>
          </Card>
        )}
    </form>
  );
}
