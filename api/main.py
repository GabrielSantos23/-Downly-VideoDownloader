from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.logger import logger as fastapi_logger
from pydantic import BaseModel, HttpUrl
import os
import subprocess
import uuid
import shutil
from pathlib import Path
from typing import Optional, List
import logging
import json
import sys
import traceback
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time

# For Windows compatibility
import platform
IS_WINDOWS = platform.system() == "Windows"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)
fastapi_logger.handlers = logger.handlers
fastapi_logger.setLevel(logging.INFO)

app = FastAPI(
    title="Social Media Video Downloader API",
    description="API for downloading and processing videos from social media platforms",
    version="1.0.0",
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for storing videos
DOWNLOAD_DIR = Path("./downloads")
TEMP_DIR = Path("./temp")
PROCESSED_DIR = Path("./processed")

os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Serve static files
app.mount("/downloads", StaticFiles(directory=str(PROCESSED_DIR)), name="downloads")

# Store active tasks
active_tasks = {}

# Thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=4)

class VideoInfo(BaseModel):
    url: HttpUrl
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[int] = None
    formats: Optional[List[str]] = None

    class Config:
        schema_extra = {
            "example": {
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "Never Gonna Give You Up",
                "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                "duration": 212,
                "formats": ["144p", "240p", "360p", "480p", "720p", "1080p"]
            }
        }

class VideoProcessRequest(BaseModel):
    url: HttpUrl
    format: str
    quality: str
    trim_start: Optional[str] = None
    trim_end: Optional[str] = None
    selected_video_format: Optional[str] = None
    selected_audio_format: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "mp4",
                "quality": "high",
                "trim_start": "00:00:30",
                "trim_end": "00:01:30",
                "selected_video_format": "720p",
                "selected_audio_format": "128kbps"
            }
        }

class TaskStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    message: Optional[str] = None
    download_url: Optional[str] = None
    error: Optional[str] = None

def run_subprocess_sync(command):
    """Synchronous subprocess wrapper for thread pool"""
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        return result
    except subprocess.TimeoutExpired:
        logger.error(f"Command timed out: {' '.join(command)}")
        raise
    except Exception as e:
        logger.error(f"Subprocess error: {e}")
        raise

