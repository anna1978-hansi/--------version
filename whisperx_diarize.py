#!/usr/bin/env python3
from __future__ import annotations

import gc
import inspect
import json
import os
import platform
import shutil
import sys
import threading
import time
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_AUDIO_FILE = Path("/Users/liuzhixuan/Downloads/split.mp3")
DEFAULT_MODEL_NAME = "medium"
OUTPUT_DIR = PROJECT_ROOT / "output"
MPLCONFIGDIR = OUTPUT_DIR / ".matplotlib"
SAMPLE_RATE = 16000


def load_local_env(*env_paths: Path) -> None:
    """按顺序加载环境变量，已存在的变量不会被覆盖。"""
    for env_path in env_paths:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'\"")
            os.environ.setdefault(key, value)


def prepare_runtime_env() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MPLCONFIGDIR.mkdir(parents=True, exist_ok=True)

    # Torch 2.6+ 默认使用 weights_only=True，会让旧版 pyannote checkpoint 加载失败。
    # 这里退回旧行为，仅对当前脚本进程生效。
    os.environ.setdefault("TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD", "1")
    os.environ.setdefault("MPLCONFIGDIR", str(MPLCONFIGDIR))


def require_dependencies():
    try:
        import torch
        import whisperx
        from whisperx.diarize import DiarizationPipeline
    except ImportError as exc:
        message = (
            "缺少运行 WhisperX 所需依赖。\n"
            "请先安装后再运行：\n"
            "  python3 -m pip install -U torch torchaudio torchvision\n"
            "  python3 -m pip install -U whisperx\n"
            "如果 diarization 权限报错，还需要在 Hugging Face 上同意 pyannote 相关模型协议。"
        )
        raise SystemExit(message) from exc

    return torch, whisperx, DiarizationPipeline


def detect_runtime(torch_module: Any) -> tuple[str, str]:
    requested_device = os.getenv("WHISPERX_DEVICE")
    requested_compute_type = os.getenv("WHISPERX_COMPUTE_TYPE")

    if requested_device:
        device = requested_device
    elif torch_module.cuda.is_available():
        device = "cuda"
    else:
        # WhisperX 里的 faster-whisper 在 Apple Silicon 上用 CPU 更稳。
        system = platform.system().lower()
        machine = platform.machine().lower()
        if system == "darwin" and machine == "arm64":
            device = "cpu"
        else:
            device = "cpu"

    if requested_compute_type:
        compute_type = requested_compute_type
    elif device == "cuda":
        compute_type = "float16"
    else:
        compute_type = "int8"

    return device, compute_type


def release_torch_memory(torch_module: Any, *objects: Any) -> None:
    gc.collect()
    if torch_module.cuda.is_available():
        torch_module.cuda.empty_cache()

    for obj in objects:
        del obj


def format_timestamp(seconds: float | None) -> str:
    if seconds is None:
        return "??:??:??"

    total_milliseconds = max(int(seconds * 1000), 0)
    total_seconds, milliseconds = divmod(total_milliseconds, 1000)
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"


def format_duration(seconds: float) -> str:
    total_seconds = max(int(seconds), 0)
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


class StepHeartbeat:
    def __init__(self, label: str, interval_seconds: int = 15) -> None:
        self.label = label
        self.interval_seconds = interval_seconds
        self.started_at = 0.0
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None

    def __enter__(self) -> "StepHeartbeat":
        self.started_at = time.time()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.stop_event.set()
        if self.thread is not None:
            self.thread.join(timeout=1)
        elapsed = format_duration(time.time() - self.started_at)
        print(f"[{self.label}] 完成，用时 {elapsed}", flush=True)

    def _run(self) -> None:
        while not self.stop_event.wait(self.interval_seconds):
            elapsed = format_duration(time.time() - self.started_at)
            print(f"[{self.label}] 仍在运行，已耗时 {elapsed}", flush=True)


