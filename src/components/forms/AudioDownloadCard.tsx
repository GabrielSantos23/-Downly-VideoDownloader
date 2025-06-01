import React, { useState, useRef } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Headphones,
  Loader2,
  RotateCw,
  Music,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { TaskStatus } from "@/app/page";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Define types for audio formats
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
  video_formats: any[];
  audio_formats: AudioFormat[];
  url: string;
}

// Form schema
const audioFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  format: z.enum(["mp3", "m4a", "ogg", "wav"]),
  quality: z.enum(["low", "medium", "high", "best"]),
  trim: z.boolean().default(false),
  trim_start: z.string().default("00:00"),
  trim_end: z.string().default("00:00"),
  selected_audio_format: z.string().optional(),
});

interface AudioDownloadCardProps {
  videoInfo: VideoInfoType | null;
  taskId: string | null;
  taskStatus: TaskStatus | null;
  setTaskId: (id: string | null) => void;
  setTaskStatus: (status: TaskStatus | null) => void;
  videoDuration: string;
  watchUrl: string;
  watchTrimStart: string;
  watchTrimEnd: string;
  setValue: any;
  isAnalyzing: boolean;
  register: any;
  handleSubmit: any;
  onSubmit: any;
}

export default function AudioDownloadCard({
  videoInfo,
  taskId,
  taskStatus,
  setTaskId,
  setTaskStatus,
  videoDuration,
  watchUrl,
  watchTrimStart,
  watchTrimEnd,
  setValue: parentSetValue,
  isAnalyzing,
  register: parentRegister,
  handleSubmit: parentHandleSubmit,
  onSubmit,
}: AudioDownloadCardProps) {
  // Create our own form context for audio
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof audioFormSchema>>({
    resolver: zodResolver(audioFormSchema) as any,
    defaultValues: {
      url: watchUrl,
      format: "mp3",
      quality: "high",
      trim: false,
      trim_start: watchTrimStart,
      trim_end: watchTrimEnd,
    },
  });

  const [isAudioQualityOpen, setIsAudioQualityOpen] = useState(false);
  const [selectedAudioFormat, setSelectedAudioFormat] =
    useState<AudioFormat | null>(null);
  const [showSummaryAndDownload, setShowSummaryAndDownload] = useState(false);
  const audioDropdownRef = useRef<HTMLDivElement>(null);

  // Update our form when parent values change
  React.useEffect(() => {
    setValue("url", watchUrl);
    setValue("trim_start", watchTrimStart);
    setValue("trim_end", watchTrimEnd);
  }, [watchUrl, watchTrimStart, watchTrimEnd, setValue]);

  // Calculate selected duration
  const selectedDuration = React.useMemo(() => {
    if (!watchTrimStart || !watchTrimEnd || !videoDuration)
      return videoDuration;

    // Convert time strings to seconds
    const startParts = watchTrimStart.split(":").map(Number);
    const endParts = watchTrimEnd.split(":").map(Number);

    let startSeconds = 0;
    let endSeconds = 0;

    if (startParts.length === 3) {
      // HH:MM:SS
      startSeconds = startParts[0] * 3600 + startParts[1] * 60 + startParts[2];
    } else {
      // MM:SS
      startSeconds = startParts[0] * 60 + startParts[1];
    }

    if (endParts.length === 3) {
      // HH:MM:SS
      endSeconds = endParts[0] * 3600 + endParts[1] * 60 + endParts[2];
    } else {
      // MM:SS
      endSeconds = endParts[0] * 60 + endParts[1];
    }

    const durationSeconds = endSeconds - startSeconds;

    if (durationSeconds <= 0) return "0s";

    if (durationSeconds < 60) {
      return `${durationSeconds}s`;
    } else {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      return `${minutes}m${seconds > 0 ? ` ${seconds}s` : ""}`;
    }
  }, [watchTrimStart, watchTrimEnd, videoDuration]);

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

  // Handle audio format selection
  const handleAudioFormatSelect = (format: AudioFormat) => {
    setSelectedAudioFormat(format);
    setIsAudioQualityOpen(false);
    setValue("selected_audio_format", format.bitrate);

    // Ensure format is one of the allowed values
    const audioFormat =
      format.ext === "mp3" ||
      format.ext === "m4a" ||
      format.ext === "ogg" ||
      format.ext === "wav"
        ? format.ext
        : "mp3";
    setValue("format", audioFormat);

    setShowSummaryAndDownload(true);

    // Map bitrate to quality enum
    let qualityValue: "low" | "medium" | "high" | "best";
    const bitrate = parseInt(format.bitrate.replace("kbps", ""));

    if (bitrate >= 256) {
      qualityValue = "best";
    } else if (bitrate >= 192) {
      qualityValue = "high";
    } else if (bitrate >= 128) {
      qualityValue = "medium";
    } else {
      qualityValue = "low";
    }

    setValue("quality", qualityValue);
  };

  // Handle quick trim selections
  const handleQuickTrim = (type: "full" | "first30" | "last30") => {
    if (!videoInfo || !videoInfo.duration) return;

    const duration = videoInfo.duration;

    if (type === "full") {
      setValue("trim_start", "00:00");
      setValue("trim_end", formatDuration(duration));
      toast.success("Set to full audio duration");
    } else if (type === "first30") {
      setValue("trim_start", "00:00");
      setValue("trim_end", formatDuration(Math.min(30, duration)));
      toast.success("Set to first 30 seconds");
    } else if (type === "last30") {
      const lastThirtyStart = Math.max(0, duration - 30);
      setValue("trim_start", formatDuration(lastThirtyStart));
      setValue("trim_end", formatDuration(duration));
      toast.success("Set to last 30 seconds");
    }
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    handleSubmit(async (data: z.infer<typeof audioFormSchema>) => {
      // Ensure required fields are present
      const processedData = {
        ...data,
        trim_start: data.trim_start || "",
        trim_end: data.trim_end || "",
        selected_audio_format: data.selected_audio_format || "",
        format: "mp3", // Force audio format
      };

      try {
        const response = await fetch("/api/audio/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedData),
        });

        if (!response.ok) {
          throw new Error("Failed to process audio");
        }

        const result = await response.json();
        setTaskId(result.task_id);
        setTaskStatus({
          status: "processing",
          progress: 0,
          message: "Starting audio download...",
        });

        // Poll for task status
        pollTaskStatus(result.task_id);
      } catch (err) {
        toast.error("Failed to process audio");
      }
    })();
  };

  // Poll task status
  const pollTaskStatus = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/task/${taskId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch task status");
        }

        const status = await response.json();
        setTaskStatus(status);

        if (["completed", "failed"].includes(status.status)) {
          clearInterval(interval);

          if (status.status === "completed") {
            toast.success("Audio download ready!");
          } else {
            toast.error("Audio download failed");
          }
        }
      } catch (err) {
        console.error("Error polling task status:", err);
      }
    }, 1000);
  };

  return (
    <Card className="bg-background">
      <CardContent>
        <div>
          <Label className="font-semibold text-lg flex items-center gap-2">
            <span className="text-2xl">
              <Music className="w-4 h-4" />
            </span>
            Audio Download
          </Label>
          <p className="text-muted-foreground">
            Extract audio only from the video in high quality.
          </p>
        </div>
        <div className="mt-4">
          <Label className=" text-lg flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Range
          </Label>
          <div className="flex items-center gap-2 mt-4 justify-between w-full">
            <div className="flex flex-col gap-2 w-full">
              <Label className="text-muted-foreground">Start time</Label>
              <Input
                type="text"
                placeholder="00:00"
                pattern="[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?"
                {...register("trim_start")}
                className="text-center"
              />
            </div>

            <span className="text-muted-foreground">to</span>
            <div className="flex flex-col gap-2 w-full">
              <Label className="text-muted-foreground">End time</Label>
              <Input
                type="text"
                placeholder="00:00"
                pattern="[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?"
                {...register("trim_end")}
                className="text-center"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Format: MM:SS (e.g., 01:30) or HH:MM:SS (e.g., 01:30:45)
          </p>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Label className="w-full text-sm mb-1">Quick trim options:</Label>
            <Button
              variant="outline"
              type="button"
              size="sm"
              onClick={() => handleQuickTrim("full")}
              className="flex-1"
            >
              <RotateCw className="w-4 h-4 mr-1" />
              Full audio
            </Button>
            <Button
              variant="outline"
              type="button"
              size="sm"
              onClick={() => handleQuickTrim("first30")}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-1" />
              First 30s
            </Button>
            <Button
              variant="outline"
              type="button"
              size="sm"
              onClick={() => handleQuickTrim("last30")}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-1" />
              Last 30s
            </Button>
          </div>
          <div className="mt-4">
            <p className="text-muted-foreground text-sm">
              Selected duration{" "}
              <span className="font-bold text-primary">{selectedDuration}</span>
            </p>
          </div>
          <div className="mt-4 w-full">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Headphones className="w-4 h-4" /> Audio quality
            </Label>
            <div className="w-full relative mt-2" ref={audioDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAudioQualityOpen(!isAudioQualityOpen)}
                className="w-full border rounded-lg px-4 py-3 flex items-center justify-between text-left hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-haspopup="listbox"
                aria-expanded={isAudioQualityOpen}
              >
                <div className="text-left flex-col flex gap-1">
                  {selectedAudioFormat ? (
                    <>
                      <span className="text-sm font-medium">
                        {selectedAudioFormat.bitrate}{" "}
                        {selectedAudioFormat.ext.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {selectedAudioFormat.file_size}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">
                      Select audio quality...
                    </span>
                  )}
                </div>
                {isAudioQualityOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Audio Dropdown Options */}
              {isAudioQualityOpen && videoInfo?.audio_formats && (
                <div
                  className="absolute z-50 mt-1 w-full border border-border rounded-lg overflow-hidden bg-card shadow-lg"
                  role="listbox"
                >
                  {videoInfo.audio_formats.map((format, index) => (
                    <button
                      key={format.bitrate}
                      type="button"
                      onClick={() => handleAudioFormatSelect(format)}
                      className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center justify-between ${
                        index !== videoInfo.audio_formats.length - 1
                          ? "border-b border-border"
                          : ""
                      } ${
                        selectedAudioFormat?.bitrate === format.bitrate
                          ? "bg-accent"
                          : ""
                      }`}
                      role="option"
                      aria-selected={
                        selectedAudioFormat?.bitrate === format.bitrate
                      }
                    >
                      <div className="flex flex-col">
                        <span className="text-base font-medium">
                          {format.bitrate}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {format.ext.toUpperCase()} • audio only
                        </span>
                      </div>
                      <span className="text-muted-foreground text-sm font-medium">
                        {format.file_size}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showSummaryAndDownload && (
            <>
              <div className="border mt-4 p-4 rounded-lg flex flex-col gap-2 text-sm">
                <div className="flex justify-between ">
                  <p className="text-muted-foreground ">Audio Quality:</p>
                  <span>
                    {selectedAudioFormat
                      ? `${
                          selectedAudioFormat.bitrate
                        } ${selectedAudioFormat.ext.toUpperCase()}`
                      : "Not selected"}
                  </span>
                </div>
                <div className="flex justify-between ">
                  <p className="text-muted-foreground ">Duration:</p>
                  <span>{selectedDuration}</span>
                </div>
                <div className="flex justify-between ">
                  <div className="flex justify-between gap-1 w-full">
                    <p className="text-muted-foreground ">File Size:</p>
                    <span>{selectedAudioFormat?.file_size || "Unknown"}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center flex-col gap-2">
                {taskStatus?.status !== "completed" ? (
                  <>
                    <Button
                      onClick={handleFormSubmit}
                      disabled={
                        isAnalyzing ||
                        !selectedAudioFormat ||
                        (taskStatus !== null &&
                          taskStatus.status === "processing")
                      }
                      className="w-full mt-4"
                    >
                      {taskStatus !== null &&
                      taskStatus.status === "processing" ? (
                        <div className="flex items-center justify-center w-full">
                          <div className="relative flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>
                              {taskStatus.progress > 0
                                ? `Processing ${taskStatus.progress}%`
                                : "Processing..."}
                            </span>
                          </div>
                          {taskStatus.progress > 0 && (
                            <div
                              className="absolute bottom-0 left-0 h-1 bg-primary rounded-full"
                              style={{ width: `${taskStatus.progress}%` }}
                            ></div>
                          )}
                        </div>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Audio
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {taskStatus?.status === "completed" &&
                      taskStatus?.download_url && (
                        <div className="flex justify-center w-full">
                          <Button asChild variant="default" className="w-full">
                            <a href={taskStatus.download_url} download>
                              <Download className="w-4 h-4 mr-1" />
                              Download Audio File
                            </a>
                          </Button>
                        </div>
                      )}
                  </>
                )}

                <span className="text-muted-foreground text-xs justify-center">
                  High quality audio extraction
                </span>
              </div>
              {taskStatus?.status === "failed" && taskStatus?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{taskStatus.error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