async def get_video_info_async(url: str):
    """Async wrapper for video info fetching with detailed format information"""
    # Enhanced command for more detailed info retrieval
    command = [
        "yt-dlp",
        "--dump-json",
        "--no-playlist",
        "--skip-download",
        "--no-warnings",
        "--quiet",
        str(url)
    ]
    
    logger.info(f"Fetching video info for: {url}")
    
    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(executor, run_subprocess_sync, command)
        
        if result.returncode != 0:
            raise subprocess.CalledProcessError(result.returncode, command, result.stderr)
            
        video_data = json.loads(result.stdout)
        
        # Extract formats with more detailed information
        formats = []
        seen_resolutions = set()
        
        # Process video formats to get unique resolutions with their details
        for f in video_data.get("formats", []):
            # Only include formats with height (video)
            if f.get("height") and f.get("ext") in ["mp4", "webm"]:
                resolution = f"{f.get('height')}p"
                
                # Skip duplicates
                if resolution in seen_resolutions:
                    continue
                    
                seen_resolutions.add(resolution)
                
                # Calculate approximate file size if available
                file_size = "Unknown"
                if f.get("filesize"):
                    size_mb = round(f.get("filesize") / (1024 * 1024), 1)
                    file_size = f"{size_mb} MB"
                
                formats.append({
                    "resolution": resolution,
                    "ext": f.get("ext", "mp4"),
                    "format_note": f.get("format_note", ""),
                    "file_size": file_size
                })
        
        # Sort formats by resolution (height) in descending order
        formats = sorted(formats, key=lambda x: int(x["resolution"].replace("p", "")), reverse=True)
        
        # Add audio formats
        audio_formats = []
        seen_audio_bitrates = set()
        
        for f in video_data.get("formats", []):
            # Only include audio-only formats
            if f.get("acodec") != "none" and f.get("vcodec") == "none":
                bitrate = f.get("abr", 0)
                if bitrate in seen_audio_bitrates:
                    continue
                    
                seen_audio_bitrates.add(bitrate)
                
                # Calculate approximate file size if available
                file_size = "Unknown"
                if f.get("filesize"):
                    size_mb = round(f.get("filesize") / (1024 * 1024), 1)
                    file_size = f"{size_mb} MB"
                
                audio_formats.append({
                    "bitrate": f"{int(bitrate)}kbps" if bitrate else "Unknown",
                    "ext": f.get("ext", "m4a"),
                    "file_size": file_size
                })
        
        # Sort audio formats by bitrate in descending order
        audio_formats = sorted(
            audio_formats, 
            key=lambda x: int(x["bitrate"].replace("kbps", "")) if x["bitrate"] != "Unknown" else 0, 
            reverse=True
        )
        
        # Return enhanced video info
        return {
            "title": video_data.get("title", "Unknown"),
            "thumbnail": video_data.get("thumbnail"),
            "duration": video_data.get("duration"),
            "channel": video_data.get("channel", "Unknown"),
            "video_formats": formats[:8],  # Limit to top 8 formats
            "audio_formats": audio_formats[:3],  # Limit to top 3 audio formats
            "url": str(url)
        }
        
    except json.JSONDecodeError:
        logger.error("Failed to parse video data")
        # Return minimal info if parsing fails
        return {
            "title": "Video",
            "thumbnail": None,
            "duration": None,
            "channel": "Unknown",
            "video_formats": [{"resolution": "best", "ext": "mp4", "format_note": "", "file_size": "Unknown"}],
            "audio_formats": [{"bitrate": "128kbps", "ext": "m4a", "file_size": "Unknown"}],
            "url": str(url)
        }
    except Exception as e:
        logger.error(f"Error fetching video info: {e}")
        # Return minimal info to avoid complete failure
        return {
            "title": "Video",
            "thumbnail": None,
            "duration": None,
            "channel": "Unknown",
            "video_formats": [{"resolution": "best", "ext": "mp4", "format_note": "", "file_size": "Unknown"}],
            "audio_formats": [{"bitrate": "128kbps", "ext": "m4a", "file_size": "Unknown"}],
            "url": str(url)
        }

@app.get("/")
def read_root():
    return {"message": "Welcome to Social Media Video Downloader API"}

@app.post("/video/info")
async def get_video_info(video_info: VideoInfo, request: Request):
    """
    Fetch information about a video from its URL - Now Async and Optimized
    """
    logger.info(f"Received video info request for URL: {video_info.url}")
    
    try:
        # Use async function for non-blocking info retrieval
        info = await get_video_info_async(str(video_info.url))
        return info
        
    except Exception as e:
        logger.error(f"Error in video info endpoint: {e}")
        # Return basic info to avoid complete failure
        return {
            "title": "Video",
            "thumbnail": None,
            "duration": None,
            "formats": ["best"],
            "url": str(video_info.url)
        }

