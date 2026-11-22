# modules/gl_engine.py
"""
Mesin preview GPU (OpenGL via moderngl) untuk CutRecipe Studio.
Efek, transisi, filter (LUT dari ffmpeg), adjustment, dan teks dihitung di GPU, jadi preview realtime tanpa render.
Warna filter dibuat lewat ffmpeg sendiri (Hald CLUT), jadi tampilannya sama dengan jalur ekspor ffmpeg.
"""
import os
import sys
import subprocess
import numpy as np
import av
import moderngl
from PIL import Image, ImageDraw, ImageFont

from modules.cut_recipe import (
    _filter_chain, _adjust_chain, split_color_spatial, _popen_kwargs,
)

LUT_N = 64
EFFECT_IDS = {k: i for i, k in enumerate([
    "none", "zoom_in", "zoom_out", "zoom_punch", "pulse", "shake", "shake_hard", "tilt", "glitch", "rgb_split",
    "vhs", "film_grain", "flash", "flash_negatif", "fade_in", "fade_out", "vignette", "blur_in", "bw_flash", "mirror",
    "kenburns"])}
TRANS_IDS = {k: i for i, k in enumerate([
    "cut", "fade", "fadeblack", "fadewhite", "dissolve", "distance", "wipeleft", "wiperight", "wipeup", "wipedown",
    "slideleft", "slideright", "slideup", "slidedown", "smoothleft", "smoothright", "circleopen", "circleclose",
    "circlecrop", "vertopen", "horzopen", "radial", "zoomin", "squeezeh", "pixelize", "hlslice", "vuslice"])}

VERT = """#version 330
in vec2 p; out vec2 uv;
void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }
"""

