import os, pathlib, subprocess, urllib.request, json

OUT = pathlib.Path(os.environ.get("MEDIA_OUT", "/tmp/dismissed-media"))
OUT.mkdir(parents=True, exist_ok=True)

FONT_COND = "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

PRODUCTS = [
    {"title":"SEEN NOTHING","case":"01","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/seen-nothing-oversized-t-shirt-case-no-1-black.png?v=1771786893","accent":"B3151D","kind":"cond","micro":"OPTICAL / VISION / SILENCE","freq":52},
    {"title":"SAY NOTHING","case":"02","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/say-nothing-oversized-t-shirt-case-no-2-black.png?v=1771786980","accent":"D9D9D4","kind":"cond","micro":"VOICE / ABSENCE / CONTROL","freq":57},
    {"title":"HEARD NOTHING","case":"03","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/hear-nothing-oversized-t-shirt-case-no-3-black.png?v=1771787018","accent":"8D1118","kind":"serif","micro":"SIGNAL / STATIC / SILENCE","freq":61},
    {"title":"BREAKDOWN","case":"04","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/BREAKDOWN-oversized-t-shirt-case-no-3-black1.png?v=1771787098","accent":"E14B18","kind":"cond","micro":"SYSTEM / FRACTURE / RESET","freq":66},
    {"title":"FEEL NOTHING","case":"05","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/feel-nothing-oversized-t-shirt-case-no-6-black1.png?v=1771787131","accent":"D6D6D0","kind":"cond","micro":"EMOTION / CONTROL / 20ML","freq":44},
    {"title":"MY MOM SAID I COULD","case":"06","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/mymomsayidicould-oversized-t-shirt-case-no-6-black1.png?v=1771787187","accent":"8F191E","kind":"serif","micro":"FAITH / YOUTH / PERMISSION","freq":49},
    {"title":"DON'T SCREAM","case":"07","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/dont-scream-oversized-t-shirt-case-no-7-black1.png?v=1771787234","accent":"C92020","kind":"serif","micro":"NOISE / RESTRAINT / PRESSURE","freq":71},
    {"title":"INSIDE THE RUIN","case":"11","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/inside-the-ruin-case-no-8-black1.png?v=1774302031","accent":"760C13","kind":"serif","micro":"ART / DECAY / IDENTITY","freq":46},
    {"title":"DON'T TAG ME","case":"15","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/donttagme1.jpg?v=1775852166","accent":"EB490E","kind":"cond","micro":"LABELS / REJECTED / FREE","freq":58},
    {"title":"FUTURE ME","case":"16","image":"https://cdn.shopify.com/s/files/1/0989/0460/5011/files/spatenegru.png?v=1776085499","accent":"E6E5DF","kind":"cond","micro":"NEXT / SELF / UNWRITTEN","freq":63},
]

def bucharest_day(offset_days=0):
    import datetime, zoneinfo
    now = datetime.datetime.now(zoneinfo.ZoneInfo("Europe/Bucharest")) + datetime.timedelta(days=offset_days)
    return now.strftime("%Y-%m-%d")

def day_index(day):
    return int(day.replace("-", ""))

def pick(day, slot):
    return PRODUCTS[(day_index(day) * 5 + slot) % len(PRODUCTS)]

def sh(cmd):
    print(" ".join(str(x) for x in cmd), flush=True)
    subprocess.run(cmd, check=True)

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())

def verify(out):
    p = subprocess.run([
        "ffprobe","-v","error","-show_entries",
        "stream=codec_type,codec_name,sample_rate,channels,width,height,r_frame_rate",
        "-of","json",str(out)
    ], capture_output=True, text=True, check=True)
    data = json.loads(p.stdout)
    streams = data.get("streams", [])
    video = [x for x in streams if x.get("codec_type") == "video"]
    audio = [x for x in streams if x.get("codec_type") == "audio"]
    if not video:
        raise RuntimeError(f"NO VIDEO STREAM: {out}")
    if not audio:
        raise RuntimeError(f"NO AUDIO STREAM: {out}")
    if audio[0].get("codec_name") != "aac":
        raise RuntimeError(f"AUDIO MUST BE AAC: {out}")
    print("VERIFIED VIDEO+AUDIO", out, flush=True)