@app.post("/video/process")
async def process_video(request: VideoProcessRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    active_tasks[task_id] = {"status": "pending", "progress": 0, "message": "Task queued"}
    
    # Start processing immediately in background
    background_tasks.add_task(
        download_and_process_video, 
        task_id, 
        str(request.url), 
        request.format, 
        request.quality, 
        request.trim_start, 
        request.trim_end,
        request.selected_video_format,
        request.selected_audio_format
    )
    
    return {"task_id": task_id, "status": "pending", "message": "Video processing started"}

@app.post("/audio/process")
async def process_audio(request: VideoProcessRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    active_tasks[task_id] = {"status": "pending", "progress": 0, "message": "Audio task queued"}
    
    # Force audio format
    audio_format = request.format
    if audio_format not in ["mp3", "m4a", "ogg", "wav"]:
        audio_format = "mp3"  # Default to mp3 if invalid format
    
    # Start processing immediately in background
    background_tasks.add_task(
        download_and_process_audio, 
        task_id, 
        str(request.url), 
        audio_format, 
        request.quality, 
        request.trim_start, 
        request.trim_end,
        request.selected_audio_format
    )
    
    return {"task_id": task_id, "status": "pending", "message": "Audio processing started"}

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return active_tasks[task_id]

def get_optimized_format_selector(quality: str, selected_video_format: Optional[str] = None, selected_audio_format: Optional[str] = None) -> str:
    """Get optimized format selector for yt-dlp based on quality or specific formats"""
    # If specific formats are selected, use them
    if selected_video_format:
        # Extract resolution number from format (e.g., "720p" -> 720)
        try:
            resolution = int(selected_video_format.replace("p", ""))
            
            # Build format selector with exact height
            video_selector = f"bestvideo[height={resolution}]"
            audio_selector = "bestaudio"
            
            if selected_audio_format and "kbps" in selected_audio_format:
                # Extract bitrate from format (e.g., "128kbps" -> 128)
                try:
                    bitrate = int(selected_audio_format.replace("kbps", ""))
                    # Use approximate matching for audio bitrate
                    audio_selector = f"bestaudio[abr<={bitrate+10}][abr>={bitrate-10}]"
                except ValueError:
                    pass
                
            return f"{video_selector}+{audio_selector}/best[height={resolution}]/best"
        except ValueError:
            pass
    
    # Fall back to quality-based selectors
    format_selectors = {
        "best": "best[ext=mp4]/best",
        "high": "best[height<=1080][ext=mp4]/best[height<=1080]",
        "medium": "best[height<=720][ext=mp4]/best[height<=720]", 
        "low": "best[height<=480][ext=mp4]/best[height<=480]"
    }
    return format_selectors.get(quality, "best[ext=mp4]/best")

async def download_and_process_video(task_id: str, url: str, output_format: str, 
                                quality: str, trim_start: Optional[str] = None,
                                trim_end: Optional[str] = None,
                                selected_video_format: Optional[str] = None,
                                selected_audio_format: Optional[str] = None):
    """
    Optimized background task for video download and processing with support for specific formats
    """
    try:
        # Update task status
        active_tasks[task_id] = {
            "status": "downloading",
            "progress": 5,
            "message": "Starting download..."
        }
        
        # Create unique filename
        filename = f"{task_id}.%(ext)s"
        output_path = DOWNLOAD_DIR / filename
        
        # Get format selector based on quality or specific formats
        format_selector = get_optimized_format_selector(
            quality, 
            selected_video_format, 
            selected_audio_format
        )
        
        # Progress update function for background thread
        def progress_hook(d):
            if d['status'] == 'downloading':
                try:
                    # Calculate download progress
                    downloaded = d.get('downloaded_bytes', 0)
                    total = d.get('total_bytes', 0) or d.get('total_bytes_estimate', 0)
                    
                    if total > 0:
                        percent = int((downloaded / total) * 40) + 5  # Scale to 5-45%
                        active_tasks[task_id]["progress"] = percent
                        active_tasks[task_id]["message"] = f"Downloading video... {percent}%"
                except Exception as e:
                    logger.error(f"Error in progress hook: {e}")
            
            elif d['status'] == 'finished':
                active_tasks[task_id]["progress"] = 45
                active_tasks[task_id]["message"] = "Download complete, starting processing..."
        
        # Highly optimized yt-dlp command with progress
        download_cmd = [
            "yt-dlp",
            "--no-playlist",
            "--no-warnings",
            # Fast user agent
            "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            # Minimize retries for speed
            "--retries", "2",
            "--fragment-retries", "2",
            # Fast output template
            "-o", str(output_path),
            # Optimized format selection
            "-f", format_selector,
            # Progress JSON output
            "--newline",
            "--progress-template", "download:%(progress.downloaded_bytes)s/%(progress.total_bytes)s",
            # Speed optimizations
            "--no-check-certificate",
            "--prefer-insecure",
            url
        ]
        
        # Update progress
        active_tasks[task_id]["progress"] = 10
        active_tasks[task_id]["message"] = "Downloading video..."
        
        # Execute download in thread pool
        logger.info(f"Starting download: {task_id} with format: {format_selector}")
        loop = asyncio.get_event_loop()
        
        # Windows-compatible process runner with progress monitoring
        async def run_with_progress(cmd):
            if IS_WINDOWS:
                # Use ThreadPoolExecutor for Windows
                def run_process():
                    # Create process with pipe for stdout
                    process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        bufsize=1,
                        universal_newlines=True
                    )
                    
                    # Monitor progress
                    for line in process.stdout:
                        try:
                            line_text = line.strip()
                            if line_text.startswith("download:"):
                                parts = line_text.split(":")
                                if len(parts) > 1 and "/" in parts[1]:
                                    downloaded, total = parts[1].split("/")
                                    if downloaded and total and int(total) > 0:
                                        percent = min(45, 5 + int((int(downloaded) / int(total)) * 40))
                                        active_tasks[task_id]["progress"] = percent
                                        active_tasks[task_id]["message"] = f"Downloading video... {percent}%"
                        except Exception as e:
                            logger.error(f"Error parsing progress: {e}")
                    
                    # Wait for process to complete
                    returncode = process.wait()
                    return returncode, process.stderr.read() if process.stderr else ""
                
                # Run in thread pool
                returncode, stderr = await loop.run_in_executor(executor, run_process)
                return returncode
            else:
                # Use asyncio for Unix-based systems
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                # Monitor progress
                while True:
                    if process.stdout:
                        line = await process.stdout.readline()
                        if not line:
                            break
                        
                        try:
                            line_text = line.decode('utf-8').strip()
                            if line_text.startswith("download:"):
                                parts = line_text.split(":")
                                if len(parts) > 1 and "/" in parts[1]:
                                    downloaded, total = parts[1].split("/")
                                    if downloaded and total and int(total) > 0:
                                        percent = min(45, 5 + int((int(downloaded) / int(total)) * 40))
                                        active_tasks[task_id]["progress"] = percent
                                        active_tasks[task_id]["message"] = f"Downloading video... {percent}%"
                        except Exception as e:
                            logger.error(f"Error parsing progress: {e}")
                
                await process.wait()
                return process.returncode
        
        try:
            # Run with progress monitoring
            returncode = await run_with_progress(download_cmd)
            
            if returncode != 0:
                logger.error(f"Download failed with code {returncode}")
                active_tasks[task_id] = {
                    "status": "failed",
                    "progress": 0,
                    "message": "Download failed",
                    "error": "Process exited with non-zero code"
                }
                return
                
        except asyncio.TimeoutError:
            active_tasks[task_id] = {
                "status": "failed",
                "progress": 0,
                "message": "Download timeout",
                "error": "Download took too long"
            }
            return

        # Find downloaded file
        downloaded_files = list(DOWNLOAD_DIR.glob(f"{task_id}.*"))
        if not downloaded_files:
            active_tasks[task_id] = {
                "status": "failed", 
                "progress": 0, 
                "message": "Download failed - no file found"
            }
            return

        downloaded_file = downloaded_files[0]
        active_tasks[task_id] = {
            "status": "processing", 
            "progress": 50, 
            "message": "Processing video..."
        }

        # Prepare output
        output_filename = f"{task_id}.{output_format}"
        final_output = PROCESSED_DIR / output_filename

        # Optimized FFmpeg command
        ffmpeg_cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(downloaded_file)]
        
        # Add trimming if specified
        if trim_start and trim_end:
            ffmpeg_cmd.extend(["-ss", trim_start, "-to", trim_end])
        
        # Format-specific optimizations
        if output_format == "mp4":
            ffmpeg_cmd.extend([
                "-c:v", "libx264", 
                "-preset", "fast",  # Fast encoding preset
                "-c:a", "aac", 
                "-movflags", "+faststart"  # Optimize for web
            ])
        elif output_format == "mp3":
            ffmpeg_cmd.extend(["-vn", "-ar", "44100", "-ac", "2", "-b:a", "192k"])
        elif output_format == "mkv":
            ffmpeg_cmd.extend(["-c", "copy"])  # Just copy streams

        ffmpeg_cmd.append(str(final_output))

        # Update progress at different stages of processing
        active_tasks[task_id]["progress"] = 60
        active_tasks[task_id]["message"] = "Converting video format..."

        # Execute FFmpeg with progress updates - Windows compatible
        if IS_WINDOWS:
            # Run FFmpeg in thread pool for Windows
            async def run_ffmpeg_with_progress():
                process = subprocess.Popen(
                    ffmpeg_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Update progress periodically during FFmpeg processing
                start_time = time.time()
                while process.poll() is None:
                    # Update progress from 60% to 90% during FFmpeg processing
                    elapsed = time.time() - start_time
                    # Assume FFmpeg will take about 30 seconds max
                    progress = min(90, 60 + int(elapsed / 30 * 30))
                    active_tasks[task_id]["progress"] = progress
                    active_tasks[task_id]["message"] = f"Processing video... {progress}%"
                    
                    # Wait a bit before checking again
                    await asyncio.sleep(1)
                
                # Get return code and stderr
                returncode = process.returncode
                stderr = process.stderr.read() if process.stderr else b""
                return returncode, stderr.decode('utf-8', errors='ignore')
            
            returncode, stderr = await run_ffmpeg_with_progress()
        else:
            # Use asyncio for Unix-based systems
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Update progress periodically during FFmpeg processing
            start_time = time.time()
            while process.returncode is None:
                # Update progress from 60% to 90% during FFmpeg processing
                elapsed = time.time() - start_time
                # Assume FFmpeg will take about 30 seconds max
                progress = min(90, 60 + int(elapsed / 30 * 30))
                active_tasks[task_id]["progress"] = progress
                active_tasks[task_id]["message"] = f"Processing video... {progress}%"
                
                # Check if process has completed
                await asyncio.sleep(1)
                if process.returncode is not None:
                    break
            
            await process.wait()
            stderr_data = await process.stderr.read()
            stderr = stderr_data.decode('utf-8', errors='ignore')
            returncode = process.returncode
        
        if returncode != 0:
            error_msg = stderr if stderr else "Unknown error"
            active_tasks[task_id] = {
                "status": "failed", 
                "progress": 0, 
                "message": "Processing failed", 
                "error": error_msg
            }
            return

        # Cleanup original file
        downloaded_file.unlink(missing_ok=True)

        # Success!
        active_tasks[task_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Ready for download",
            "download_url": f"/downloads/{output_filename}"
        }
        
        logger.info(f"Task {task_id} completed successfully")

    except Exception as e:
        logger.error(f"Task {task_id} failed: {traceback.format_exc()}")
        active_tasks[task_id] = {
            "status": "failed",
            "progress": 0,
            "message": "Processing failed",
            "error": str(e)
        }

async def download_and_process_audio(task_id: str, url: str, output_format: str, 
                                quality: str, trim_start: Optional[str] = None,
                                trim_end: Optional[str] = None,
                                selected_audio_format: Optional[str] = None):
    """
    Optimized background task for audio download and processing
    """
    try:
        # Update task status
        active_tasks[task_id] = {
            "status": "downloading",
            "progress": 5,
            "message": "Starting audio download..."
        }
        
        # Create unique filename
        filename = f"{task_id}.%(ext)s"
        output_path = DOWNLOAD_DIR / filename
        
        # Audio format selector
        audio_selector = "bestaudio"
        if selected_audio_format and "kbps" in selected_audio_format:
            # Extract bitrate from format (e.g., "128kbps" -> 128)
            try:
                bitrate = int(selected_audio_format.replace("kbps", ""))
                # Use approximate matching for audio bitrate
                audio_selector = f"bestaudio[abr<={bitrate+10}][abr>={bitrate-10}]"
            except ValueError:
                pass
        
        # Highly optimized yt-dlp command for audio with progress
        download_cmd = [
            "yt-dlp",
            "--no-playlist",
            "--no-warnings",
            # Fast user agent
            "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            # Minimize retries for speed
            "--retries", "2",
            "--fragment-retries", "2",
            # Fast output template
            "-o", str(output_path),
            # Audio-only format selection
            "-f", f"{audio_selector}/bestaudio/best",
            # Extract audio
            "-x",
            # Progress JSON output
            "--newline",
            "--progress-template", "download:%(progress.downloaded_bytes)s/%(progress.total_bytes)s",
            # Speed optimizations
            "--no-check-certificate",
            "--prefer-insecure",
            url
        ]
        
        # Update progress
        active_tasks[task_id]["progress"] = 10
        active_tasks[task_id]["message"] = "Downloading audio..."
        
        # Execute download in thread pool with progress monitoring
        logger.info(f"Starting audio download: {task_id} with format: {audio_selector}")
        loop = asyncio.get_event_loop()
        
        # Windows-compatible process runner with progress monitoring
        async def run_with_progress(cmd):
            if IS_WINDOWS:
                # Use ThreadPoolExecutor for Windows
                def run_process():
                    # Create process with pipe for stdout
                    process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        bufsize=1,
                        universal_newlines=True
                    )
                    
                    # Monitor progress
                    for line in process.stdout:
                        try:
                            line_text = line.strip()
                            if line_text.startswith("download:"):
                                parts = line_text.split(":")
                                if len(parts) > 1 and "/" in parts[1]:
                                    downloaded, total = parts[1].split("/")
                                    if downloaded and total and int(total) > 0:
                                        percent = min(45, 5 + int((int(downloaded) / int(total)) * 40))
                                        active_tasks[task_id]["progress"] = percent
                                        active_tasks[task_id]["message"] = f"Downloading audio... {percent}%"
                        except Exception as e:
                            logger.error(f"Error parsing progress: {e}")
                    
                    # Wait for process to complete
                    returncode = process.wait()
                    return returncode, process.stderr.read() if process.stderr else ""
                
                # Run in thread pool
                returncode, stderr = await loop.run_in_executor(executor, run_process)
                return returncode
            else:
                # Use asyncio for Unix-based systems
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                # Monitor progress
                while True:
                    if process.stdout:
                        line = await process.stdout.readline()
                        if not line:
                            break
                        
                        try:
                            line_text = line.decode('utf-8').strip()
                            if line_text.startswith("download:"):
                                parts = line_text.split(":")
                                if len(parts) > 1 and "/" in parts[1]:
                                    downloaded, total = parts[1].split("/")
                                    if downloaded and total and int(total) > 0:
                                        percent = min(45, 5 + int((int(downloaded) / int(total)) * 40))
                                        active_tasks[task_id]["progress"] = percent
                                        active_tasks[task_id]["message"] = f"Downloading audio... {percent}%"
                        except Exception as e:
                            logger.error(f"Error parsing progress: {e}")
                
                await process.wait()
                return process.returncode
        
        try:
            # Run with progress monitoring
            returncode = await run_with_progress(download_cmd)
            
            if returncode != 0:
                logger.error(f"Audio download failed with code {returncode}")
                active_tasks[task_id] = {
                    "status": "failed",
                    "progress": 0,
                    "message": "Audio download failed",
                    "error": "Process exited with non-zero code"
                }
                return
                
        except asyncio.TimeoutError:
            active_tasks[task_id] = {
                "status": "failed",
                "progress": 0,
                "message": "Download timeout",
                "error": "Audio download took too long"
            }
            return

        # Find downloaded file
        downloaded_files = list(DOWNLOAD_DIR.glob(f"{task_id}.*"))
        if not downloaded_files:
            active_tasks[task_id] = {
                "status": "failed", 
                "progress": 0, 
                "message": "Audio download failed - no file found"
            }
            return

        downloaded_file = downloaded_files[0]
        active_tasks[task_id] = {
            "status": "processing", 
            "progress": 50, 
            "message": "Processing audio..."
        }

        # Prepare output
        output_filename = f"{task_id}.{output_format}"
        final_output = PROCESSED_DIR / output_filename

        # Optimized FFmpeg command for audio
        ffmpeg_cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(downloaded_file)]
        
        # Add trimming if specified
        if trim_start and trim_end:
            ffmpeg_cmd.extend(["-ss", trim_start, "-to", trim_end])
        
        # Format-specific optimizations
        if output_format == "mp3":
            ffmpeg_cmd.extend(["-vn", "-ar", "44100", "-ac", "2", "-b:a", "192k"])
        elif output_format == "m4a":
            ffmpeg_cmd.extend(["-vn", "-c:a", "aac", "-b:a", "192k"])
        elif output_format == "ogg":
            ffmpeg_cmd.extend(["-vn", "-c:a", "libvorbis", "-q:a", "4"])
        elif output_format == "wav":
            ffmpeg_cmd.extend(["-vn", "-ar", "44100", "-ac", "2"])
        else:
            # Default to mp3
            ffmpeg_cmd.extend(["-vn", "-ar", "44100", "-ac", "2", "-b:a", "192k"])
            output_filename = f"{task_id}.mp3"
            final_output = PROCESSED_DIR / output_filename

        ffmpeg_cmd.append(str(final_output))

        # Update progress at different stages of processing
        active_tasks[task_id]["progress"] = 60
        active_tasks[task_id]["message"] = "Converting audio format..."

        # Execute FFmpeg with progress updates - Windows compatible
        if IS_WINDOWS:
            # Run FFmpeg in thread pool for Windows
            async def run_ffmpeg_with_progress():
                process = subprocess.Popen(
                    ffmpeg_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Update progress periodically during FFmpeg processing
                start_time = time.time()
                while process.poll() is None:
                    # Update progress from 60% to 90% during FFmpeg processing
                    elapsed = time.time() - start_time
                    # Assume FFmpeg will take about 20 seconds max for audio
                    progress = min(90, 60 + int(elapsed / 20 * 30))
                    active_tasks[task_id]["progress"] = progress
                    active_tasks[task_id]["message"] = f"Processing audio... {progress}%"
                    
                    # Wait a bit before checking again
                    await asyncio.sleep(1)
                
                # Get return code and stderr
                returncode = process.returncode
                stderr = process.stderr.read() if process.stderr else b""
                return returncode, stderr.decode('utf-8', errors='ignore')
            
            returncode, stderr = await run_ffmpeg_with_progress()
        else:
            # Use asyncio for Unix-based systems
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Update progress periodically during FFmpeg processing
            start_time = time.time()
            while process.returncode is None:
                # Update progress from 60% to 90% during FFmpeg processing
                elapsed = time.time() - start_time
                # Assume FFmpeg will take about 20 seconds max for audio
                progress = min(90, 60 + int(elapsed / 20 * 30))
                active_tasks[task_id]["progress"] = progress
                active_tasks[task_id]["message"] = f"Processing audio... {progress}%"
                
                # Check if process has completed
                await asyncio.sleep(1)
                if process.returncode is not None:
                    break
            
            await process.wait()
            stderr_data = await process.stderr.read()
            stderr = stderr_data.decode('utf-8', errors='ignore')
            returncode = process.returncode
        
        if returncode != 0:
            error_msg = stderr if stderr else "Unknown error"
            active_tasks[task_id] = {
                "status": "failed", 
                "progress": 0, 
                "message": "Audio processing failed", 
                "error": error_msg
            }
            return

        # Cleanup original file
        downloaded_file.unlink(missing_ok=True)

        # Success!
        active_tasks[task_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Audio ready for download",
            "download_url": f"/downloads/{output_filename}"
        }
        
        logger.info(f"Audio task {task_id} completed successfully")

    except Exception as e:
        logger.error(f"Audio task {task_id} failed: {traceback.format_exc()}")
        active_tasks[task_id] = {
            "status": "failed",
            "progress": 0,
            "message": "Audio processing failed",
            "error": str(e)
        }

@app.on_event("shutdown")
def cleanup():
    shutil.rmtree(TEMP_DIR, ignore_errors=True)
    executor.shutdown(wait=False)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)