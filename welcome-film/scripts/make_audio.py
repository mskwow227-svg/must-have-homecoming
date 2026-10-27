"""오리지널 배경음악과 효과음을 numpy로 직접 합성한다 (외부 음원 사용 없음 → 저작권 문제 없음).

출력 (public/audio):
  music.wav         앰비언트 테마 (인트로~영상 구간). D–A–Bm–G 진행
  finale.wav        45.07s부터: 빌드업 → 엔드카드에서 터지는 128BPM 앤섬 → 빅 엔딩
  sfx_tick.wav      카운터 숫자 틱
  sfx_impact.wav    "20" 정지 임팩트
  sfx_whoosh.wav    0 속으로 빨려 들어가는 우쉬
  sfx_swoosh.wav    카드 전환용 아주 작은 스우시
  sfx_sparkle.wav   반짝임

덕킹(말하는 구간에서 음악 낮추기)은 Remotion 쪽 볼륨 커브에서 처리한다.
사용법: python scripts/make_audio.py
"""
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
SR = 48000
TOTAL = 1571 / 30          # 마스터 길이 (초)
THEME_START = 3.3          # 임팩트 직후 테마 시작
RESOLVE_AT = 1421 / 30     # 엔드카드 시작 = D 코드로 귀결
BARS = 12
BAR = (RESOLVE_AT - THEME_START) / BARS
rng = np.random.default_rng(20261031)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):  # 짧은 신호에만 사용
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def fft_lp(x, cutoff, slope=4.0):
    """주파수 영역에서 부드러운 로우패스 (긴 신호용)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** (2 * slope))
    return np.fft.irfft(X, len(x))


def reverb(x, seconds=2.8, mix=0.35, seed=0):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = r.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        ir = fft_lp(ir, 5000, 1.5)
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt((ir ** 2).sum())
        size = 1 << int(np.ceil(np.log2(len(x) + n)))
        wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
        out.append((1 - mix) * x + mix * wet * 0.9)
    return np.stack(out, 1)


def env_adsr(n, a, d, s, r):
    e = np.full(n, s)
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    e[na:na + nd] = np.linspace(1, s, nd)
    e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def pad_voice(freq, sec):
    t = t_axis(sec)
    sig = np.zeros_like(t)
    for det in (-0.07, 0.0, 0.06):
        f = freq * 2 ** (det / 12)
        ph = rng.uniform(0, 2 * np.pi)
        # 부드러운 톱니파 근사 (배음 6개)
        for k in range(1, 7):
            sig += np.sin(2 * np.pi * f * k * t + ph * k) / k ** 1.6
    return sig


def bell(freq, sec=2.2, bright=1.0):
    t = t_axis(sec)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 1.8 * bright * np.exp(-t * 5)
    s = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t * 2.6)
    s += 0.25 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 5)
    att = int(0.004 * SR)
    s[:att] *= np.linspace(0, 1, att)
    return s


def place(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]


def write(name, stereo):
    stereo = np.asarray(stereo, dtype=np.float64)
    if stereo.ndim == 1:
        stereo = np.stack([stereo, stereo], 1)
    peak = np.abs(stereo).max()
    stereo = stereo / peak * 0.89 if peak > 0 else stereo
    data = (stereo * 32767).astype("<i2")
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def music():
    n = int(round(TOTAL * SR))
    pad = np.zeros(n)
    arp = np.zeros(n)
    mel = np.zeros(n)
    bass = np.zeros(n)

    # 0~3.3초: D sus2 드론이 점점 열림 (카운터 구간)
    intro = pad_voice(midi(50), THEME_START + 0.4) + pad_voice(midi(57), THEME_START + 0.4) \
        + 0.7 * pad_voice(midi(64), THEME_START + 0.4)
    intro *= env_adsr(len(intro), 1.6, 0.1, 1.0, 0.6)
    intro = fft_lp(intro, 900)
    place(pad, intro * 0.5, 0.0)

    chords = [  # D, A/C#, Bm, G (근음, 구성음)
        (38, [62, 66, 69, 74]),
        (37, [61, 64, 69, 73]),
        (35, [62, 66, 71, 74]),
        (31, [62, 67, 71, 74]),
    ]
    for b in range(BARS):
        start = THEME_START + b * BAR
        root, notes = chords[b % 4]
        p = sum(pad_voice(midi(m - 12), BAR + 1.2) for m in notes[:3])
        p *= env_adsr(len(p), 0.9, 0.2, 0.9, 1.1)
        place(pad, fft_lp(p, 1400) * 0.32, start)
        bs = pad_voice(midi(root), BAR + 0.6) * env_adsr(int((BAR + 0.6) * SR), 0.05, 0.4, 0.7, 0.8)
        place(bass, fft_lp(bs, 220) * 0.5, start)
        pattern = [0, 1, 2, 3, 2, 1, 3, 2]
        for k, idx in enumerate(pattern):
            place(arp, bell(midi(notes[idx] + 12), 1.8, 0.6) * (0.22 if k % 2 else 0.3), start + k * BAR / 8)

    # 테마 멜로디: 인트로 타이틀 구간(2마디)과 엔드카드에서만 노래함
    motif = [(0, 78, 1.0), (1.0, 76, 0.5), (1.5, 74, 0.5), (2.0, 76, 1.0), (3.0, 81, 1.0)]
    for b in (0, 1):
        for beat, m, _ in motif:
            place(mel, bell(midi(m), 2.6, 0.9) * 0.45, THEME_START + b * BAR + beat * BAR / 4)

    # 엔드카드 부분은 finale.wav가 맡는다 (이 트랙은 Remotion에서 빌드업 동안 페이드아웃)

    dry = pad + bass * 0.55 + arp * 1.1 + mel * 1.2
    D = np.fft.rfft(dry)
    f = np.fft.rfftfreq(len(dry), 1 / SR)
    D *= 1 / np.sqrt(1 + (45 / np.maximum(f, 1)) ** 8)  # 하이패스 45Hz: 저역 웅웅거림 제거
    dry = np.fft.irfft(D, len(dry))
    st = reverb(dry, 3.2, 0.42, seed=7)
    # 스테레오 폭: 아르페지오를 살짝 좌우로
    st[:, 0] += arp * 0.08
    st[:, 1] -= arp * 0.02
    # 마지막 0.8초 페이드아웃
    fo = int(0.8 * SR)
    st[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    fi = int(0.05 * SR)
    st[:fi] *= np.linspace(0, 1, fi)[:, None]
    write("music.wav", st)


# ─────────────────────────────────────────────────────────────
#  피날레: 영상 4 외침 직후 빌드업 → 엔드카드에서 터지는 128BPM 앤섬 → 빅 엔딩
# ─────────────────────────────────────────────────────────────
FINALE_START = 1352 / 30   # 영상 4 외침이 끝나는 지점 (Soundtrack.tsx의 FINALE_FROM과 같아야 함)
HIT = RESOLVE_AT - FINALE_START  # finale.wav 안에서 엔드카드 첫 프레임 위치
BPM = 128
BEAT = 60 / BPM


def saw(freq, sec, phase=0.0):
    t = t_axis(sec)
    return 2 * ((freq * t + phase) % 1.0) - 1


def supersaw(freq, sec, voices=7, spread=0.22):
    out = np.zeros(int(sec * SR))
    for v in range(voices):
        det = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
        out += saw(freq * 2 ** (det / 12), sec, rng.uniform())
    return out / voices


def kick(sec=0.45, punch=1.0):
    t = t_axis(sec)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    k = np.sin(ph) * np.exp(-t * 7.5)
    k += rng.standard_normal(len(t)) * np.exp(-t * 300) * 0.25 * punch
    return np.tanh(k * 1.6)


def clap(sec=0.35):
    t = t_axis(sec)
    n = rng.standard_normal(len(t))
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.022):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) * (60 if d < 0.02 else 14))
    body = fft_lp(n, 2600, 2) - fft_lp(n, 900, 2)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4
    return body * env * 1.4 + tone


def hat(sec=0.07, open_=False):
    t = t_axis(0.32 if open_ else sec)
    n = rng.standard_normal(len(t))
    n = n - fft_lp(n, 7000, 3)
    return n * np.exp(-t * (11 if open_ else 70))


def crash(sec=2.6):
    t = t_axis(sec)
    n = rng.standard_normal(len(t))
    n = n - fft_lp(n, 4500, 2)
    return n * np.exp(-t * 1.9) * (1 - np.exp(-t * 400))


def timpani(freq=55, sec=2.0):
    t = t_axis(sec)
    s = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 1.5 * t) * np.exp(-t * 4)
    s += rng.standard_normal(len(t)) * np.exp(-t * 60) * 0.3
    return s * np.exp(-t * 2.2)


def brass(freq, sec):
    """금관 느낌 리드: 톱니파 + 어택에서 열리는 필터 + 비브라토."""
    t = t_axis(sec)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.25, 0, 1)
    ph = np.cumsum(freq * vib) / SR
    s = 2 * (ph % 1.0) - 1 + 0.6 * (2 * ((ph * 1.003) % 1.0) - 1)
    bright = fft_lp(s, 4200, 2)
    dark = fft_lp(s, 900, 2)
    open_env = np.clip(t / 0.06, 0, 1) * np.exp(-t * 1.2)
    out = dark + (bright - dark) * open_env
    return out * env_adsr(len(t), 0.03, 0.15, 0.8, min(0.12, sec * 0.3))


def finale():
    total = TOTAL - FINALE_START
    n = int(round(total * SR))
    drums = np.zeros(n)
    bassb = np.zeros(n)
    chords = np.zeros(n)
    lead = np.zeros(n)
    fx = np.zeros(n)
    beat_t = lambda b: HIT + b * BEAT  # b=0 이 엔드카드 첫 프레임

    # ── 빌드업 (HIT 이전 약 2.3초) ──
    # 라이저: 위로 쓸려 올라가는 노이즈 + 상승하는 톱니파
    rise_len = HIT
    t = t_axis(rise_len)
    noise = rng.standard_normal(len(t))
    riser = np.zeros(len(t))
    hop = 2048
    for s in range(0, len(t), hop):
        seg = noise[s:s + hop]
        c = 400 * (14 ** ((s / len(t)) ** 1.5))
        S = np.fft.rfft(seg)
        ff = np.fft.rfftfreq(len(seg), 1 / SR)
        S *= np.exp(-((np.log(ff + 1) - np.log(c)) ** 2) / 0.35)
        riser[s:s + hop] = np.fft.irfft(S, len(seg))
    riser *= (t / rise_len) ** 2.2
    whoop_f = 110 * 2 ** (3 * (t / rise_len) ** 2)
    whoop = 2 * ((np.cumsum(whoop_f) / SR) % 1.0) - 1
    riser += fft_lp(whoop, 3000, 2) * (t / rise_len) ** 3 * 0.25
    place(fx, riser * 0.9, 0)

    # 가속하는 스네어 롤: 4분 → 8분 → 16분 → 32분
    roll = []
    for b in np.arange(-4, -2, 1.0):
        roll.append(b)
    for b in np.arange(-2, -1, 0.5):
        roll.append(b)
    for b in np.arange(-1, -0.5, 0.25):
        roll.append(b)
    for b in np.arange(-0.5, -0.0625, 0.125):
        roll.append(b)
    for b in roll:
        level = 0.35 + 0.65 * (b + 4) / 4
        place(drums, clap(0.25) * level * 0.7, beat_t(b))
    for b in (-4, -3, -2, -1):
        place(drums, kick(0.35, 0.6) * 0.75, beat_t(b))
    # 빌드업 동안 D 페달 베이스가 크레셴도
    pedal_len = HIT
    ped = fft_lp(supersaw(midi(38), pedal_len, 3, 0.1), 400, 2) * (t_axis(pedal_len) / pedal_len) ** 2
    place(bassb, ped * 0.6, 0)

    # ── 히트 + 앤섬 (8박) ──
    def hit_at(when, chord_notes, root):
        place(drums, kick(0.6, 1.2) * 1.1, when)
        place(fx, timpani(midi(root - 12), 2.4) * 0.9, when)
        place(fx, crash(2.8) * 0.55, when)
        stab = sum(supersaw(midi(m), 1.8) for m in chord_notes)
        stab = fft_lp(stab, 5200, 2) * np.exp(-t_axis(1.8) * 1.3)
        place(chords, stab * 0.6, when)
        bs = fft_lp(saw(midi(root), 1.6), 300, 3) * np.exp(-t_axis(1.6) * 1.5)
        place(bassb, bs * 0.9, when)

    D_CH = [50, 57, 62, 66, 69, 74]
    hit_at(beat_t(0), D_CH, 38)

    prog_ = [(0, 4, 38, [62, 66, 69, 74]), (4, 2, 43, [62, 67, 71, 74]), (6, 2, 45, [61, 64, 69, 73])]
    for start_b, length_b, root, notes in prog_:
        for k in range(length_b * 2):  # 8분음표 펌핑 코드 + 베이스
            b = start_b + k * 0.5
            if b == 0:
                continue  # 첫 박은 히트가 맡음
            dur = BEAT * 0.5
            st = sum(supersaw(midi(m), dur + 0.05) for m in notes)
            st = fft_lp(st, 6000, 2) * env_adsr(int((dur + 0.05) * SR), 0.004, 0.08, 0.6, 0.04)
            place(chords, st * 0.32, beat_t(b))
        for k in range(length_b * 2):
            b = start_b + k * 0.5
            dur = BEAT * 0.5
            octave = 12 if k % 2 else 0
            bs = fft_lp(saw(midi(root + octave), dur), 700, 3) * env_adsr(int(dur * SR), 0.003, 0.05, 0.75, 0.03)
            place(bassb, bs * 0.55, beat_t(b))

    for b in range(8):  # 4-on-the-floor + 2·4박 클랩 + 하이햇
        if b > 0:
            place(drums, kick(0.42) * 0.95, beat_t(b))
        if b % 2 == 1:
            place(drums, clap() * 0.6, beat_t(b))
        place(drums, hat(open_=True) * 0.22, beat_t(b + 0.5))
        for s16 in (0.25, 0.75):
            place(drums, hat() * 0.16, beat_t(b + s16))
    place(drums, clap(0.25) * 0.4, beat_t(7.5))  # 엔딩 직전 필
    place(drums, clap(0.25) * 0.5, beat_t(7.75))

    # 영웅적인 리드 멜로디 (D 장조)
    melody = [(0, 69, 1), (1, 74, 0.5), (1.5, 76, 0.5), (2, 78, 2), (4, 79, 1), (5, 78, 0.5),
              (5.5, 76, 0.5), (6, 76, 1), (7, 73, 0.5), (7.5, 76, 0.5)]
    for b, m, d in melody:
        place(lead, brass(midi(m), d * BEAT + 0.08) * 0.42, beat_t(b))
        place(lead, brass(midi(m - 12), d * BEAT + 0.08) * 0.18, beat_t(b))

    # ── 빅 엔딩: 8박 뒤 D 코드 풀 히트, 끝까지 울림 ──
    end_b = 8
    hit_at(beat_t(end_b), D_CH + [78, 81], 38)
    place(lead, brass(midi(86), total - beat_t(end_b)) * 0.4, beat_t(end_b))
    place(lead, brass(midi(74), total - beat_t(end_b)) * 0.25, beat_t(end_b))

    # 사이드체인 펌핑: 킥이 칠 때마다 코드·베이스가 숨을 쉼
    pump = np.ones(n)
    tt = np.arange(n) / SR
    for b in list(range(0, 8)) + [end_b]:
        k0 = beat_t(b)
        m = tt >= k0
        pump[m] = np.minimum(pump[m], 1 - 0.55 * np.exp(-(tt[m] - k0) * 9))
    chords *= pump
    bassb *= pump

    music_bus = chords + lead + bassb * 0.9
    wet = reverb(music_bus, 2.2, 0.28, seed=11)
    dr = reverb(drums, 0.8, 0.12, seed=12)
    fxs = reverb(fx, 2.5, 0.3, seed=13)
    mix = wet + dr * 0.9 + fxs * 0.8
    # 스테레오 폭: 코드를 좌우로 살짝
    mix[:, 0] += chords * 0.06
    mix[:, 1] -= chords * 0.06
    # 하이패스 30Hz + 소프트 클립 (단단하게)
    for ch in range(2):
        X = np.fft.rfft(mix[:, ch])
        f = np.fft.rfftfreq(n, 1 / SR)
        X *= 1 / np.sqrt(1 + (30 / np.maximum(f, 1)) ** 8)
        mix[:, ch] = np.fft.irfft(X, n)
    mix = np.tanh(mix / np.abs(mix).max() * 1.8) / np.tanh(1.8)
    fo = int(0.45 * SR)
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    write("finale.wav", mix)


def sfx():
    # 틱: 짧은 고역 클릭 + 작은 사인 블립
    t = t_axis(0.06)
    tick = np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 90) * 0.6
    tick += rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.25
    write("sfx_tick.wav", reverb(tick, 0.4, 0.15, 1))

    # 임팩트: 서브 드롭 + 노이즈 버스트 + 벨 샤인
    t = t_axis(3.0)
    sub = np.sin(2 * np.pi * (70 * np.exp(-t * 2.2) + 38) * t) * np.exp(-t * 2.4)
    burst = onepole_lp(rng.standard_normal(len(t)) * np.exp(-t * 18), 1800)
    shine = bell(midi(86), 3.0, 1.2) * 0.35 + bell(midi(93), 3.0, 1.0) * 0.2
    write("sfx_impact.wav", reverb(sub * 1.0 + burst * 0.5 + shine, 2.5, 0.35, 2))

    # 우쉬: 밴드패스가 위로 쓸려 올라가는 노이즈 (0.7초, 끝이 가장 큼)
    sec = 0.9
    t = t_axis(sec)
    noise = rng.standard_normal(len(t))
    X = np.fft.rfft(noise)
    f = np.fft.rfftfreq(len(noise), 1 / SR)
    out = np.zeros(len(t))
    hop = 2048
    for s in range(0, len(t), hop):  # 프레임별 필터 스윕
        seg = slice(s, s + hop)
        c = 300 + 5000 * (s / len(t)) ** 2
        seg_noise = noise[seg]
        S = np.fft.rfft(seg_noise)
        ff = np.fft.rfftfreq(len(seg_noise), 1 / SR)
        S *= np.exp(-((np.log(ff + 1) - np.log(c)) ** 2) / 0.5)
        out[seg] = np.fft.irfft(S, len(seg_noise))
    out *= np.sin(np.pi * np.clip(t / sec, 0, 1) ** 1.6) ** 2
    write("sfx_whoosh.wav", reverb(out, 1.2, 0.3, 3))

    # 카드 전환 스우시: 아주 짧고 부드럽게 (0.3초)
    sec = 0.32
    t = t_axis(sec)
    sw = fft_lp(rng.standard_normal(len(t)), 2500, 2) * np.sin(np.pi * t / sec) ** 3
    write("sfx_swoosh.wav", reverb(sw, 0.6, 0.25, 4))

    # 반짝임: 높은 벨 몇 개를 흩뿌림
    buf = np.zeros(int(2.4 * SR))
    for k, m in enumerate([93, 98, 95, 100, 97, 102]):
        place(buf, bell(midi(m), 1.6, 0.4) * (0.5 - k * 0.05), k * 0.07 + rng.uniform(0, 0.03))
    write("sfx_sparkle.wav", reverb(buf, 1.8, 0.4, 5))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    music()
    finale()
    sfx()
    print("ok")
