"""최종 렌더 자체 검수. 결과는 analysis/qa/ 에 저장한다.

1) ffprobe 길이·프레임·코덱
2) 영상 경계 전후 스틸 + 프레임별 밝기 (검은 프레임 검사)
3) 음성 연속성: 정규화한 음성 4개가 최종본 안에서 제자리·제크기로 끝까지 들어 있는지 (상호상관)
4) 경계 클릭 검사, 전체 파형 이미지
5) 자막 문구 대조 · 자막 영역 스틸 · 대비(WCAG) 계산

사용법: python scripts/qa.py [out/homecoming_welcome.mp4]
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MP4 = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out" / "homecoming_welcome.mp4"
QA = ROOT / "analysis" / "qa"
QA.mkdir(parents=True, exist_ok=True)
FPS, SR = 30, 48000
INTRO = 210
FRAMES = [324, 283, 419, 185]
STARTS = [int(x) for x in np.cumsum([INTRO] + FRAMES[:-1])]
ENDCARD = INTRO + sum(FRAMES)
BOUNDS = [INTRO, *STARTS[1:], ENDCARD]
report = {}


def run(args):
    return subprocess.run(args, capture_output=True)


def grab(frame, size=(640, 360)):
    r = run(["ffmpeg", "-v", "error", "-i", str(MP4), "-vf", f"select=eq(n\\,{frame}),scale={size[0]}:{size[1]}",
             "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    return Image.frombytes("RGB", size, r.stdout)


def load_audio(path, mono=True):
    r = run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1" if mono else "2", "-ar", str(SR), "-f", "f32le", "-"])
    a = np.frombuffer(r.stdout, np.float32).astype(np.float64)
    return a if mono else a.reshape(-1, 2)


# ── 1) 기본 정보 ──
p = json.loads(run(["ffprobe", "-v", "error", "-show_entries",
                    "format=duration,bit_rate:stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames,pix_fmt,sample_rate,channels,color_primaries,color_transfer,color_space",
                    "-of", "json", str(MP4)]).stdout)
report["probe"] = p
vs = next(s for s in p["streams"] if s["codec_type"] == "video")
total_frames = int(vs["nb_frames"])

# ── 2) 프레임별 밝기 + 경계 스틸 ──
r = run(["ffmpeg", "-v", "error", "-i", str(MP4), "-vf", "scale=320:180,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
         "-f", "null", "-"])
yavg = [float(x) for x in re.findall(rb"YAVG=([\d.]+)", r.stdout)]
section = yavg[INTRO:ENDCARD]
report["brightness"] = {
    "frames_measured": len(yavg),
    "video_section_min_yavg": round(min(section), 1),
    "video_section_min_at_frame": INTRO + int(np.argmin(section)),
    "black_frames_in_video_section(<16)": [INTRO + i for i, v in enumerate(section) if v < 16],
    "endcard_min_yavg": round(min(yavg[ENDCARD:]), 1),
    "around_boundaries": {str(b): [round(v) for v in yavg[b - 3:b + 4]] for b in BOUNDS},
}
cols = [-30, -1, 0, 30]
W, H = 480, 270
sheet = Image.new("RGB", (W * len(cols), H * len(BOUNDS)), "gray")
labels = ["인트로→1", "1→2", "2→3", "3→4", "4→엔드카드"]
for ri, b in enumerate(BOUNDS):
    for ci, off in enumerate(cols):
        im = grab(b + off, (W, H))
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 150, 20], fill="black")
        d.text((5, 4), f"f{b + off} ({'%+d' % off})", fill="white")
        sheet.paste(im, (ci * W, ri * H))
sheet.save(QA / "boundaries.jpg", quality=90)

# ── 3) 음성 연속성 ──
mix = load_audio(MP4)
voice_rows = []
for i, n in enumerate(FRAMES):
    v = load_audio(ROOT / "public" / "audio" / f"voice{i + 1}.wav")
    start = STARTS[i] * SR // FPS
    expected_len = n * SR // FPS
    rows = []
    for k in range(0, len(v) - 12000 + 1, 12000):  # 0.25초 창
        a = v[k:k + 12000]
        if np.sqrt(np.mean(a ** 2)) < 0.01:
            continue  # 원본이 무음인 창은 비교에서 제외
        seg = mix[start + k - 960:start + k + 12000 + 960]
        nn = 1 << 15
        c = np.fft.irfft(np.fft.rfft(seg, nn) * np.conj(np.fft.rfft(a, nn)), nn)[:1921]
        lag = int(np.argmax(c)) - 960
        gain = c.max() / np.dot(a, a)
        rows.append((k / SR, lag, gain))
    lags = [r_[1] for r_ in rows]
    gains = [r_[2] for r_ in rows]
    voice_rows.append({
        "clip": i + 1,
        "expected_start_s": round(start / SR, 4),
        "voice_len_samples": len(v),
        "expected_len_samples": expected_len,
        "speech_windows_checked": len(rows),
        "first_window_s": rows[0][0] if rows else None,
        "last_window_s": rows[-1][0] if rows else None,
        "lag_samples_minmax": [min(lags), max(lags)],
        "gain_min_max": [round(min(gains), 3), round(max(gains), 3)],
    })
report["voice"] = voice_rows

# ── 4) 클릭 검사 + 파형 ──
clicks = {}
hp = np.diff(mix)  # 1차 차분 = 고역 강조
for b in BOUNDS:
    k = b * SR // FPS
    local = np.abs(hp[k - 240:k + 240]).max()
    ref = np.percentile(np.abs(hp[k - SR:k + SR]), 99.9)
    clicks[str(b)] = {"max_diff_at_boundary": round(float(local), 4), "p99.9_within_1s": round(float(ref), 4),
                      "suspicious": bool(local > ref * 1.5)}
report["clicks"] = clicks
st = load_audio(MP4, mono=False)
peak_db = 20 * np.log10(np.abs(st).max())
report["audio_peak_dbfs"] = round(float(peak_db), 2)
r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(MP4), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"])
m = re.search(rb"I:\s+(-?[\d.]+) LUFS", r.stderr[r.stderr.rfind(b"Summary"):])
report["integrated_lufs"] = float(m.group(1))

Wv, Hv = 1800, 360
env = np.abs(st).max(1)
bins = np.array_split(env, Wv)
img = Image.new("RGB", (Wv, Hv + 40), (12, 20, 26))
d = ImageDraw.Draw(img)
for x, bb in enumerate(bins):
    h = int(bb.max() * Hv / 2)
    rms = int(np.sqrt(np.mean(bb ** 2)) * Hv / 2)
    d.line([(x, Hv / 2 - h), (x, Hv / 2 + h)], fill=(80, 140, 200))
    d.line([(x, Hv / 2 - rms), (x, Hv / 2 + rms)], fill=(255, 225, 77))
dur = len(env) / SR
for b, lab in zip(BOUNDS, ["V1", "V2", "V3", "V4", "END"]):
    x = int(b / FPS / dur * Wv)
    d.line([(x, 0), (x, Hv)], fill=(255, 90, 90), width=2)
    d.text((x + 4, 4), lab, fill=(255, 120, 120))
for s in range(0, int(dur) + 1, 5):
    x = int(s / dur * Wv)
    d.text((x + 2, Hv + 12), f"{s}s", fill=(200, 200, 200))
img.save(QA / "waveform.png")

# ── 5) 자막 ──
cfg = (ROOT / "src" / "config.ts").read_text(encoding="utf-8")
clips_src = cfg[cfg.index("export const CLIPS"):cfg.index("// ── 레이아웃")]
blocks = re.split(r"\n  \{\n    id: ", clips_src)[1:]
sentences = []
for blk in blocks:
    words = re.findall(r'\{ t: ([\d.]+), text: "([^"]+)"([^}]*)\}', blk)
    s = ""
    for _, text, flags in words:
        s += ("" if "join: true" in flags or not s else " ") + text
    sentences.append(s)
expected = [
    "산울림청소년센터 청소년운영위원회 Must Have 제20주년 홈커밍데이에 오신 역대 위원 및 지도자 선생님들을 진심으로 환영합니다",
    "20년 전 첫 회의부터 지금까지 함께 웃고 고민하며 만들어 온 소중한 순간들이 모여 오늘의 20주년을 만들었습니다",
    "오늘 이 자리가 과거를 추억하는 것을 넘어 새로운 추억을 만들어 가는 시작이 되며 그동안의 추억을 나누고 반가운 얼굴들과 다시 인연을 이어 가는 시간이 되었으면 좋겠습니다",
    "다시 한 번 진심으로 환영합니다!",
]
report["captions_text"] = [{"clip": i + 1, "caption": s, "matches_transcript": s == e} for i, (s, e) in enumerate(zip(sentences, expected))]
report["captions_banned_words_found"] = [w for w in ["한울림", "버거", "한번"] if w in cfg]

# 자막이 가장 길게 펼쳐진 순간들의 스틸 (잘림 확인용)
# 각 문장의 마지막 단어가 밝아진 직후 (다음 문장으로 넘어가기 전) 프레임
cue_frames = []
for i, blk in enumerate(blocks):
    cues = re.findall(r"\{ start: ([\d.]+), end: ([\d.]+),(.*?)\] \}", blk, re.S)
    for ci, (cs, ce, body) in enumerate(cues):
        last_t = float(re.findall(r"t: ([\d.]+)", body)[-1])
        nxt = float(cues[ci + 1][0]) if ci + 1 < len(cues) else float(ce) + 0.25
        f = min(last_t + 0.3, (nxt - 0.12) - 7 / FPS)
        cue_frames.append(STARTS[i] + int(f * FPS))
Wc, Hc = 960, 540
cap = Image.new("RGB", (Wc * 2, Hc * ((len(cue_frames) + 1) // 2)), "gray")
for j, f in enumerate(cue_frames):
    im = grab(f, (Wc, Hc))
    ImageDraw.Draw(im).text((6, 6), f"f{f}", fill="white")
    cap.paste(im, ((j % 2) * Wc, (j // 2) * Hc))
cap.save(QA / "captions.jpg", quality=88)


def lum(c):
    c = [x / 255 for x in c]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return round((la + 0.05) / (lb + 0.05), 2)


def over(rgb, alpha, under):
    return tuple(alpha * c + (1 - alpha) * u for c, u in zip(rgb, under))


WHITE, YELLOW = (255, 255, 255), (255, 225, 77)
worst_bg = (255, 255, 255)  # 자막 뒤 영상이 완전히 흰색인 최악의 경우
pill = over((16, 48, 61), 0.74, worst_bg)
lt = over((8, 27, 35), 0.62, worst_bg)
report["contrast_worst_case"] = {
    "caption_white_on_pill": contrast(WHITE, pill),
    "caption_yellow_on_pill": contrast(YELLOW, pill),
    "caption_dim_word(38%)_on_pill": contrast(over(WHITE, 0.38, pill), pill),
    "lowerthird_white": contrast(WHITE, lt),
    "lowerthird_yellow_index": contrast(YELLOW, lt),
    "endcard_white_on_navy": contrast(WHITE, (16, 48, 61)),
    "endcard_yellow_on_navy": contrast(YELLOW, (16, 48, 61)),
}
# 영상 4 대형 타이포: 실제 프레임에서 글자 뒤 배경 밝기 측정
f4 = STARTS[3] + int(3.0 * FPS)
im = grab(f4, (1920, 1080))
arr = np.asarray(im).astype(float)
band = arr[880:1040, 300:1620]
report["climax_frame"] = f4
report["climax_text_band_bg_p90_luma"] = round(float(np.percentile(band.mean(2), 90)), 1)

(QA / "qa_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1, default=float), encoding="utf-8")
print(json.dumps({k: v for k, v in report.items() if k != "probe"}, ensure_ascii=False, indent=1, default=float))
print("frames:", total_frames, "duration:", p["format"]["duration"])