def render(day, slot):
    p = pick(day, slot)
    d = OUT / day
    d.mkdir(parents=True, exist_ok=True)
    ext = ".jpg" if ".jpg" in p["image"].lower() else ".png"
    img = pathlib.Path("/tmp") / f"dismissed-{day}-{slot}{ext}"
    download(p["image"], img)

    titlefile = pathlib.Path("/tmp") / f"title-{day}-{slot}.txt"
    titlefile.write_text(p["title"])
    title_path = str(titlefile).replace(":", "\\:").replace("'", "\\'")
    font_title = FONT_SERIF if p["kind"] == "serif" else FONT_COND
    accent = p["accent"]
    micro = p["micro"]

    fc = f"""
color=c=0x060606:s=1080x1920:d=7:r=24[bg];
[0:v]split=5[p0][p1][p2][p3][p4];
[p0]scale=1000:1000,zoompan=z='1.0+0.03*on/168':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=168:s=1000x1000:fps=24[full];
[p1]crop=980:980:534:560,scale=1500:1500,zoompan=z='1.0+0.018*on/168':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=168:s=1500x1500:fps=24[macro];
[p2]crop=1050:620:499:200,scale=320:520:force_original_aspect_ratio=increase,crop=320:520[collar];
[p3]crop=840:840:604:620,scale=320:520:force_original_aspect_ratio=increase,crop=320:520[print];
[p4]crop=1050:560:499:1180,scale=320:520:force_original_aspect_ratio=increase,crop=320:520[hem];
[bg]
 drawtext=fontfile='{FONT_MONO}':text='DISMISSED / MEN':fontsize=20:fontcolor=white@0.46:x=64:y=66,
 drawtext=fontfile='{FONT_MONO}':text='2026':fontsize=20:fontcolor=white@0.46:x=w-text_w-64:y=66,
 drawbox=x=64:y=110:w=952:h=1:color=white@0.16:t=fill,
 drawtext=fontfile='{font_title}':textfile='{title_path}':fontsize=160:fontcolor=white@0.12:x='(w-text_w)/2+20*sin(t*1.5)':y=210:enable='between(t,0.55,2.2)+between(t,4.15,5.15)',
 drawtext=fontfile='{font_title}':textfile='{title_path}':fontsize=160:fontcolor=0x{accent}@0.10:x='(w-text_w)/2-18*sin(t*1.2)':y=1270:enable='between(t,0.55,2.2)+between(t,4.15,5.15)',
 drawbox=x='-220+mod(t*420,1520)':y=360:w=4:h=1180:color=0x{accent}@0.70:t=fill:enable='between(t,0.55,2.2)+between(t,4.15,5.15)',
 drawtext=fontfile='{FONT_MONO}':text='{micro}':fontsize=18:fontcolor=white@0.54:x=68:y=545:enable='between(t,0.6,2.2)+between(t,4.15,5.15)'[base];
[base][full]overlay=x=40:y=470:enable='between(t,0.55,2.2)+between(t,4.15,5.25)'[s1];
[s1][macro]overlay=x='-210+40*sin(t*2.2)':y=250:enable='between(t,2.2,3.15)'[s2];
[s2]drawbox=x=0:y=0:w=1080:h=1920:color=black@0.18:t=fill:enable='between(t,2.2,3.15)',
 drawtext=fontfile='{font_title}':textfile='{title_path}':fontsize=86:fontcolor=white:x=70:y=1400:enable='between(t,2.25,3.15)',
 drawtext=fontfile='{FONT_MONO}':text='DETAIL / ORIGINAL PRODUCT':fontsize=20:fontcolor=0x{accent}:x=73:y=1510:enable='between(t,2.25,3.15)'[s3];
[s3][collar]overlay=x=40:y=635:enable='between(t,3.15,4.2)'[s4];
[s4][print]overlay=x=380:y=635:enable='between(t,3.15,4.2)'[s5];
[s5][hem]overlay=x=720:y=635:enable='between(t,3.15,4.2)'[s6];
[s6]
 drawbox=x=40:y=615:w=320:h=560:color=white@0.20:t=2:enable='between(t,3.15,4.2)',
 drawbox=x=380:y=615:w=320:h=560:color=0x{accent}@0.45:t=2:enable='between(t,3.15,4.2)',
 drawbox=x=720:y=615:w=320:h=560:color=white@0.20:t=2:enable='between(t,3.15,4.2)',
 drawtext=fontfile='{FONT_MONO}':text='01 / COLLAR':fontsize=17:fontcolor=white@0.64:x=42:y=1195:enable='between(t,3.15,4.2)',
 drawtext=fontfile='{FONT_MONO}':text='02 / PRINT':fontsize=17:fontcolor=0x{accent}:x=382:y=1195:enable='between(t,3.15,4.2)',
 drawtext=fontfile='{FONT_MONO}':text='03 / FIT':fontsize=17:fontcolor=white@0.64:x=722:y=1195:enable='between(t,3.15,4.2)',
 drawtext=fontfile='{font_title}':text='PRODUCT LOCK':fontsize=66:fontcolor=white:x=(w-text_w)/2:y=1405:enable='between(t,3.15,4.2)'[s7];
[s7]
 drawbox=x=0:y=0:w=1080:h=1920:color=white@0.82:t=fill:enable='between(t,0.48,0.52)+between(t,2.18,2.22)+between(t,3.13,3.17)+between(t,4.18,4.22)+between(t,5.18,5.22)',
 drawbox=x=0:y=1380:w=1080:h=335:color=black@0.78:t=fill:enable='between(t,5.2,7)',
 drawtext=fontfile='{font_title}':textfile='{title_path}':fontsize=104:fontcolor=white:x=(w-text_w)/2:y=1430:enable='between(t,5.2,7)',
 drawtext=fontfile='{FONT_MONO}':text='DISMISSED.RO / AVAILABLE NOW':fontsize=24:fontcolor=white@0.62:x=(w-text_w)/2:y=1590:enable='between(t,5.2,7)',
 drawbox=x=70:y=1660:w='940*min(max((t-5.2)/1.4,0),1)':h=3:color=0x{accent}@0.90:t=fill:enable='between(t,5.2,7)',
 vignette=PI/5,noise=alls=2:allf=t[v];
[1:a]volume=0.16[a0];
[2:a]volume=0.08,highpass=f=700,lowpass=f=6500[a1];
[a0][a1]amix=inputs=2:duration=shortest,acompressor=threshold=-18dB:ratio=3,alimiter=limit=0.90,afade=t=in:st=0:d=0.05,afade=t=out:st=6.72:d=0.28[a]
""".replace("\n", " ")

    out = d / f"{slot}.mp4"
    sh([
        "ffmpeg","-hide_banner","-loglevel","error","-y",
        "-loop","1","-framerate","24","-i",str(img),
        "-f","lavfi","-i",f"sine=frequency={p['freq']}:sample_rate=48000:duration=7",
        "-f","lavfi","-i","anoisesrc=color=pink:sample_rate=48000:duration=7:amplitude=0.025",
        "-filter_complex",fc,
        "-map","[v]","-map","[a]",
        "-t","7","-r","24",
        "-c:v","libx264","-preset","fast","-crf","19","-pix_fmt","yuv420p",
        "-c:a","aac","-ar","48000","-ac","2","-b:a","160k",
        "-movflags","+faststart",str(out)
    ])
    verify(out)
    (d / f"{slot}.json").write_text(json.dumps({
        "title":p["title"],"caseNo":p["case"],"date":day,"slot":slot,
        "audio":True,"productLock":True,"engine":"V4_DYNAMIC"
    }, indent=2))

def main():
    dates = [bucharest_day(0), bucharest_day(1)]
    for d in dates:
        for s in range(5):
            print("RENDER", d, s, pick(d,s)["title"], flush=True)
            render(d,s)
    (OUT / "manifest.json").write_text(json.dumps({
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat()+"Z",
        "dates": dates,
        "engine":"V4_DYNAMIC",
        "audioMandatory":True
    }, indent=2))

if __name__ == "__main__":
    main()
