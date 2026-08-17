# SubSync: AI Video Caption Generator

SubSync is a premium, lightweight, self-hosted web application that listens to the audio track of your video files and generates highly accurate subtitles/captions using Google Gemini models (Gemini 1.5 Flash, 2.0 Flash, 1.5 Pro).

## Key Features

1.  **Client-Side Audio Extraction:** Zero need for system-wide FFmpeg installation. The app extracts and resamples the audio track directly in the web browser using the native Web Audio API (downsampling to 16kHz mono).
2.  **Multilingual Transcription:** Supports multiple languages, including English, Urdu, Hindi, Spanish, French, and German. It also supports transcribing spoken Urdu into Roman script (Hinglish/Roman Urdu).
3.  **Timeline Editor:** An interactive caption editor where you can adjust subtitle timestamps, add/remove segments, and edit the text dynamically. Clicking on any segment automatically seeks the video player to that timestamp.
4.  **Flexible Formats:** Export captions instantly to `.srt`, `.vtt` (WebVTT), plain text (`.txt`), or JSON formats.
5.  **Secure Local Proxy:** Uses a simple local Flask proxy to bypass CORS restrictions and keep your Gemini API Key safely stored in your browser's local storage.

## Getting Started

### Prerequisites

-   Python 3.8 or higher.
-   Flask and Flask-CORS (pre-installed, or install using `pip install -r requirements.txt`).

### Running the App

1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
2.  Run the Flask backend server:
    ```bash
    python app.py
    ```
3.  Open your browser and navigate to:
    ```
    http://127.0.0.1:5000
    ```

### How to Generate Captions

1.  Enter your **Gemini API Key** in the settings panel (click the gear icon in the top right). If you do not have one, you can get a key for free at [Google AI Studio](https://aistudio.google.com/).
2.  Upload your video file (drag-and-drop or select).
3.  Choose the **Spoken Language** (e.g., Urdu or English).
4.  Click **Generate Captions** and wait for the process to complete.
5.  Edit the generated subtitles on the **Edit Captions** tab if necessary.
6.  Go to the **Export** tab and download your subtitles in `.srt` or `.vtt` format!

## Architecture

-   **Frontend (`static/`)**: Single-page application built with modern vanilla HTML, CSS (flexbox/grid, glassmorphism UI), and Javascript. Uses `OfflineAudioContext` for audio downsampling and WAV byte manipulation.
-   **Backend (`app.py`)**: Flask micro-service. Proxies HTTP requests to the Gemini API (`https://generativelanguage.googleapis.com`) using built-in `urllib`.