def write_outputs(audio_file: Path, result: dict[str, Any]) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    safe_stem = audio_file.stem.replace("/", "_")
    text_output = OUTPUT_DIR / f"{safe_stem}.speaker_transcript.txt"
    json_output = OUTPUT_DIR / f"{safe_stem}.speaker_transcript.json"
    speaker_turns = build_speaker_turns(result)

    lines: list[str] = []
    for turn in speaker_turns:
        speaker = turn.get("speaker", "UNKNOWN")
        start = format_timestamp(turn.get("start"))
        end = format_timestamp(turn.get("end"))
        text = turn.get("text", "").strip()
        lines.append(f"[{start} -> {end}] {speaker}: {text}")

    text_output.write_text("\n".join(lines), encoding="utf-8")
    result_to_save = dict(result)
    result_to_save["speaker_turns"] = speaker_turns
    json_output.write_text(
        json.dumps(result_to_save, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return text_output, json_output


def write_stage_outputs(
    audio_file: Path,
    result: dict[str, Any],
    stage_name: str,
) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    safe_stem = audio_file.stem.replace("/", "_")
    text_output = OUTPUT_DIR / f"{safe_stem}.{stage_name}.txt"
    json_output = OUTPUT_DIR / f"{safe_stem}.{stage_name}.json"

    lines: list[str] = []
    for segment in result.get("segments", []):
        speaker = segment.get("speaker")
        start = format_timestamp(segment.get("start"))
        end = format_timestamp(segment.get("end"))
        text = segment.get("text", "").strip()
        if speaker:
            lines.append(f"[{start} -> {end}] {speaker}: {text}")
        else:
            lines.append(f"[{start} -> {end}] {text}")

    text_output.write_text("\n".join(lines), encoding="utf-8")
    json_output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return text_output, json_output


def ensure_audio_file(audio_file: Path) -> None:
    if not audio_file.exists():
        raise SystemExit(f"找不到音频文件：{audio_file}")

    if shutil.which("ffmpeg") is None:
        raise SystemExit("未找到 ffmpeg，请先安装 ffmpeg 再运行此脚本。")


def get_audio_file() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).expanduser().resolve()
    return DEFAULT_AUDIO_FILE


def get_hf_token() -> str:
    token = (
        os.getenv("HF_TOKEN")
        or os.getenv("HUGGINGFACE_TOKEN")
        or os.getenv("HUGGING_FACE_HUB_TOKEN")
    )
    if not token:
        raise SystemExit(
            "未找到 Hugging Face token。\n"
            "请在 .env 或 .env.example 里配置 HF_TOKEN=你的token。"
        )
    return token


def get_optional_speaker_bounds() -> dict[str, int]:
    diarize_kwargs: dict[str, int] = {}

    min_speakers = os.getenv("MIN_SPEAKERS")
    max_speakers = os.getenv("MAX_SPEAKERS")

    if min_speakers:
        diarize_kwargs["min_speakers"] = int(min_speakers)
    if max_speakers:
        diarize_kwargs["max_speakers"] = int(max_speakers)

    return diarize_kwargs


def maybe_trim_audio(audio: Any, max_audio_seconds: int) -> Any:
    if max_audio_seconds <= 0:
        return audio

    max_samples = max_audio_seconds * SAMPLE_RATE
    if len(audio) <= max_samples:
        return audio

    print(f"试跑模式：仅处理前 {max_audio_seconds} 秒音频。", flush=True)
    return audio[:max_samples]


def build_speaker_turns(result: dict[str, Any]) -> list[dict[str, Any]]:
    word_items = extract_word_items(result)
    if not word_items:
        return build_segment_turns(result)

    smoothed_word_items = smooth_word_speakers(word_items)
    return merge_word_items(smoothed_word_items)


def build_segment_turns(result: dict[str, Any]) -> list[dict[str, Any]]:
    turns: list[dict[str, Any]] = []
    for segment in result.get("segments", []):
        turns.append(
            {
                "speaker": segment.get("speaker", "UNKNOWN"),
                "start": segment.get("start"),
                "end": segment.get("end"),
                "text": segment.get("text", "").strip(),
            }
        )
    return turns


def extract_word_items(result: dict[str, Any]) -> list[dict[str, Any]]:
    word_items: list[dict[str, Any]] = []

    for segment in result.get("segments", []):
        segment_speaker = segment.get("speaker", "UNKNOWN")
        for word in segment.get("words", []):
            text = str(word.get("word", "")).strip()
            if not text:
                continue

            speaker = word.get("speaker") or segment_speaker
            start = word.get("start")
            end = word.get("end")
            if start is None or end is None:
                continue

            word_items.append(
                {
                    "speaker": speaker,
                    "start": start,
                    "end": end,
                    "text": text,
                }
            )

    return word_items


def smooth_word_speakers(word_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not word_items:
        return word_items

    runs: list[dict[str, Any]] = []
    for item in word_items:
        if not runs or runs[-1]["speaker"] != item["speaker"]:
            runs.append(
                {
                    "speaker": item["speaker"],
                    "items": [dict(item)],
                }
            )
        else:
            runs[-1]["items"].append(dict(item))

    changed = True
    while changed and len(runs) >= 3:
        changed = False
        new_runs: list[dict[str, Any]] = [runs[0]]

        for idx in range(1, len(runs) - 1):
            previous_run = new_runs[-1]
            current_run = runs[idx]
            next_run = runs[idx + 1]

            current_duration = current_run["items"][-1]["end"] - current_run["items"][0]["start"]
            current_chars = sum(len(item["text"]) for item in current_run["items"])

            if (
                previous_run["speaker"] == next_run["speaker"]
                and current_run["speaker"] != previous_run["speaker"]
                and (current_duration <= 1.2 or current_chars <= 6)
            ):
                previous_run["items"].extend(current_run["items"])
                for item in previous_run["items"]:
                    item["speaker"] = previous_run["speaker"]
                changed = True
            else:
                new_runs.append(current_run)

        if len(runs) > 1:
            new_runs.append(runs[-1])

        runs = []
        for run in new_runs:
            if runs and runs[-1]["speaker"] == run["speaker"]:
                runs[-1]["items"].extend(run["items"])
            else:
                runs.append(run)

    smoothed_items: list[dict[str, Any]] = []
    for run in runs:
        smoothed_items.extend(run["items"])

    return smoothed_items


def merge_word_items(word_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    turns: list[dict[str, Any]] = []

    for item in word_items:
        if not turns or turns[-1]["speaker"] != item["speaker"]:
            turns.append(
                {
                    "speaker": item["speaker"],
                    "start": item["start"],
                    "end": item["end"],
                    "text": item["text"],
                }
            )
        else:
            turns[-1]["end"] = item["end"]
            turns[-1]["text"] += item["text"]

    return turns


def load_whisper_model(whisperx_module: Any, device: str, compute_type: str, model_name: str):
    try:
        return whisperx_module.load_model(model_name, device, compute_type=compute_type)
    except ValueError as exc:
        if compute_type == "float32":
            raise

        fallback_compute_type = "float32"
        print(
            f"当前 compute_type={compute_type} 加载失败，改用 {fallback_compute_type} 重试...",
            flush=True,
        )
        return whisperx_module.load_model(
            model_name,
            device,
            compute_type=fallback_compute_type,
        )


def create_diarization_pipeline(
    diarization_pipeline_cls: Any,
    hf_token: str,
    device: str,
) -> Any:
    params = inspect.signature(diarization_pipeline_cls.__init__).parameters
    kwargs: dict[str, Any] = {"device": device}

    if "token" in params:
        kwargs["token"] = hf_token
    elif "use_auth_token" in params:
        kwargs["use_auth_token"] = hf_token

    try:
        pipeline = diarization_pipeline_cls(**kwargs)
    except Exception as exc:
        raise RuntimeError(
            "分说话人模型加载失败。\n"
            "请检查这 3 件事：\n"
            "1. 你的 Hugging Face token 是否有效。\n"
            "2. 你是否已在浏览器中接受这两个 gated 模型的使用条款：\n"
            "   - https://huggingface.co/pyannote/speaker-diarization-3.1\n"
            "   - https://huggingface.co/pyannote/segmentation-3.0\n"
            "3. 如果你用的是 fine-grained token，请确认它有 gated model 的读取权限。\n"
            "前两步结果已经写到 output 目录，可以先查看 transcribe/aligned 文件。"
        ) from exc

    if pipeline is None:
        raise RuntimeError(
            "分说话人模型没有成功初始化。\n"
            "请确认 Hugging Face token 可用，并已接受 pyannote 的 gated 模型条款。\n"
            "前两步结果已经写到 output 目录，可以先查看 transcribe/aligned 文件。"
        )

    return pipeline


def main() -> None:
    load_local_env(PROJECT_ROOT / ".env", PROJECT_ROOT / ".env.example")
    prepare_runtime_env()

    torch, whisperx, DiarizationPipeline = require_dependencies()

    audio_file = get_audio_file()
    ensure_audio_file(audio_file)

    device, compute_type = detect_runtime(torch)
    default_batch_size = "16" if device == "cuda" else "8"
    default_model_name = DEFAULT_MODEL_NAME if device == "cuda" else "medium"
    batch_size = int(os.getenv("BATCH_SIZE", default_batch_size))
    model_name = os.getenv("WHISPER_MODEL", default_model_name)
    language = os.getenv("WHISPER_LANGUAGE")
    print_progress = env_flag("PRINT_PROGRESS", default=True)
    verbose_transcript = env_flag("VERBOSE_TRANSCRIPT", default=False)
    heartbeat_seconds = int(os.getenv("HEARTBEAT_SECONDS", "15"))
    max_audio_seconds = int(os.getenv("MAX_AUDIO_SECONDS", "0"))
    hf_token = get_hf_token()
    diarize_kwargs = get_optional_speaker_bounds()

    print(f"音频文件: {audio_file}")
    print(f"运行设备: {device}")
    print(f"Whisper 模型: {model_name}")
    print(f"compute_type: {compute_type}")
    print(f"batch_size: {batch_size}")
    if language:
        print(f"指定语言: {language}")
    if max_audio_seconds > 0:
        print(f"试跑时长: 前 {max_audio_seconds} 秒")
    if diarize_kwargs:
        print(f"说话人数限制: {diarize_kwargs}")
    print()

    print("1. 开始转写...")
    model = load_whisper_model(whisperx, device, compute_type, model_name)
    audio = whisperx.load_audio(str(audio_file))
    audio = maybe_trim_audio(audio, max_audio_seconds)
    with StepHeartbeat("转写", heartbeat_seconds):
        result = model.transcribe(
            audio,
            batch_size=batch_size,
            language=language,
            print_progress=print_progress,
            verbose=verbose_transcript,
        )
    print(f"检测语言: {result.get('language', 'unknown')}")
    print(f"初始片段数: {len(result.get('segments', []))}")
    transcribe_text_output, transcribe_json_output = write_stage_outputs(
        audio_file,
        result,
        "transcribe",
    )
    print("转写中间结果已写出:")
    print(f"  文本: {transcribe_text_output}")
    print(f"  JSON: {transcribe_json_output}")

    release_torch_memory(torch, model)
    del model

    print("\n2. 开始对齐...")
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"],
        device=device,
    )
    with StepHeartbeat("对齐", heartbeat_seconds):
        result = whisperx.align(
            result["segments"],
            model_a,
            metadata,
            audio,
            device,
            return_char_alignments=False,
        )
    print(f"对齐后片段数: {len(result.get('segments', []))}")
    aligned_text_output, aligned_json_output = write_stage_outputs(
        audio_file,
        result,
        "aligned",
    )
    print("对齐中间结果已写出:")
    print(f"  文本: {aligned_text_output}")
    print(f"  JSON: {aligned_json_output}")

    release_torch_memory(torch, model_a)
    del model_a

    print("\n3. 开始分说话人...")
    diarize_model = create_diarization_pipeline(DiarizationPipeline, hf_token, device)
    with StepHeartbeat("分说话人", heartbeat_seconds):
        diarize_segments = diarize_model(audio, **diarize_kwargs)
    result = whisperx.assign_word_speakers(diarize_segments, result)

    print("\n4. 输出结果...")
    text_output, json_output = write_outputs(audio_file, result)

    for turn in build_speaker_turns(result):
        speaker = turn.get("speaker", "UNKNOWN")
        start = format_timestamp(turn.get("start"))
        end = format_timestamp(turn.get("end"))
        text = turn.get("text", "").strip()
        print(f"[{start} -> {end}] {speaker}: {text}")

    print("\n已写出文件:")
    print(f"  文本: {text_output}")
    print(f"  JSON: {json_output}")


if __name__ == "__main__":
    main()
