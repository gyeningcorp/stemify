"""Stemify API — music stem separation and MIDI conversion backend."""

from __future__ import annotations

import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config as BotoConfig
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("stemify")

ALLOWED_EXTENSIONS: set[str] = {".mp3", ".wav", ".m4a", ".flac"}
MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
STEM_NAMES: list[str] = ["vocals", "drums", "bass", "other"]
DEMUCS_MODEL: str = "htdemucs"
TMP_ROOT: Path = Path("/tmp/stemify")

S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "")
S3_ACCESS_KEY_ID: str = os.getenv("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY: str = os.getenv("S3_SECRET_ACCESS_KEY", "")
S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "stemify")
S3_PUBLIC_URL: str = os.getenv("S3_PUBLIC_URL", "")

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(title="Stemify API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# S3 / R2 helpers
# ---------------------------------------------------------------------------


def _get_s3_client() -> Any:
    """Return a boto3 S3 client configured from environment variables."""
    if not all([S3_ENDPOINT_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY]):
        raise RuntimeError(
            "S3 credentials are not configured. "
            "Set S3_ENDPOINT_URL, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY."
        )
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY_ID,
        aws_secret_access_key=S3_SECRET_ACCESS_KEY,
        config=BotoConfig(signature_version="s3v4"),
    )


def upload_file_to_s3(local_path: Path, s3_key: str) -> str:
    """Upload a local file to S3/R2 and return its public URL.

    Args:
        local_path: Path to the file on disk.
        s3_key: Object key inside the bucket.

    Returns:
        The public URL of the uploaded object.
    """
    client = _get_s3_client()

    content_type = "audio/mpeg"
    suffix = local_path.suffix.lower()
    if suffix == ".mid":
        content_type = "audio/midi"
    elif suffix == ".wav":
        content_type = "audio/wav"
    elif suffix == ".flac":
        content_type = "audio/flac"

    logger.info("Uploading %s -> s3://%s/%s", local_path, S3_BUCKET_NAME, s3_key)
    client.upload_file(
        str(local_path),
        S3_BUCKET_NAME,
        s3_key,
        ExtraArgs={"ContentType": content_type},
    )

    public_url = f"{S3_PUBLIC_URL.rstrip('/')}/{s3_key}"
    return public_url


# ---------------------------------------------------------------------------
# Processing helpers
# ---------------------------------------------------------------------------


def _validate_upload(file: UploadFile) -> str:
    """Validate the uploaded file and return its sanitised extension.

    Raises:
        HTTPException: If validation fails.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Filename is required.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return ext


def _save_upload(file: UploadFile, dest: Path) -> None:
    """Stream the uploaded file to *dest*, enforcing the size limit."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    bytes_written = 0
    with dest.open("wb") as f:
        while chunk := file.file.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > MAX_FILE_SIZE_BYTES:
                # Clean up partial file
                f.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
                )
            f.write(chunk)


def _run_demucs(input_path: Path, output_dir: Path) -> Path:
    """Run Demucs 4-stem separation and return the directory containing stems.

    Returns:
        Path to the directory with the separated stem files, e.g.
        ``{output_dir}/htdemucs/{track_name}/``.
    """
    from demucs.separate import main as demucs_main  # heavy import

    logger.info("Running Demucs on %s", input_path)
    demucs_main([
        "-n", DEMUCS_MODEL,
        "--mp3",
        "-o", str(output_dir),
        str(input_path),
    ])

    # Demucs writes to {output_dir}/{model}/{track_name}/
    track_name = input_path.stem
    stems_dir = output_dir / DEMUCS_MODEL / track_name
    if not stems_dir.is_dir():
        raise RuntimeError(f"Demucs output directory not found: {stems_dir}")

    logger.info("Demucs output at %s", stems_dir)
    return stems_dir


