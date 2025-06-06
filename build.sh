#!/usr/bin/env bash
# exit on error
set -o errexit

# Skip system package installation on Render (read-only filesystem)
# Instead, rely on Render's pre-installed packages

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Update yt-dlp to latest version and ensure it's properly installed
pip uninstall -y yt-dlp
pip install --no-cache-dir yt-dlp
yt-dlp --version