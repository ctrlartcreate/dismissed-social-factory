import os, pathlib, subprocess, urllib.request, json, math, wave
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

OUT = pathlib.Path(os.environ.get("MEDIA_OUT", "/tmp/dismissed-media"))
OUT.mkdir(parents=True, exist_ok=True)

W,H = 1080,1920
FPS = 24
DUR = 6
N = FPS*DUR

def fc_font(pattern, fallback):
    try:
        p=subprocess.check_output(["fc-match","-f","%{file}",pattern], text=True).strip()
        return p if p and pathlib.Path(p).exists() else fallback
    except Exception:
        return fallback

FONT_BLACK = fc_font("Inter:style=Black", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
FONT_BOLD  = fc_font("Inter:style=Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
FONT_MED   = fc_font("Inter:style=Medium", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_REG   = fc_font("Inter", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_SERIF = fc_font("Noto Serif Display:style=Black", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf")
FONT_MONO  = fc_font("DejaVu Sans Mono", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")

PRODUCTS = [
    dict(slug="seen_nothing", title="SEEN NOTHING", display="SEEN NOTHING", case="01",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/seen-nothing-oversized-t-shirt-case-no-1-white.png?v=1771788135",
         accent=(34,34,210), style="surveillance", micro="OPTICAL / VISION / SILENCE"),
    dict(slug="say_nothing", title="SAY NOTHING", display="SAY NOTHING", case="02",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/say-nothing-oversized-t-shirt-case-no-2-white.png?v=1771788166",
         accent=(184,184,178), style="utility", micro="VOICE / ABSENCE / CONTROL"),
    dict(slug="heard_nothing", title="HEARD NOTHING", display="HEARD NOTHING", case="03",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/hear-nothing-oversized-t-shirt-case-no-3-white1.png?v=1771788194",
         accent=(28,24,150), style="surveillance", micro="SIGNAL / STATIC / SILENCE"),
    dict(slug="breakdown", title="BREAKDOWN", display="BREAKDOWN", case="04",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/BREAKDOWN-oversized-t-shirt-case-no-4-white1.png?v=1771788410",
         accent=(18,78,235), style="utility", micro="SYSTEM / FRACTURE / RESET"),
    dict(slug="feel_nothing", title="FEEL NOTHING", display="FEEL NOTHING", case="05",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/feel-nothing-oversized-t-shirt-case-no-5-white1.png?v=1771788377",
         accent=(180,168,150), style="clinical", micro="EMOTION / CONTROL / 20ML"),
    dict(slug="my_mom", title="MY MOM SAID I COULD", display="MY MOM|SAID I COULD", case="06",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/mymomsayidicould-oversized-t-shirt-case-no-6-white1.png?v=1771788446",
         accent=(35,24,130), style="gothic", micro="FAITH / YOUTH / PERMISSION"),
    dict(slug="dont_scream", title="DON'T SCREAM", display="DON'T SCREAM", case="07",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/dont-scream-oversized-t-shirt-case-no-7-white1.png?v=1771788472",
         accent=(28,28,190), style="gothic", micro="NOISE / RESTRAINT / PRESSURE"),
    dict(slug="inside_the_ruin", title="INSIDE THE RUIN", display="INSIDE THE RUIN", case="11",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/inside-the-ruin-case-no-8-white1.png?v=1774302027",
         accent=(20,22,125), style="editorial", micro="ART / DECAY / IDENTITY"),
    dict(slug="dont_tag_me", title="DON'T TAG ME", display="DON'T TAG ME", case="15",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/donttagmesitewhite.jpg?v=1775852166",
         accent=(14,76,235), style="utility", micro="LABELS / REJECTED / FREE"),
    dict(slug="future_me", title="FUTURE ME", display="FUTURE ME", case="16",
         image="https://cdn.shopify.com/s/files/1/0989/0460/5011/files/spatealb_f1e33b70-f05a-47e6-aaeb-191862170349.png?v=1776085576",
         accent=(196,196,190), style="editorial", micro="NEXT / SELF / UNWRITTEN"),
]

def local_day(offset=0):
    return (datetime.now(ZoneInfo("Europe/Bucharest")) + timedelta(days=offset)).strftime("%Y-%m-%d")

def pick(day, slot):
    return PRODUCTS[(int(day.replace("-",""))*5 + slot) % len(PRODUCTS)]

def download(url, dest):
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=90) as r, open(dest,"wb") as f:
        f.write(r.read())

def ease_out_cubic(x):
    x=np.clip(x,0,1)
    return 1-(1-x)**3

def ease_in_out(x):
    x=np.clip(x,0,1)
    return x*x*(3-2*x)

def remove_connected_dark(img_path):
    bgr=cv2.imread(str(img_path), cv2.IMREAD_COLOR)
    if bgr is None:
        raise RuntimeError("Image decode failed: "+str(img_path))
    mx=bgr.max(axis=2)
    cand=(mx<42).astype(np.uint8)*255
    h,w=cand.shape
    flood=cand.copy()
    mask=np.zeros((h+2,w+2),np.uint8)
    step=max(32,min(h,w)//28)
    for x in range(0,w,step):
        for y in (0,h-1):
            if flood[y,x]: cv2.floodFill(flood,mask,(x,y),128)
    for y in range(0,h,step):
        for x in (0,w-1):
            if flood[y,x]: cv2.floodFill(flood,mask,(x,y),128)
    bg=(flood==128).astype(np.uint8)*255
    alpha=255-bg
    alpha=cv2.GaussianBlur(alpha,(0,0),0.65)
    rgba=cv2.cvtColor(bgr,cv2.COLOR_BGR2BGRA)
    rgba[:,:,3]=alpha
    ys,xs=np.where(alpha>5)
    if len(xs)==0:
        return rgba
    x0,x1=xs.min(),xs.max()+1
    y0,y1=ys.min(),ys.max()+1
    return rgba[y0:y1,x0:x1]

def rgba_resize(img, target_w):
    s=target_w/img.shape[1]
    return cv2.resize(img,(target_w,max(1,int(img.shape[0]*s))),interpolation=cv2.INTER_LANCZOS4)

def overlay(bg, fg, x, y, opacity=1.0):
    h,w=fg.shape[:2]
    if x>=bg.shape[1] or y>=bg.shape[0] or x+w<=0 or y+h<=0: return
    x0=max(0,x); y0=max(0,y); x1=min(bg.shape[1],x+w); y1=min(bg.shape[0],y+h)
    fx0=x0-x; fy0=y0-y; fx1=fx0+(x1-x0); fy1=fy0+(y1-y0)
    crop=fg[fy0:fy1,fx0:fx1]
    a=(crop[:,:,3:4].astype(np.float32)/255.0)*opacity
    bg[y0:y1,x0:x1]=(crop[:,:,:3]*a + bg[y0:y1,x0:x1]*(1-a)).astype(np.uint8)

def text_rgba(text, font_path, size, color=(245,245,240,255), tracking=0, max_width=None, align="left", line_spacing=1.02):
    lines=text.split("|")
    def measure(font,line):
        tmp=Image.new("RGBA",(10,10),(0,0,0,0)); d=ImageDraw.Draw(tmp)
        width=sum(d.textlength(ch,font=font) for ch in line)+tracking*max(0,len(line)-1) if tracking else d.textlength(line,font=font)
        bb=d.textbbox((0,0),line,font=font)
        return int(math.ceil(width)),bb
    while size>24:
        font=ImageFont.truetype(font_path,size)
        ms=[measure(font,line) for line in lines]
        if max_width is None or max(w for w,_ in ms)<=max_width: break
        size-=2
    font=ImageFont.truetype(font_path,size)
    ms=[measure(font,line) for line in lines]
    maxw=max(w for w,_ in ms)
    line_h=int(size*line_spacing)
    im=Image.new("RGBA",(maxw+40,line_h*len(lines)+40),(0,0,0,0))
    d=ImageDraw.Draw(im)
    y=10
    for line,(lw,bb) in zip(lines,ms):
        x=10 if align=="left" else 10+(maxw-lw)//2
        yy=y-bb[1]
        if tracking:
            xx=x
            for ch in line:
                d.text((xx,yy),ch,font=font,fill=color)
                xx+=d.textlength(ch,font=font)+tracking
        else:
            d.text((x,yy),line,font=font,fill=color)
        y+=line_h
    bbox=im.getbbox()
    if bbox:
        l,t,r,b=bbox
        im=im.crop((max(0,l-8),max(0,t-8),min(im.width,r+8),min(im.height,b+8)))
    return cv2.cvtColor(np.array(im),cv2.COLOR_RGBA2BGRA)

def bg_frame(style,accent):
    base=np.zeros((H,W,3),np.uint8)
    base[:]=[12,12,13] if style=="clinical" else ([8,7,7] if style=="editorial" else [6,6,6])
    cv2.rectangle(base,(56,56),(W-56,H-56),(26,26,26),1)
    if style=="surveillance":
        for y in range(320,H-200,210): cv2.line(base,(72,y),(W-72,y),(20,20,20),1)
        cv2.circle(base,(W//2,930),260,tuple(int(c*.5) for c in accent),1)
        cv2.circle(base,(W//2,930),120,(42,42,42),1)
    elif style=="editorial":
        cv2.rectangle(base,(0,0),(186,H),(14,11,10),-1)
        cv2.line(base,(186,0),(186,H),accent,2)
    elif style=="utility":
        cv2.rectangle(base,(68,250),(245,H-200),accent,2)
        for y in range(280,H-220,42): cv2.line(base,(88,y),(225,y),tuple(int(c*.65) for c in accent),2)
    elif style=="clinical":
        for y in range(300,H-220,155): cv2.line(base,(74,y),(W-74,y),(22,27,30),1)
        cv2.line(base,(W//2,180),(W//2,H-180),tuple(int(c*.35) for c in accent),1)
    elif style=="gothic":
        for cx in (250,540,830): cv2.ellipse(base,(cx,520),(150,280),0,180,360,tuple(int(c*.55) for c in accent),2)
        cv2.line(base,(W//2,210),(W//2,H-180),(34,31,31),1)
    return base

def make_audio(path, idx, style):
    sr=48000
    tt=np.arange(sr*DUR)/sr
    rng=np.random.default_rng(120+idx)
    x=np.zeros_like(tt)
    x+=0.028*np.sin(2*np.pi*(46+idx*3)*tt)
    x+=0.011*np.sin(2*np.pi*(92+idx*7)*tt)
    cuts=[0.0,.45,1.8,2.8,3.9,5.0]
    for j,c in enumerate(cuts):
        n=int(c*sr); L=min(int(.24*sr),len(x)-n)
        if L<=0: continue
        s=np.arange(L)/sr; env=np.exp(-s*(12 if j else 8))
        x[n:n+L]+=0.34*np.sin(2*np.pi*(70+idx*8+j*8)*s)*env
        x[n:n+L]+=0.13*rng.normal(size=L)*np.exp(-s*24)
    for c in [1.68,2.68,3.78,4.88]:
        n=int(max(0,c-.16)*sr); L=min(int(.28*sr),len(x)-n)
        s=np.linspace(0,1,L,endpoint=False); env=np.sin(np.pi*s)**2
        q=rng.normal(size=L); hp=np.concatenate([[0],np.diff(q)])
        x[n:n+L]+=0.06*hp*env
    if style=="clinical":
        for c in np.arange(.7,5.8,.45):
            n=int(c*sr); L=min(int(.035*sr),len(x)-n); s=np.arange(L)/sr
            x[n:n+L]+=0.075*np.sin(2*np.pi*1800*s)*np.exp(-s*55)
    if style=="gothic":
        x+=0.015*np.sin(2*np.pi*110*tt)+0.009*np.sin(2*np.pi*165*tt)
    x=np.tanh(x*1.7)
    x=x/(np.max(np.abs(x))+1e-9)*0.86
    stereo=np.stack([x,np.roll(x,17)],1)
    pcm=(stereo*32767).astype(np.int16)
    with wave.open(str(path),"wb") as wf:
        wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes(pcm.tobytes())

def verify(out):
    streams=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_streams","-of","json",str(out)]))["streams"]
    v=[s for s in streams if s.get("codec_type")=="video"]
    a=[s for s in streams if s.get("codec_type")=="audio"]
    if not v or int(v[0].get("width",0))!=W or int(v[0].get("height",0))!=H:
        raise RuntimeError("VIDEO VALIDATION FAILED "+str(out))
    if not a or a[0].get("codec_name")!="aac":
        raise RuntimeError("AUDIO VALIDATION FAILED "+str(out))

def render(day,slot,p,idx):
    d=OUT/day
    d.mkdir(parents=True,exist_ok=True)
    ext=".jpg" if ".jpg" in p["image"].lower() else ".png"
    src=pathlib.Path("/tmp")/f"{p['slug']}{ext}"
    download(p["image"],src)
    prod=remove_connected_dark(src)

    title_font=FONT_SERIF if p["style"] in ("editorial","gothic") else FONT_BLACK
    title=text_rgba(p["display"],title_font,150,max_width=900)
    title_small=text_rgba(p["display"],title_font,84,max_width=820)
    case=text_rgba("CASE "+p["case"],FONT_MONO,28,color=(*p["accent"],255),tracking=3,max_width=300)
    micro=text_rgba(p["micro"],FONT_MONO,20,color=(170,170,165,255),tracking=2,max_width=820)
    brand=text_rgba("DISMISSED",FONT_BOLD,28,color=(230,230,226,255),tracking=6,max_width=320)
    cta=text_rgba("DISMISSED.RO",FONT_BOLD,52,color=(245,245,240,255),tracking=2,max_width=600)

    silent=pathlib.Path("/tmp")/f"{day}-{slot}-silent.mp4"
    writer=cv2.VideoWriter(str(silent),cv2.VideoWriter_fourcc(*"mp4v"),FPS,(W,H))
    for f in range(N):
        t=f/FPS
        frame=bg_frame(p["style"],p["accent"])
        overlay(frame,brand,72,78)
        overlay(frame,case,W-72-case.shape[1],78)

        if t<0.55:
            pr=ease_out_cubic(t/0.38)
            y=int(320+(1-pr)*180)
            overlay(frame,title,72,y)
            overlay(frame,micro,72,y+title.shape[0]+40,opacity=min(1,t/.25))
            cv2.line(frame,(72,y+title.shape[0]+20),(int(72+720*pr),y+title.shape[0]+20),p["accent"],4)

        if 0.42<=t<1.82:
            pr=ease_in_out((t-.42)/1.4)
            width=int(880*(.95+.035*pr))
            pp=rgba_resize(prod,width)
            x=(W-width)//2; y=int(500-20*pr)
            ghost=title.copy(); ghost[:,:,3]=(ghost[:,:,3].astype(np.float32)*0.13).astype(np.uint8)
            overlay(frame,ghost,72,245)
            overlay(frame,pp,x,y)
            cv2.line(frame,(72,1540),(1008,1540),tuple(int(c*.7) for c in p["accent"]),2)
            overlay(frame,micro,72,1580)

        if 1.78<=t<2.82:
            pr=ease_in_out((t-1.78)/1.04)
            pp=rgba_resize(prod,1500)
            overlay(frame,pp,int(-260-30*pr),int(260-80*pr))
            cv2.rectangle(frame,(64,1390),(1016,1730),(5,5,5),-1)
            overlay(frame,title_small,82,1440)
            overlay(frame,case,82,1645)

        if 2.78<=t<3.92:
            pp=rgba_resize(prod,700)
            panels=[(64,460,300,760),(390,460,300,760),(716,460,300,760)]
            shifts=[(-160,40),(-200,-210),(-220,-440)]
            for (x,y,w,h),(sx,sy) in zip(panels,shifts):
                roi=np.zeros((h,w,3),np.uint8)
                overlay(roi,pp,sx,sy)
                frame[y:y+h,x:x+w]=roi
                cv2.rectangle(frame,(x,y),(x+w,y+h),p["accent"] if x==390 else (46,46,46),2)
            mini=text_rgba("REAL PRODUCT / 1:1",FONT_MONO,19,color=(220,220,214,255),tracking=2,max_width=600)
            overlay(frame,mini,72,1300)
            overlay(frame,micro,72,1360)

        if 3.88<=t<5.03:
            pr=ease_in_out((t-3.88)/1.15)
            pp=rgba_resize(prod,930)
            overlay(frame,pp,(W-930)//2,520)
            overlay(frame,title_small,72,255)
            x=int(72+840*pr)
            cv2.line(frame,(x,370),(x,1500),p["accent"],4)
            cv2.line(frame,(72,1500),(1008,1500),(40,40,40),1)
            overlay(frame,micro,72,1540)

        if t>=4.98:
            frame[:]=np.array([5,5,5],np.uint8)
            overlay(frame,brand,72,78)
            overlay(frame,case,W-72-case.shape[1],78)
            overlay(frame,title_small,72,520)
            overlay(frame,cta,72,1540)
            prog=ease_out_cubic((t-4.98)/.82)
            cv2.line(frame,(72,1650),(int(72+830*prog),1650),p["accent"],5)
            pp=rgba_resize(prod,520)
            overlay(frame,pp,580,760)

        c=(60,60,60)
        cv2.line(frame,(72,180),(140,180),c,1); cv2.line(frame,(72,180),(72,248),c,1)
        cv2.line(frame,(1008,180),(940,180),c,1); cv2.line(frame,(1008,180),(1008,248),c,1)
        writer.write(frame)
    writer.release()

    wav=pathlib.Path("/tmp")/f"{day}-{slot}.wav"
    make_audio(wav,idx,p["style"])
    out=d/f"{slot}.mp4"
    subprocess.run([
        "ffmpeg","-hide_banner","-loglevel","error","-y",
        "-i",str(silent),"-i",str(wav),
        "-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p",
        "-c:a","aac","-b:a","192k","-ar","48000","-ac","2",
        "-shortest","-movflags","+faststart",str(out)
    ],check=True)
    verify(out)
    (d/f"{slot}.json").write_text(json.dumps({
        "title":p["title"],
        "caseNo":p["case"],
        "date":day,
        "slot":slot,
        "audio":True,
        "productLock":True,
        "engine":"V8_PRO_MAX",
        "source":"SHOPIFY_REAL_PRODUCT",
        "format":"1080x1920",
        "fps":24
    },indent=2))
    print("VERIFIED",day,slot,p["title"],flush=True)

def main():
    dates=[local_day(0),local_day(1)]
    for d in dates:
        for s in range(5):
            p=pick(d,s)
            idx=PRODUCTS.index(p)
            print("RENDER",d,s,p["title"],flush=True)
            render(d,s,p,idx)
    (OUT/"manifest.json").write_text(json.dumps({
        "generatedAt":datetime.utcnow().isoformat()+"Z",
        "dates":dates,
        "engine":"V8_PRO_MAX",
        "audioMandatory":True,
        "productLock":True,
        "publishReady":True,
        "scheduleTimezone":"Europe/Bucharest",
        "schedule":["10:00","13:00","16:00","19:00","22:00"]
    },indent=2))

if __name__=="__main__":
    main()
