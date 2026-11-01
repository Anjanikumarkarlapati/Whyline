"""Gnani Vachana Speech Stack Bridge (BE-203 / Milestone 2):
Delegates to backend.services.gnani_client.GnaniSpeechClient while maintaining
full backward compatibility for existing callers and endpoints.
"""
from __future__ import annotations

from pathlib import Path

from backend.services.gnani_client import (
    GNANI_STT_REST_URL,
    GNANI_STT_WS_URL,
    GNANI_TTS_REST_URL,
    PHONETIC_AST_MAP,
    GnaniSpeechClient,
)

_DEFAULT_CLIENT = GnaniSpeechClient()


def rescore_transcript_with_ast(raw_transcript: str, repo_vocab: list[str] | None = None) -> dict:
    """Applies AST Vocabulary Rescoring to preserve exact CamelCase/snake_case symbols in code-mixed STT."""
    return _DEFAULT_CLIENT.rescore_ast_vocabulary(raw_transcript, repo_vocab=repo_vocab)


def _generate_chime_wav(output_path: Path, text: str, sample_rate: int = 16000) -> Path:
    """Generates a valid, pleasant 16kHz 16-bit mono PCM WAV audio cue when offline."""
    return _DEFAULT_CLIENT.generate_local_wav(output_path, text, sample_rate=sample_rate)


def transcribe_voice_confirmation(
    audio_bytes: bytes | None = None,
    fallback_text: str | None = None,
    language: str = "te-IN",
    repo_vocab: list[str] | None = None,
) -> dict:
    """Calls Gnani Vachana Prisma v2.5 STT REST endpoint when GNANI_API_KEY is present,
    or falls back cleanly to the provided transcript / sample confirmation, then runs AST rescoring.
    """
    return _DEFAULT_CLIENT.transcribe(
        audio_bytes=audio_bytes,
        fallback_text=fallback_text,
        language=language,
        repo_vocab=repo_vocab,
    )


def synthesize_timbre_audio(
    text: str,
    output_dir: Path,
    file_stem: str,
    language: str = "te-IN",
    speaker_embedding: str | None = None,
    voice: str = "Nalini",
) -> dict:
    """Synthesizes 16kHz WAV speech via Gnani Timbre v2.5 TTS (`timbre-v2.5`),
    or generates a local 16kHz WAV file when offline so playback never fails.
    """
    return _DEFAULT_CLIENT.synthesize(
        text=text,
        output_dir=output_dir,
        file_stem=file_stem,
        voice=voice,
        language=language,
        speaker_embedding=speaker_embedding,
    )


__all__ = [
    "GnaniSpeechClient",
    "GNANI_STT_REST_URL",
    "GNANI_STT_WS_URL",
    "GNANI_TTS_REST_URL",
    "PHONETIC_AST_MAP",
    "rescore_transcript_with_ast",
    "transcribe_voice_confirmation",
    "synthesize_timbre_audio",
    "_generate_chime_wav",
]