FRAG = """#version 330
uniform sampler2D A; uniform sampler2D B; uniform sampler2D TXT; uniform sampler2D WM; uniform float wmOn;
uniform sampler3D LUTF; uniform sampler3D LUTA;
uniform int useLutF; uniform int useLutA;
uniform float tA; uniform float dA; uniform float tB; uniform float dB;
uniform int fxA; uniform int fxB; uniform int tr; uniform float prog;
uniform float inten; uniform float vign; uniform float grain; uniform float sharp;
uniform float txtAlpha; uniform float aspect; uniform vec2 texel; uniform float zp; uniform float kbr;
in vec2 uv; out vec4 outc;

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
vec3 sat(vec3 c, float s){ float l = dot(c, vec3(0.299,0.587,0.114)); return mix(vec3(l), c, s); }

vec3 fetchRaw(sampler2D tex, vec2 q){
  vec3 c = texture(tex, q).rgb;
  if (sharp > 0.01){
    vec3 n = texture(tex, q+vec2(texel.x,0)).rgb + texture(tex, q-vec2(texel.x,0)).rgb
           + texture(tex, q+vec2(0,texel.y)).rgb + texture(tex, q-vec2(0,texel.y)).rgb;
    c = c + (c - n*0.25) * sharp * 1.5;
  }
  return c;
}

vec3 fx(sampler2D tex, vec2 u, int id, float t, float d){
  vec2 q = u; vec2 c = vec2(0.5);
  if (id==1) q = (u-c)/(1.0+0.15*t/max(d,0.1)) + c;
  else if (id==2) q = (u-c)/(1.15-0.15*t/max(d,0.1)) + c;
  else if (id==3) q = (u-c)/(1.0+0.22*max(0.0,1.0-t/0.25)) + c;
  else if (id==4) q = (u-c)/(1.0+0.05*abs(sin(t*6.0))) + c;
  else if (id==5) q = (u-c)/1.06 + c + vec2(sin(t*40.0)*0.02, cos(t*47.0)*0.02);
  else if (id==6) q = (u-c)/1.12 + c + vec2(sin(t*60.0)*0.05, cos(t*71.0)*0.05);
  else if (id==7){
    float a = 0.05*sin(t*5.0); vec2 p = (u-c)*vec2(aspect,1.0)/1.12;
    p = vec2(cos(a)*p.x - sin(a)*p.y, sin(a)*p.x + cos(a)*p.y); q = p/vec2(aspect,1.0) + c;
  }
  else if (id==19) q.x = 1.0 - u.x;
  else if (id==20) q = (u-c)/(1.0+kbr*t/max(d,0.1)) + c;
  vec3 col;
  if (id==8 && mod(t,0.6) < 0.12){
    col = vec3(fetchRaw(tex,q+vec2(0.008,0)).r, fetchRaw(tex,q).g, fetchRaw(tex,q-vec2(0.008,0)).b);
  } else if (id==9){
    col = vec3(fetchRaw(tex,q+vec2(0.005,0)).r, fetchRaw(tex,q).g, fetchRaw(tex,q-vec2(0.005,0)).b);
  } else if (id==10){
    col = vec3(fetchRaw(tex,q+vec2(0.003,0)).r, fetchRaw(tex,q).g, fetchRaw(tex,q-vec2(0.003,0)).b);
    col = sat(col,1.3) + (hash(u*vec2(521.0,433.0)+t)-0.5)*0.12;
  } else if (id==17 && t < 0.3){
    float r = (1.0 - t/0.3) * 12.0; vec3 s = vec3(0.0);
    for (int i=-2;i<=2;i++) for (int j=-2;j<=2;j++) s += texture(tex, q + vec2(float(i),float(j))*texel*r*0.5).rgb;
    col = s/25.0;
  } else col = fetchRaw(tex,q);
  if (id==11) col += (hash(u*vec2(641.0,347.0)+t)-0.5)*0.14;
  else if (id==12) col = mix(col, vec3(1.0), clamp(1.0 - t/0.25, 0.0, 1.0));
  else if (id==13 && t < 0.12) col = 1.0 - col;
  else if (id==14) col *= clamp(t/0.3, 0.0, 1.0);
  else if (id==15) col *= clamp((d-t)/0.3, 0.0, 1.0);
  else if (id==16){ float v = smoothstep(0.85, 0.25, length((u-c)*vec2(aspect,1.0))); col *= mix(0.45,1.0,v); }
  else if (id==18 && t < 0.35) col = vec3(dot(col, vec3(0.299,0.587,0.114)));
  return col;
}

vec3 getA(vec2 u){ return fx(A, u, fxA, tA, dA); }
vec3 getB(vec2 u){ return fx(B, u, fxB, tB, dB); }

vec3 transition(vec2 u, float p, int id){
  vec3 a, b;
  if (id==1){ return mix(getA(u), getB(u), p); }
  if (id==2){ return p<0.5 ? mix(getA(u), vec3(0.0), p*2.0) : mix(vec3(0.0), getB(u), (p-0.5)*2.0); }
  if (id==3){ return p<0.5 ? mix(getA(u), vec3(1.0), p*2.0) : mix(vec3(1.0), getB(u), (p-0.5)*2.0); }
  if (id==4){ float n = hash(floor(u*vec2(90.0*aspect,90.0))); return mix(getA(u), getB(u), smoothstep(n-0.05, n+0.05, p*1.1)); }
  if (id==5){ a=getA(u); b=getB(u); float dd = distance(a,b)/1.7321; return mix(a,b, smoothstep(0.0,0.2, p*1.2 - dd*0.6)); }
  if (id==6){ return u.x < 1.0-p ? getA(u) : getB(u); }
  if (id==7){ return u.x < p ? getB(u) : getA(u); }
  if (id==8){ return u.y > 1.0-p ? getB(u) : getA(u); }
  if (id==9){ return u.y < p ? getB(u) : getA(u); }
  if (id==10){ return u.x < 1.0-p ? getA(vec2(u.x+p,u.y)) : getB(vec2(u.x-(1.0-p),u.y)); }
  if (id==11){ return u.x > p ? getA(vec2(u.x-p,u.y)) : getB(vec2(u.x+(1.0-p),u.y)); }
  if (id==12){ return u.y < 1.0-p ? getA(vec2(u.x,u.y+p)) : getB(vec2(u.x,u.y-(1.0-p))); }
  if (id==13){ return u.y > p ? getA(vec2(u.x,u.y-p)) : getB(vec2(u.x,u.y+(1.0-p))); }
  if (id==14){ return mix(getA(u), getB(u), smoothstep(-0.25,0.0, p*1.25 - (1.0-u.x))); }
  if (id==15){ return mix(getA(u), getB(u), smoothstep(-0.25,0.0, p*1.25 - u.x)); }
  vec2 cc = (u-vec2(0.5))*vec2(aspect,1.0);
  if (id==16){ float r = length(cc); return mix(getA(u), getB(u), smoothstep(0.0,0.02, p*1.1 - r)); }
  if (id==17){ float r = length(cc); return mix(getB(u), getA(u), smoothstep(0.0,0.02, (1.0-p)*1.1 - r)); }
  if (id==18){ float r = length(cc); float m = smoothstep(0.0,0.02, p*1.1 - r); return mix(getA(u)*(1.0-p), getB(u), m); }
  if (id==19){ return abs(u.x-0.5)*2.0 < p ? getB(u) : getA(u); }
  if (id==20){ return abs(u.y-0.5)*2.0 < p ? getB(u) : getA(u); }
  if (id==21){
    float ang = fract(atan(u.x-0.5, -(u.y-0.5))/6.2831853 + 1.0);
    return mix(getA(u), getB(u), smoothstep(-0.01,0.01, p-ang));
  }
  if (id==22){ vec2 z = (u-vec2(0.5))/(1.0+2.0*p)+vec2(0.5); return mix(getA(z), getB(u), smoothstep(0.4,1.0,p)); }
  if (id==23){
    float k = max(1.0-p, 0.0001); float x = (u.x-0.5)/k + 0.5;
    return (x>=0.0 && x<=1.0) ? getA(vec2(x,u.y)) : getB(u);
  }
  if (id==24){
    float m = 1.0 - abs(2.0*p-1.0); float cells = mix(260.0, 10.0, m);
    vec2 g = vec2(cells*aspect, cells); vec2 q = (floor(u*g)+0.5)/g;
    return mix(getA(q), getB(q), p);
  }
  if (id==25){ return fract(u.x*8.0) < p ? getB(u) : getA(u); }
  if (id==26){ return fract(u.y*8.0*(1.0/aspect)*aspect) < p ? getB(u) : getA(u); }
  return getA(u);
}

void main(){
  vec2 u = vec2(uv.x, 1.0-uv.y);
  u = (u - vec2(0.5))/zp + vec2(0.5);
  vec3 c = (tr == 0) ? getA(u) : transition(u, prog, tr);
  c = clamp(c, 0.0, 1.0);
  if (useLutF == 1){
    vec3 g = texture(LUTF, c*(63.0/64.0)+0.5/64.0).rgb;
    c = mix(c, g, inten);
  }
  if (useLutA == 1){ c = texture(LUTA, clamp(c,0.0,1.0)*(63.0/64.0)+0.5/64.0).rgb; }
  if (vign > 0.01){ float v = smoothstep(0.95, 0.2, length((u-vec2(0.5))*vec2(aspect,1.0))); c *= mix(1.0-0.6*vign, 1.0, v); }
  if (grain > 0.01){ c += (hash(u*vec2(733.0,911.0)+fract(tA*7.0))-0.5)*grain*0.35; }
  vec4 t = texture(TXT, u);
  c = c*(1.0 - t.a*txtAlpha) + t.rgb*txtAlpha;
  vec4 w = texture(WM, u);
  c = c*(1.0 - w.a*wmOn) + w.rgb*(w.a*wmOn);
  outc = vec4(clamp(c,0.0,1.0), 1.0);
}
"""


