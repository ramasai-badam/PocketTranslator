# Audio Conversion Backend

This is a minimal Flask backend for converting `.m4a` audio files to `.wav` using ffmpeg.

## Usage
1. Start the server: `python app.py`
2. POST a `.m4a` file to `/convert`.
3. Receive the converted `.wav` file in response.

## Requirements
- Python 3.x
- Flask
- ffmpeg (must be installed and available in PATH)

## API
- `POST /convert` with form-data `file` (.m4a)
- Returns: `.wav` file
