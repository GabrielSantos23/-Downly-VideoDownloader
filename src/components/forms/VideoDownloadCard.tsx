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
  Video,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { TaskStatus } from "@/app/page";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
  format: z.enum(["mp4", "mp3", "mkv"]),
  quality: z.enum(["low", "medium", "high", "best"]),
  trim: z.boolean().default(false),
  trim_start: z.string().optional(),
  trim_end: z.string().optional(),
  selected_video_format: z.string().optional(),
  selected_audio_format: z.string().optional(),
});

interface VideoDownloadCardProps {
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

export default function VideoDownloadCard({
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
}: VideoDownloadCardProps) {
  // Create our own form context for video
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof videoFormSchema>>({
    resolver: zodResolver(videoFormSchema) as any,
    defaultValues: {
      url: watchUrl,
      format: "mp4",
      quality: "high",
      trim: false,
      trim_start: watchTrimStart,
      trim_end: watchTrimEnd,
    },
  });

  const [isVideoQualityOpen, setIsVideoQualityOpen] = useState(false);
  const [isAudioQualityOpen, setIsAudioQualityOpen] = useState(false);
  const [selectedVideoFormat, setSelectedVideoFormat] =
    useState<VideoFormat | null>(null);
  const [selectedAudioFormat, setSelectedAudioFormat] =
    useState<AudioFormat | null>(null);
  const [showAudioSelection, setShowAudioSelection] = useState(false);
  const [showSummaryAndDownload, setShowSummaryAndDownload] = useState(false);
  const videoDropdownRef = useRef<HTMLDivElement>(null);
  const audioDropdownRef = useRef<HTMLDivElement>(null);

  // Update our form when parent values change
  React.useEffect(() => {
    setValue("url", watchUrl);
    setValue("trim_start", watchTrimStart);
    setValue("trim_end", watchTrimEnd);
  }, [watchUrl, watchTrimStart, watchTrimEnd, setValue]);

  // Calculate total size
  const totalSize = React.useMemo(() => {
    if (!selectedVideoFormat && !selectedAudioFormat) return "Unknown";

    const videoSize = selectedVideoFormat?.file_size || "0 MB";
    const audioSize = selectedAudioFormat?.file_size || "0 MB";

    // Extract numeric values
    const videoSizeNum = parseFloat(videoSize.replace(" MB", "")) || 0;
    const audioSizeNum = parseFloat(audioSize.replace(" MB", "")) || 0;

    const totalSizeNum = videoSizeNum + audioSizeNum;
    return `${totalSizeNum.toFixed(1)} MB`;
  }, [selectedVideoFormat, selectedAudioFormat]);

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

  // Handle video format selection
  const handleVideoFormatSelect = (format: VideoFormat) => {
    setSelectedVideoFormat(format);
    setIsVideoQualityOpen(false);
    setValue("selected_video_format", format.resolution);

    // Ensure format is one of the allowed values
    const videoFormat =
      format.ext === "mp4" || format.ext === "mkv" ? format.ext : "mp4";
    setValue("format", videoFormat);

    setShowAudioSelection(true);

    // Map resolution to quality enum
    let qualityValue: "low" | "medium" | "high" | "best";
    const resolution = parseInt(format.resolution.replace("p", ""));

    if (resolution >= 1080) {
      qualityValue = "best";
    } else if (resolution >= 720) {
      qualityValue = "high";
    } else if (resolution >= 480) {
      qualityValue = "medium";
    } else {
      qualityValue = "low";
    }

    setValue("quality", qualityValue);
  };

  // Handle audio format selection
  const handleAudioFormatSelect = (format: AudioFormat) => {
    setSelectedAudioFormat(format);
    setIsAudioQualityOpen(false);
    setValue("selected_audio_format", format.bitrate);
    setShowSummaryAndDownload(true);
  };

  // Handle quick trim selections
  const handleQuickTrim = (type: "full" | "first30" | "last30") => {
    if (!videoInfo || !videoInfo.duration) return;

    const duration = videoInfo.duration;

    if (type === "full") {
      setValue("trim_start", "00:00");
      setValue("trim_end", formatDuration(duration));
      toast.success("Set to full video duration");
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
    handleSubmit(async (data: z.infer<typeof videoFormSchema>) => {
      // Ensure required fields are present
      const processedData = {
        ...data,
        trim_start: data.trim_start || "",
        trim_end: data.trim_end || "",
        selected_video_format: data.selected_video_format || "",
        selected_audio_format: data.selected_audio_format || "",
      };

      try {
        const response = await fetch("/api/video/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedData),
        });

        if (!response.ok) {
          throw new Error("Failed to process video");
        }

        const result = await response.json();
        setTaskId(result.task_id);
        setTaskStatus({
          status: "processing",
          progress: 0,
          message: "Starting video download...",
        });

        // Poll for task status
        pollTaskStatus(result.task_id);
      } catch (err) {
        toast.error("Failed to process video");
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
            toast.success("Video download ready!");
          } else {
            toast.error("Video download failed");
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
              <Video className="w-4 h-4" />
            </span>
            Video Download
          </Label>
          <p className="text-muted-foreground">
            Download the video with automatic paired audio.
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
              Full video
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
              <Video className="w-4 h-4" /> Video quality
            </Label>
            <div className="w-full relative mt-2" ref={videoDropdownRef}>
              <button
                type="button"
                onClick={() => setIsVideoQualityOpen(!isVideoQualityOpen)}
                className="w-full border rounded-lg px-4 py-3 flex items-center justify-between text-left hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-haspopup="listbox"
                aria-expanded={isVideoQualityOpen}
              >
                <div className="text-left">
                  {selectedVideoFormat ? (
                    <>
                      <div className="text-sm font-medium">
                        {selectedVideoFormat.resolution}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {selectedVideoFormat.ext.toUpperCase()} • video only •{" "}
                        {selectedVideoFormat.file_size}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">
                      Select video quality...
                    </span>
                  )}
                </div>
                {isVideoQualityOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Dropdown Options */}
              {isVideoQualityOpen && videoInfo?.video_formats && (
                <div
                  className="absolute z-50 mt-1 w-full border border-border rounded-lg overflow-hidden bg-card shadow-lg"
                  role="listbox"
                >
                  {videoInfo.video_formats.map((format, index) => (
                    <button
                      key={format.resolution}
                      type="button"
                      onClick={() => handleVideoFormatSelect(format)}
                      className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center justify-between ${
                        index !== videoInfo.video_formats.length - 1
                          ? "border-b border-border"
                          : ""
                      } ${
                        selectedVideoFormat?.resolution === format.resolution
                          ? "bg-accent"
                          : ""
                      }`}
                      role="option"
                      aria-selected={
                        selectedVideoFormat?.resolution === format.resolution
                      }
                    >
                      <div className="flex flex-col">
                        <span className="text-base font-medium">
                          {format.resolution}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {format.ext.toUpperCase()} • video only
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

          {showAudioSelection && (
            <div className="mt-4">
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
          )}

          {showSummaryAndDownload && (
            <>
              <div className="border mt-4 p-4 rounded-lg flex flex-col gap-2 text-sm">
                <div className="flex justify-between ">
                  <p className="text-muted-foreground ">Video Quality:</p>
                  <span>
                    {selectedVideoFormat
                      ? `${
                          selectedVideoFormat.resolution
                        } ${selectedVideoFormat.ext.toUpperCase()}`
                      : "Not selected"}
                  </span>
                </div>
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
                    <p className="text-muted-foreground ">Total Size:</p>
                    <span>{totalSize}</span>
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
                        !selectedVideoFormat ||
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
                          Download Video
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
                              Download File
                            </a>
                          </Button>
                        </div>
                      )}
                  </>
                )}

                <span className="text-muted-foreground text-xs justify-center">
                  Video and audio will be combined automatically
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