# ---------------------------------------------------------- util: font & LUT
from modules.watermark import find_font  # noqa: E402


def make_lut(chain: str):
    """Jalankan rantai filter ffmpeg ke Hald CLUT level 8 -> array (64,64,64,3). None kalau netral."""
    if not chain:
        return None
    cmd = ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "haldclutsrc=level=8", "-vf", f"{chain},format=rgb24",
           "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    r = subprocess.run(cmd, capture_output=True, **_popen_kwargs(True))
    if r.returncode != 0 or len(r.stdout) != 512 * 512 * 3:
        raise RuntimeError("Gagal membuat LUT: " + r.stderr.decode("utf-8", "replace")[-200:])
    return np.frombuffer(r.stdout, dtype=np.uint8).reshape(LUT_N, LUT_N, LUT_N, 3)


# ---------------------------------------------------------- decoder
class VideoSource:
    def __init__(self, path, W, H):
        self.path, self.W, self.H = path, W, H
        self.c = av.open(path)
        self.s = self.c.streams.video[0]
        self.s.thread_type = "AUTO"
        self.tb = float(self.s.time_base)
        self.it = None
        self.cur = None      # (t, frame)
        self.nxt = None
        self._rgb_t = None
        self._rgb = None

    def _convert(self, f):
        return f.reformat(width=self.W, height=self.H, format="rgb24").to_ndarray()

    def _t(self, f):
        return float(f.pts * self.tb) if f.pts is not None else 0.0

    def _seek(self, t):
        self.c.seek(int(max(t, 0) / self.tb), stream=self.s, backward=True)
        self.it = self.c.decode(self.s)
        self.cur = self.nxt = None
        self._pull()

    def _pull(self):
        try:
            self.nxt = next(self.it)
        except StopIteration:
            self.nxt = None

    def frame_at(self, t):
        if self.it is None or self.cur is None and self.nxt is None or (self.cur and t < self._t(self.cur) - 0.0005) \
                or (self.nxt is not None and t > self._t(self.nxt) + 1.5):
            self._seek(t)
        while self.nxt is not None and self._t(self.nxt) <= t + 1e-4:
            self.cur = self.nxt
            self._pull()
        f = self.cur or self.nxt
        if f is None:
            return self._rgb
        ft = self._t(f)
        if self._rgb_t != ft:
            self._rgb = self._convert(f)
            self._rgb_t = ft
        return self._rgb

    def close(self):
        try:
            self.c.close()
        except Exception:
            pass


