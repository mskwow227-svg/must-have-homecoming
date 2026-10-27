"""원본 환영인사 영상 4개를 Remotion용 작업본으로 변환한다.

- 영상: HLG HDR → SDR(BT.709) 톤매핑, 30fps 고정, 프레임 수는 원본과 동일, 무음 H.264
- 음성: 가벼운 노이즈 감소 → -16 LUFS 정규화 → 피크 리미터 → 영상 길이(프레임/30)에 샘플 단위로 맞춤
        → 양 끝 5ms 마이크로 페이드 → 48kHz WAV
자르기·속도 변경·순서 변경은 하지 않는다.

사용법: python scripts/prep.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "★홈커밍데이 준비 폴더" / "환영인사 영상"
OUT_V = ROOT / "public" / "clips"
OUT_A = ROOT / "public" / "audio"
FPS = 30
SR = 48000
TARGET_LUFS = -16.0
FADE = 0.005

TONEMAP = (
    "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
    "tonemap=mobius:param=0.3:desat=0,"
    "zscale=t=bt709:m=bt709:r=tv,format=yuv420p"
)
CLEAN = f"aresample={SR},highpass=f=70,afftdn=nr=10:nf=-50:tn=1"


def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def frames_of(path):
    r = run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
             "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", str(path)])
    return int(r.stdout.strip().split(",")[0])


def loudness(path, pre=""):
    af = (pre + "," if pre else "") + "ebur128=peak=true"
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", af, "-f", "null", "-"])
    summary = r.stderr[r.stderr.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    peak = float(re.search(r"Peak:\s+(-?[\d.inf]+) dBFS", summary).group(1))
    return i, peak


def main():
    OUT_V.mkdir(parents=True, exist_ok=True)
    OUT_A.mkdir(parents=True, exist_ok=True)
    report = []
    for n in range(1, 5):
        src = SRC / f"{n}.mp4"
        frames = frames_of(src)
        samples = frames * SR // FPS
        dur = samples / SR

        vout = OUT_V / f"clip{n}.mp4"
        r = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
                 "-vf", f"{TONEMAP},fps={FPS}", "-frames:v", str(frames), "-an",
                 "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p",
                 "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                 "-color_range", "tv", "-movflags", "+faststart", str(vout)])
        if r.returncode:
            sys.exit(r.stderr)

        # 배경용 블러 사본 (저해상도로 미리 흐려 두면 렌더가 빠르고 결과가 일정함)
        r = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(vout),
                 "-vf", "scale=384:216,gblur=sigma=9:steps=3", "-an",
                 "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", str(OUT_V / f"bg{n}.mp4")])
        if r.returncode:
            sys.exit(r.stderr)

        i_clean, _ = loudness(src, CLEAN)
        gain = TARGET_LUFS - i_clean
        af = (f"{CLEAN},volume={gain:.2f}dB,"
              f"alimiter=limit=0.84:attack=3:release=60:level=false,"
              f"apad=whole_len={samples},atrim=end_sample={samples},"
              f"afade=t=in:st=0:d={FADE},afade=t=out:st={dur - FADE:.6f}:d={FADE}")
        aout = OUT_A / f"voice{n}.wav"
        r = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
                 "-af", af, "-ac", "2", "-c:a", "pcm_s16le", str(aout)])
        if r.returncode:
            sys.exit(r.stderr)

        i_out, p_out = loudness(aout)
        vframes = frames_of(vout)
        report.append({"clip": n, "frames_src": frames, "frames_out": vframes,
                       "seconds": round(frames / FPS, 4), "gain_db": round(gain, 2),
                       "lufs_out": i_out, "true_peak_out": p_out})
        print(report[-1], flush=True)

    (ROOT / "analysis" / "prep_report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