def _run_basic_pitch(stem_audio_path: Path, midi_output_path: Path) -> None:
    """Convert an audio stem to MIDI using Basic Pitch."""
    from basic_pitch.inference import predict  # heavy import

    logger.info("Converting %s to MIDI", stem_audio_path)
    _model_output, midi_data, _note_events = predict(str(stem_audio_path))
    midi_output_path.parent.mkdir(parents=True, exist_ok=True)
    midi_data.write(str(midi_output_path))
    logger.info("MIDI written to %s", midi_output_path)


# ---------------------------------------------------------------------------
# In-memory job tracking (placeholder for future persistence / async)
# ---------------------------------------------------------------------------

_jobs: dict[str, dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict[str, str]:
    """Simple health-check endpoint."""
    return {"status": "ok"}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str) -> dict[str, Any]:
    """Return the current status of a processing job.

    For now all processing is synchronous, so a job is either ``completed``
    (present in the store) or ``not_found``.
    """
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@app.post("/api/process")
async def process_audio(file: UploadFile = File(...)) -> dict[str, Any]:
    """Accept an audio upload, separate stems, convert to MIDI, and return URLs."""

    # --- Validate --------------------------------------------------------
    ext = _validate_upload(file)
    job_id = str(uuid.uuid4())
    logger.info("New job %s — file=%s", job_id, file.filename)

    # --- Save upload -----------------------------------------------------
    upload_dir = TMP_ROOT / "uploads" / job_id
    input_path = upload_dir / f"input{ext}"
    _save_upload(file, input_path)
    logger.info("Saved upload to %s", input_path)

    try:
        # --- Demucs separation -------------------------------------------
        demucs_output_dir = TMP_ROOT / "separated" / job_id
        demucs_output_dir.mkdir(parents=True, exist_ok=True)
        stems_dir = _run_demucs(input_path, demucs_output_dir)

        # --- Basic Pitch + S3 upload -------------------------------------
        stems_response: list[dict[str, str]] = []

        for stem_name in STEM_NAMES:
            # Locate the stem audio file produced by Demucs
            stem_audio: Path | None = None
            for candidate_ext in (".mp3", ".wav"):
                candidate = stems_dir / f"{stem_name}{candidate_ext}"
                if candidate.exists():
                    stem_audio = candidate
                    break

            if stem_audio is None:
                logger.warning("Stem '%s' not found in %s — skipping", stem_name, stems_dir)
                continue

            # MIDI conversion
            midi_dir = TMP_ROOT / "midi" / job_id
            midi_dir.mkdir(parents=True, exist_ok=True)
            midi_path = midi_dir / f"{stem_name}.mid"
            _run_basic_pitch(stem_audio, midi_path)

            # Upload audio stem
            audio_s3_key = f"{job_id}/{stem_name}{stem_audio.suffix}"
            audio_url = upload_file_to_s3(stem_audio, audio_s3_key)

            # Upload MIDI file
            midi_s3_key = f"{job_id}/{stem_name}.mid"
            midi_url = upload_file_to_s3(midi_path, midi_s3_key)

            stems_response.append({
                "name": stem_name,
                "audio_url": audio_url,
                "midi_url": midi_url,
            })

        result: dict[str, Any] = {
            "job_id": job_id,
            "status": "completed",
            "stems": stems_response,
        }

        # Store for status lookups
        _jobs[job_id] = result

        logger.info("Job %s completed — %d stems processed", job_id, len(stems_response))
        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        _jobs[job_id] = {"job_id": job_id, "status": "failed", "error": str(exc)}
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}") from exc
    finally:
        # --- Cleanup temp files ------------------------------------------
        for directory in [
            upload_dir,
            TMP_ROOT / "separated" / job_id,
            TMP_ROOT / "midi" / job_id,
        ]:
            if directory.exists():
                shutil.rmtree(directory, ignore_errors=True)
                logger.info("Cleaned up %s", directory)


# ---------------------------------------------------------------------------
# Dev entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