# ---------------------------------------------------------- engine
class GLEngine:
    def __init__(self, video_path, preview_h=480, fonts_dir="assets/fonts", size=None):
        self.video_path = video_path
        self.fonts_dir = fonts_dir
        if size:                      # mode komposisi: banyak sumber, ukuran keluaran ditentukan
            self.W, self.H = size
            self.duration = 0.0
        else:
            probe = av.open(video_path)
            vs = probe.streams.video[0]
            w, h = vs.codec_context.width, vs.codec_context.height
            self.duration = float(probe.duration / 1e6) if probe.duration else 0.0
            probe.close()
            self.H = min(preview_h, h) // 2 * 2
            self.W = int(round(w * self.H / h / 2) * 2)
        self.ctx = moderngl.create_standalone_context()
        self.prog = self.ctx.program(vertex_shader=VERT, fragment_shader=FRAG)
        vbo = self.ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], dtype="f4"))
        self.vao = self.ctx.vertex_array(self.prog, [(vbo, "2f", "p")])
        self.fbo = self.ctx.simple_framebuffer((self.W, self.H))
        self.texA = self._tex2d()
        self.texB = self._tex2d()
        self.texT = self.ctx.texture((self.W, self.H), 4)
        self.texT.filter = (moderngl.LINEAR, moderngl.LINEAR)
        self.texT.write(bytes(self.W * self.H * 4))
        self.texW = self.ctx.texture((self.W, self.H), 4)
        self.texW.filter = (moderngl.LINEAR, moderngl.LINEAR)
        self.texW.write(bytes(self.W * self.H * 4))
        self.wm_bbox = None
        ident = np.zeros((LUT_N, LUT_N, LUT_N, 3), dtype=np.uint8)
        self.lutF = self._tex3d(ident)
        self.lutA = self._tex3d(ident)
        self.texA.use(0); self.texB.use(1); self.texT.use(2); self.lutF.use(3); self.lutA.use(4); self.texW.use(5)
        for n, i in (("A", 0), ("B", 1), ("TXT", 2), ("LUTF", 3), ("LUTA", 4), ("WM", 5)):
            self.prog[n] = i
        self.prog["wmOn"] = 0.0
        self.prog["aspect"] = self.W / self.H
        self.prog["texel"] = (1.0 / self.W, 1.0 / self.H)
        self.srcA = VideoSource(video_path, self.W, self.H) if not size else None
        self.srcB = VideoSource(video_path, self.W, self.H) if not size else None
        self.kb_ratio = 0.04
        self.segs = []
        self.total = 0.0
        self.use_lutF = 0
        self.use_lutA = 0
        self.inten = 1.0
        self.sp = {"sharp": 0.0, "vignette": 0.0, "grain": 0.0}
        self.text_style = {}
        self._text_cache = {}
        self._look_key = None

    def _frame(self, seg_i, which, t):
        """Frame sumber untuk segmen seg_i pada waktu sumber t. Mode komposisi menimpa ini."""
        return (self.srcA if which == "A" else self.srcB).frame_at(t)

    def zoom_at(self, t):
        return 1.0

    def _tex2d(self):
        t = self.ctx.texture((self.W, self.H), 3)
        t.filter = (moderngl.LINEAR, moderngl.LINEAR)
        return t

    def _tex3d(self, arr):
        t = self.ctx.texture3d((LUT_N, LUT_N, LUT_N), 3, arr.tobytes())
        t.filter = (moderngl.LINEAR, moderngl.LINEAR)
        t.repeat_x = t.repeat_y = t.repeat_z = False
        return t

    # ---- proyek
    def set_segments(self, segs, transition_sec=0.3):
        """segs: list dict {start,end,text,effect,transition} (hasil parse_recipe)."""
        out, acc = [], 0.0
        for i, s in enumerate(segs):
            st, en = s["start"], min(s["end"], self.duration or s["end"])
            if en <= st:
                continue
            d = en - st
            tr = s.get("transition", "cut") if out else "cut"
            td = 0.0
            if tr != "cut" and out:
                dp = out[-1]["d"]
                td = max(0.05, min(transition_sec, 0.45 * min(dp, d)))
            t0 = acc - td if out else 0.0
            out.append({"start": st, "end": en, "d": d, "tr": tr, "td": td, "t0": t0, "show0": t0 + td, "show1": t0 + d,
                        "fx": s.get("effect", "none"), "text": s.get("text", "")})
            acc = t0 + d
        self.segs, self.total = out, acc
        self._text_cache.clear()

    @staticmethod
    def compute_look(filter_preset="none", adjust=None):
        """Bagian berat (panggil ffmpeg), aman dijalankan di thread. Hasilnya dipasang lewat apply_look di thread GL."""
        fchain, sp1 = split_color_spatial(_filter_chain(filter_preset))
        achain, sp2 = split_color_spatial(_adjust_chain(adjust))
        return {"lf": make_lut(fchain), "la": make_lut(achain), "sp": {k: max(sp1[k], sp2[k]) for k in sp1}}

    def apply_look(self, look, intensity=1.0):
        self.inten = float(intensity)
        self.use_lutF, self.use_lutA = int(look["lf"] is not None), int(look["la"] is not None)
        if look["lf"] is not None:
            self.lutF.write(look["lf"].tobytes())
        if look["la"] is not None:
            self.lutA.write(look["la"].tobytes())
        self.sp = look["sp"]

    def set_look(self, filter_preset="none", intensity=1.0, adjust=None):
        self.apply_look(self.compute_look(filter_preset, adjust), intensity)

    def set_watermark(self, wm):
        """wm: dict dari modules.watermark (None / enabled=False = mati). Mengembalikan bbox piksel atau None."""
        from modules.watermark import make_watermark_rgba
        arr, bbox = make_watermark_rgba(wm, self.W, self.H, self.fonts_dir)
        self.wm_bbox = bbox
        if arr is None:
            self.prog["wmOn"] = 0.0
        else:
            self.texW.write(arr.tobytes())
            self.prog["wmOn"] = 1.0
        return bbox

    def set_text_style(self, style):
        self.text_style = dict(style or {})
        self._text_cache.clear()

    # ---- teks
    def _text_rgba(self, i):
        seg = self.segs[i]
        key = (i, seg["text"])
        if key in self._text_cache:
            return self._text_cache[key]
        arr = np.zeros((self.H, self.W, 4), dtype=np.uint8)
        text = (seg["text"] or "").strip()
        if text:
            st = {"font_name": "Arial Black", "size_pct": 3.6, "text_hex": "FFFFFF", "outline_hex": "000000",
                  "position": "top", "offset_pct": 25, "bold": True, "box": False, "box_hex": "000000", "uppercase": False}
            st.update(self.text_style)
            if st.get("uppercase"):
                text = text.upper()
            size = max(12, round(self.H * st["size_pct"] / 100))
            f0 = find_font(st["font_name"], size, self.fonts_dir)
            try:   # libass: Fontsize = tinggi baris (ascent+descent), PIL: ukuran em -> samakan
                asc, desc = f0.getmetrics()
                em = max(8, round(size * size / (asc + desc)))
            except Exception:
                em = size
            font = find_font(st["font_name"], em, self.fonts_dir)
            img = Image.new("RGBA", (self.W, self.H), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            maxw = int(self.W * 0.88)
            words, lines, cur = text.split(), [], ""
            for w in words:
                trial = (cur + " " + w).strip()
                if d.textlength(trial, font=font) <= maxw or not cur:
                    cur = trial
                else:
                    lines.append(cur); cur = w
            if cur:
                lines.append(cur)
            lh = int(size)
            total_h = lh * len(lines)
            pos = st["position"]
            off = int(self.H * st["offset_pct"] / 100)
            y0 = off if pos == "top" else (self.H - off - total_h if pos == "bottom" else (self.H - total_h) // 2)
            _h = lambda v: str(v).lstrip("#")
            st = {**st, "text_hex": _h(st["text_hex"]), "outline_hex": _h(st["outline_hex"]), "box_hex": _h(st.get("box_hex", "000000"))}
            tc = tuple(int(st["text_hex"][i:i + 2], 16) for i in (0, 2, 4))
            oc = tuple(int(st["outline_hex"][i:i + 2], 16) for i in (0, 2, 4))
            bc = tuple(int(st.get("box_hex", "000000")[i:i + 2], 16) for i in (0, 2, 4))
            sw = max(2, round(size / 10))
            for k, ln in enumerate(lines):
                tw = d.textlength(ln, font=font)
                x = (self.W - tw) / 2
                y = y0 + k * lh
                if st["box"]:
                    pad = size * 0.25
                    d.rectangle([x - pad, y - pad * 0.3, x + tw + pad, y + lh - pad * 0.3], fill=bc + (255,))
                    d.text((x, y), ln, font=font, fill=tc + (255,))
                else:
                    d.text((x, y), ln, font=font, fill=tc + (255,), stroke_width=sw, stroke_fill=oc + (255,))
            arr = np.array(img)
        self._text_cache[key] = arr
        return arr

    # ---- render satu frame di waktu t (detik pada timeline hasil)
    def render(self, t):
        if not self.segs:
            return np.zeros((self.H, self.W, 3), dtype=np.uint8)
        t = min(max(t, 0.0), max(self.total - 1e-3, 0.0))
        idx = 0
        for i, s in enumerate(self.segs):
            if t >= s["t0"] - 1e-9:
                idx = i
        s = self.segs[idx]
        local = t - s["t0"]
        in_tr = idx > 0 and s["td"] > 0 and local < s["td"]
        P = self.prog
        if in_tr:
            sp = self.segs[idx - 1]
            fa = self._frame(idx - 1, "A", sp["start"] + (t - sp["t0"]))
            fb = self._frame(idx, "B", s["start"] + local)
            P["tr"] = TRANS_IDS.get(s["tr"], 1)
            P["prog"] = local / s["td"]
            P["tA"], P["dA"] = t - sp["t0"], sp["d"]
            P["tB"], P["dB"] = local, s["d"]
            P["fxA"], P["fxB"] = EFFECT_IDS.get(sp["fx"], 0), EFFECT_IDS.get(s["fx"], 0)
            self.texA.write(fa.tobytes()); self.texB.write(fb.tobytes())
        else:
            fa = self._frame(idx, "A", s["start"] + local)
            P["tr"] = 0
            P["prog"] = 0.0
            P["tA"], P["dA"] = local, s["d"]
            P["tB"], P["dB"] = 0.0, 1.0
            P["fxA"], P["fxB"] = EFFECT_IDS.get(s["fx"], 0), 0
            self.texA.write(fa.tobytes())
        P["useLutF"], P["useLutA"] = self.use_lutF, self.use_lutA
        P["inten"] = self.inten
        P["zp"] = self.zoom_at(t)
        P["kbr"] = self.kb_ratio
        P["vign"], P["grain"], P["sharp"] = self.sp["vignette"], self.sp["grain"], self.sp["sharp"]
        # teks: tampil di [show0, show1] dengan fade 0.18 s
        alpha = 0.0
        ti = idx
        if s["text"] and s["show0"] <= t <= s["show1"]:
            a_in = (t - s["show0"]) / 0.18
            a_out = (s["show1"] - t) / 0.18
            alpha = float(min(1.0, max(0.0, min(a_in, a_out))))
        P["txtAlpha"] = alpha
        if alpha > 0:
            self.texT.write(self._text_rgba(ti).tobytes())
        self.fbo.use()
        self.vao.render(moderngl.TRIANGLE_STRIP)
        return np.frombuffer(self.fbo.read(components=3), dtype=np.uint8).reshape(self.H, self.W, 3)[::-1]

    def close(self):
        for s_ in (self.srcA, self.srcB):
            if s_ is not None:
                s_.close()
        try:
            self.ctx.release()
        except Exception:
            pass
