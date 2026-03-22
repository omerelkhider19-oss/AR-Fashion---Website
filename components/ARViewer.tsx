import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Camera, Ruler, CheckCircle2, ZoomIn, ZoomOut,
  ArrowUp, ArrowDown, Loader2, Layers, User, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface ARViewerProps {
  product: Product;
  onClose: () => void;
  activeImage?: string;
}

interface PoseLandmark {
  x: number; y: number; z: number; visibility?: number;
}

interface BodyMeasurements {
  shoulderWidthIn: number;
  chestIn: number;
  torsoHeightIn: number;
  hipWidthIn: number;
  inseamIn: number;
  recommendedSize: string;
  confidence: number;
  estimatedDistanceM: number;
  calibrated: boolean;
}

type GarmentRegion = 'upper' | 'lower' | 'full' | 'footwear' | 'unknown';

interface ClothingRect {
  top: number; left: number; width: number; height: number;
}

interface UserProfile {
  heightCm: number;
  pastFits: Record<string, string>;
}

const LM = {
  NOSE: 0, LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

const SKELETON: [number, number][] = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],
  [23,25],[25,27],[24,26],[26,28],
];

const MENS_TOPS = [
  { size:'XS',  minRatio:0.00, maxRatio:0.60 },
  { size:'S',   minRatio:0.60, maxRatio:0.72 },
  { size:'M',   minRatio:0.72, maxRatio:0.84 },
  { size:'L',   minRatio:0.84, maxRatio:0.96 },
  { size:'XL',  minRatio:0.96, maxRatio:1.10 },
  { size:'XXL', minRatio:1.10, maxRatio:99.0 },
];

// NASA STD-3001 / ANSUR II anthropometric ratios
const SHOULDER_TO_HEIGHT = 0.259;
const CHEST_TO_SHOULDER  = 2.23;

function loadProfile(): UserProfile | null {
  try { const r = localStorage.getItem('ar_user_profile'); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveProfile(p: UserProfile) {
  try { localStorage.setItem('ar_user_profile', JSON.stringify(p)); } catch {}
}

function sizeFromRatio(ratio: number, category: string, legRatio: number): string {
  const cat = category.toLowerCase();
  if (cat.includes('bottom')||cat.includes('jean')||cat.includes('pant')) {
    if (legRatio<0.50) return '28'; if (legRatio<0.65) return '30';
    if (legRatio<0.80) return '32'; if (legRatio<0.95) return '34'; return '36';
  }
  return MENS_TOPS.find(s => ratio>=s.minRatio && ratio<s.maxRatio)?.size ?? 'M';
}

async function detectRegion(imageUrl: string, category: string): Promise<GarmentRegion> {
  const cat = category.toLowerCase();
  if (cat.includes('shirt')||cat.includes('blouse')||cat.includes('top')||cat.includes('hoodie')) return 'upper';
  if (cat.includes('jacket')||cat.includes('coat')||cat.includes('outerwear')) return 'upper';
  if (cat.includes('bottom')||cat.includes('jean')||cat.includes('pant')||cat.includes('skirt')) return 'lower';
  if (cat.includes('dress')||cat.includes('jumpsuit')) return 'full';
  if (cat.includes('set')||cat.includes('activewear')||cat.includes('active')) return 'full';
  if (cat.includes('footwear')||cat.includes('shoe')||cat.includes('sneaker')) return 'footwear';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:20,
        messages:[{ role:'user', content:[
          { type:'image', source:{ type:'url', url:imageUrl } },
          { type:'text', text:'What body region does this clothing cover? Reply with exactly one word: upper, lower, full, or footwear.' },
        ]}],
      }),
    });
    if (!res.ok) return 'upper';
    const data = await res.json();
    const ans = data.content?.[0]?.text?.trim().toLowerCase() ?? '';
    if (['upper','lower','full','footwear'].includes(ans)) return ans as GarmentRegion;
  } catch {}
  return 'upper';
}

function HeightModal({ onConfirm, onSkip, savedHeight }: {
  onConfirm: (h:number) => void; onSkip: () => void; savedHeight: number|null;
}) {
  const [value, setValue] = useState(savedHeight?.toString() ?? '');
  const [err, setErr] = useState('');
  const submit = () => {
    const h = parseInt(value);
    if (isNaN(h)||h<140||h>220) { setErr('Please enter a height between 140–220 cm'); return; }
    onConfirm(h);
  };
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        className="bg-gray-900 border border-white/10 rounded-2xl p-6 mx-4 w-full max-w-sm text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-violet-600/30 rounded-xl flex items-center justify-center">
            <Ruler className="size-5 text-violet-400"/>
          </div>
          <div>
            <h3 className="font-bold text-base">Accurate Sizing</h3>
            <p className="text-xs text-gray-400">Enter your height for precise measurements</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1.5">Your height (cm)</label>
          <input type="number" value={value} onChange={e=>{setValue(e.target.value);setErr('');}}
            onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="e.g. 175"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
            min={140} max={220}/>
          {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
        </div>
        <div className="text-xs text-gray-500 mb-5 flex items-start gap-2">
          <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0"/>
          Height calibration improves measurement accuracy by ~80%. Saved to this device.
        </div>
        <div className="flex gap-2">
          <button onClick={onSkip} className="flex-1 py-2.5 border border-white/20 rounded-lg text-sm text-gray-400 hover:bg-white/10 transition-colors">Skip</button>
          <button onClick={submit} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors">
            {savedHeight ? 'Update & Continue' : 'Continue'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function ARViewer({ product, onClose, activeImage }: ARViewerProps) {
  const displayImage = activeImage || product.image;

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const poseRef     = useRef<any>(null);
  const animRef     = useRef<number>();
  const throttleRef = useRef(0);
  const pxPerCmRef  = useRef<number | null>(null);

  const [status, setStatus] = useState<'height-input'|'requesting'|'loading-model'|'scanning'|'detected'|'error'>('height-input');
  const [errorMsg, setErrorMsg] = useState('');
  const [measurements, setMeasurements] = useState<BodyMeasurements | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [scale, setScale]   = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const [frameSize, setFrameSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [userHeightCm, setUserHeightCm] = useState<number | null>(null);
  const [region, setRegion]   = useState<GarmentRegion>('unknown');
  const [detecting, setDetecting] = useState(true);
  const [upperRect, setUpperRect] = useState<ClothingRect | null>(null);
  const [lowerRect, setLowerRect] = useState<ClothingRect | null>(null);
  const [fullRect,  setFullRect]  = useState<ClothingRect | null>(null);
  const [shoeRect,  setShoeRect]  = useState<ClothingRect | null>(null);

  const savedProfile = useRef<UserProfile | null>(loadProfile());

  useEffect(() => {
    setDetecting(true);
    detectRegion(displayImage, product.category).then(r => { setRegion(r); setDetecting(false); });
  }, [displayImage, product.category]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:'user', width:{ ideal:1280 }, height:{ ideal:720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setStatus('loading-model');
      loadPose();
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.name==='NotAllowedError'?'Camera permission denied.':'Could not access camera.');
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t=>t.stop());
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleHeightConfirm = (h: number) => {
    setUserHeightCm(h);
    const profile: UserProfile = { heightCm:h, pastFits: savedProfile.current?.pastFits ?? {} };
    savedProfile.current = profile;
    saveProfile(profile);
    setStatus('requesting');
    startCamera();
  };

  const handleHeightSkip = () => { setStatus('requesting'); startCamera(); };

  const loadPose = useCallback(async () => {
    try {
      for (const src of [
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
      ]) {
        await new Promise<void>((res,rej) => {
          if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
          const s = document.createElement('script');
          s.src=src; s.crossOrigin='anonymous'; s.onload=()=>res(); s.onerror=()=>rej();
          document.head.appendChild(s);
        });
      }
      const Pose = (window as any).Pose;
      const pose = new Pose({ locateFile:(f:string)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
      pose.setOptions({ modelComplexity:1, smoothLandmarks:true, enableSegmentation:false, enableWorldLandmarks:true, minDetectionConfidence:0.6, minTrackingConfidence:0.6 });
      pose.onResults(onResults);
      poseRef.current = pose;
      setStatus('scanning');
      const loop = async () => {
        if (videoRef.current && poseRef.current && videoRef.current.readyState>=2)
          await poseRef.current.send({ image: videoRef.current });
        animRef.current = requestAnimationFrame(loop);
      };
      animRef.current = requestAnimationFrame(loop);
    } catch {
      setStatus('error'); setErrorMsg('Failed to load pose model. Check internet connection.');
    }
  }, []);

  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (videoRef.current) {
      canvas.width  = videoRef.current.videoWidth  || window.innerWidth;
      canvas.height = videoRef.current.videoHeight || window.innerHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!results.poseLandmarks?.length) return;
    const lms: PoseLandmark[]      = results.poseLandmarks;
    const worldLms: PoseLandmark[] = results.poseWorldLandmarks ?? [];
    if (status !== 'detected') setStatus('detected');
    drawSkeleton(ctx, lms, canvas.width, canvas.height);
    calcOverlays(lms, canvas.width, canvas.height);
    calcMeasurements(lms, worldLms, canvas.width, canvas.height);
  }, [status, region, frameSize, userHeightCm]);

  function drawSkeleton(ctx: CanvasRenderingContext2D, lms: PoseLandmark[], w: number, h: number) {
    ctx.strokeStyle='rgba(139,92,246,0.5)'; ctx.lineWidth=2; ctx.lineCap='round';
    SKELETON.forEach(([a,b]) => {
      const pa=lms[a], pb=lms[b];
      if (!pa||!pb||(pa.visibility??1)<0.4||(pb.visibility??1)<0.4) return;
      ctx.beginPath(); ctx.moveTo(pa.x*w,pa.y*h); ctx.lineTo(pb.x*w,pb.y*h); ctx.stroke();
    });
    Object.values(LM).forEach(idx => {
      const p=lms[idx]; if (!p||(p.visibility??1)<0.4) return;
      const x=p.x*w, y=p.y*h;
      ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fillStyle='rgba(139,92,246,0.15)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle='rgba(168,85,247,0.85)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    });
  }

  function calcOverlays(lms: PoseLandmark[], cw: number, ch: number) {
    throttleRef.current++;
    if (throttleRef.current % 3 !== 0) return;
    const ls=lms[LM.LEFT_SHOULDER], rs=lms[LM.RIGHT_SHOULDER];
    const lh=lms[LM.LEFT_HIP], rh=lms[LM.RIGHT_HIP];
    const lk=lms[LM.LEFT_KNEE], rk=lms[LM.RIGHT_KNEE];
    const la=lms[LM.LEFT_ANKLE], ra=lms[LM.RIGHT_ANKLE];
    if (!ls||!rs||!lh||!rh) return;
    const sx=frameSize.w/cw, sy=frameSize.h/ch;
    const mx=(nx:number)=>frameSize.w-nx*cw*sx, my=(ny:number)=>ny*ch*sy;
    const lShX=mx(ls.x),rShX=mx(rs.x),lShY=my(ls.y),rShY=my(rs.y);
    const lHipY=my(lh.y),rHipY=my(rh.y);
    const shLeft=Math.min(lShX,rShX),shRight=Math.max(lShX,rShX);
    const shW=shRight-shLeft,shCX=(shLeft+shRight)/2;
    const shCY=(lShY+rShY)/2,hipCY=(lHipY+rHipY)/2;
    const torsoH=Math.abs(hipCY-shCY);
    const ankleY=la&&ra&&(la.visibility??0)>0.4&&(ra.visibility??0)>0.4
      ? (my(la.y)+my(ra.y))/2 : lk&&rk?(my(lk.y)+my(rk.y))/2+torsoH*0.6 : hipCY+torsoH*1.8;
    const kneeY=lk&&rk?(my(lk.y)+my(rk.y))/2:hipCY+torsoH;
    const upPad=shW*0.58;
    const upper:ClothingRect={left:shLeft-upPad,top:shCY-torsoH*0.10,width:shW+upPad*2,height:torsoH*1.38};
    const lowW=shW*1.18,lowPad=lowW*0.30;
    const lower:ClothingRect={left:shCX-lowW/2-lowPad,top:hipCY-torsoH*0.13,width:lowW+lowPad*2,height:ankleY-(hipCY-torsoH*0.13)+torsoH*0.05};
    const fPad=shW*0.48;
    const full:ClothingRect={left:shLeft-fPad,top:shCY-torsoH*0.10,width:shW+fPad*2,height:kneeY-shCY+torsoH*0.30};
    let shoe:ClothingRect|null=null;
    if (la&&ra&&(la.visibility??0)>0.3) {
      const ankX=(mx(la.x)+mx(ra.x))/2,ankY2=(my(la.y)+my(ra.y))/2;
      shoe={left:ankX-100,top:ankY2-20,width:200,height:120};
    }
    setUpperRect(null);setLowerRect(null);setFullRect(null);setShoeRect(null);
    if      (region==='upper')    setUpperRect(upper);
    else if (region==='lower')    setLowerRect(lower);
    else if (region==='full')     setFullRect(full);
    else if (region==='footwear') setShoeRect(shoe);
    else                          setUpperRect(upper);
  }

  function calcMeasurements(lms: PoseLandmark[], worldLms: PoseLandmark[], cw: number, ch: number) {
    const ls=lms[LM.LEFT_SHOULDER],rs=lms[LM.RIGHT_SHOULDER];
    const lh=lms[LM.LEFT_HIP],rh=lms[LM.RIGHT_HIP];
    const lk=lms[LM.LEFT_KNEE],rk=lms[LM.RIGHT_KNEE];
    const la=lms[LM.LEFT_ANKLE],ra=lms[LM.RIGHT_ANKLE];
    if (!ls||!rs||!lh||!rh) return;
    const keyLms=[ls,rs,lh,rh,lk,rk].filter(Boolean);
    const confidence=keyLms.reduce((s,p)=>s+(p.visibility??0.5),0)/keyLms.length;
    if (confidence<0.35) return;
    const shPx=Math.abs(rs.x-ls.x)*cw;
    const torPx=Math.abs(((lh.y+rh.y)/2)-((ls.y+rs.y)/2))*ch;
    const hipPx=Math.abs(rh.x-lh.x)*cw;
    const legPx=la&&ra?Math.abs(((la.y+ra.y)/2)-((lh.y+rh.y)/2))*ch
      :lk&&rk?Math.abs(((lk.y+rk.y)/2)-((lh.y+rh.y)/2))*ch*1.6:torPx*1.8;
    let shoulderIn!:number,chestIn!:number,hipIn!:number,inseamIn!:number;
    let calibrated=false,estimatedDistanceM=1.5;

    // Phase 1: Height-based calibration
    if (userHeightCm && shPx>10) {
      const pixPerCm=shPx/(userHeightCm*SHOULDER_TO_HEIGHT);
      pxPerCmRef.current=pixPerCm;
      shoulderIn=(shPx/pixPerCm)/2.54;
      chestIn=shoulderIn*CHEST_TO_SHOULDER;
      hipIn=(hipPx/pixPerCm/2.54)*2.5;
      inseamIn=(legPx/pixPerCm)/2.54;
      calibrated=true;
      const nose=lms[LM.NOSE];
      const anklePx2=la?la.y*ch:rh.y*ch+torPx*1.8;
      const nosePx=nose?nose.y*ch:0;
      const bodyPx=Math.abs(anklePx2-nosePx);
      if (bodyPx>50) estimatedDistanceM=Math.round(((userHeightCm/100)*(cw*0.85))/bodyPx*10)/10;
    }
    // Phase 2: World landmarks z-depth
    else if (worldLms.length>0) {
      const wls=worldLms[LM.LEFT_SHOULDER],wrs=worldLms[LM.RIGHT_SHOULDER];
      const wlh=worldLms[LM.LEFT_HIP],wrh=worldLms[LM.RIGHT_HIP];
      if (wls&&wrs) {
        const wShM=Math.sqrt(Math.pow(wrs.x-wls.x,2)+Math.pow(wrs.y-wls.y,2)+Math.pow(wrs.z-wls.z,2));
        shoulderIn=wShM*100/2.54;
        chestIn=shoulderIn*CHEST_TO_SHOULDER;
        if (wlh&&wrh) {
          const wHipM=Math.sqrt(Math.pow(wrh.x-wlh.x,2)+Math.pow(wrh.y-wlh.y,2)+Math.pow(wrh.z-wlh.z,2));
          hipIn=wHipM*100/2.54*2.5;
        } else { hipIn=chestIn*1.05; }
        inseamIn=Math.min(Math.max(Math.round(legPx/torPx*18),26),36);
        const avgZ=((wlh?.z??0)+(wrh?.z??0))/2;
        estimatedDistanceM=Math.round(Math.abs(avgZ)*10)/10||1.5;
        calibrated=true;
      } else {
        const r2=torPx>0?shPx/torPx:0.78;
        chestIn=Math.round(39*(r2/0.78)); shoulderIn=Math.round(17.5*(r2/0.78));
        hipIn=chestIn*1.05; inseamIn=Math.min(Math.max(Math.round(legPx/torPx*18),26),36);
      }
    }
    // Phase 3: Ratio fallback
    else {
      const r3=torPx>0?shPx/torPx:0.78;
      chestIn=Math.round(39*(r3/0.78)); shoulderIn=Math.round(17.5*(r3/0.78));
      hipIn=chestIn*1.05; inseamIn=Math.min(Math.max(Math.round(legPx/torPx*18),26),36);
    }

    const ratio=torPx>0?shPx/torPx:0.78;
    const legRatio=torPx>0?legPx/torPx:1.8;
    const size=sizeFromRatio(ratio,product.category,legRatio);
    setMeasurements({
      shoulderWidthIn:Math.min(Math.max(Math.round(shoulderIn),13),24),
      chestIn:Math.min(Math.max(Math.round(chestIn),28),60),
      torsoHeightIn:Math.round(torPx/ch*28),
      hipWidthIn:Math.min(Math.max(Math.round(hipIn),28),60),
      inseamIn:Math.min(Math.max(Math.round(inseamIn),24),38),
      recommendedSize:size, confidence, estimatedDistanceM, calibrated,
    });
    if (savedProfile.current) { savedProfile.current.pastFits[product.id]=size; saveProfile(savedProfile.current); }
  }

  useEffect(() => {
    const r=()=>setFrameSize({w:window.innerWidth,h:window.innerHeight});
    window.addEventListener('resize',r); return ()=>window.removeEventListener('resize',r);
  },[]);

  function Overlay({ rect, objectPos='center' }: { rect:ClothingRect; objectPos?:string }) {
    return (
      <div className="absolute pointer-events-none"
        style={{left:rect.left,top:rect.top+offsetY,width:rect.width*scale,height:rect.height*scale,overflow:'hidden',opacity:1}}>
        <img src={displayImage} alt="" className="w-full h-full"
          style={{objectFit:'contain',objectPosition:objectPos,filter:'brightness(1.05) contrast(1.05) drop-shadow(0 4px 20px rgba(0,0,0,0.35))',opacity:1,display:'block'}}/>
      </div>
    );
  }

  const statusLabel = ({
    'height-input':'Setting up...', requesting:'Requesting camera access...',
    'loading-model':'Loading pose detection model...', scanning:'Scanning for body...',
    detected:'Body detected — perfect fit!', error:errorMsg,
  } as Record<string,string>)[status];

  const regionLabel = ({
    upper:'Upper body overlay',lower:'Lower body overlay',
    full:'Full body overlay',footwear:'Footwear overlay',unknown:'Detecting garment...',
  } as Record<string,string>)[region];

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={{transform:'scaleX(-1)'}} playsInline muted/>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{transform:'scaleX(-1)'}}/>

      {/* Height modal */}
      {status==='height-input' && (
        <HeightModal savedHeight={savedProfile.current?.heightCm??null} onConfirm={handleHeightConfirm} onSkip={handleHeightSkip}/>
      )}

      {/* Overlays */}
      {status==='detected' && (
        <>
          {upperRect&&<Overlay rect={upperRect}/>}
          {lowerRect&&<Overlay rect={lowerRect}/>}
          {fullRect&&<Overlay rect={fullRect}/>}
          {shoeRect&&<Overlay rect={shoeRect}/>}
          {measurements&&(upperRect||fullRect)&&(()=>{
            const r=upperRect??fullRect!;
            return (
              <div className="absolute pointer-events-none"
                style={{left:r.left+r.width*scale/2,top:r.top+offsetY-44,transform:'translateX(-50%)'}}>
                <div className="bg-gradient-to-r from-emerald-500 to-green-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap flex items-center gap-1.5">
                  &#10003; Size {measurements.recommendedSize}
                  {measurements.calibrated&&<span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">calibrated</span>}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Scan line */}
      {(status==='scanning'||status==='loading-model')&&(
        <div className="absolute inset-0 pointer-events-none">
          <motion.div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent"
            style={{boxShadow:'0 0 20px rgba(139,92,246,0.8)'}}
            initial={{top:'0%'}} animate={{top:'100%'}} transition={{duration:2.5,repeat:Infinity,ease:'linear'}}/>
        </div>
      )}

      {/* Top bar */}
      {status!=='height-input'&&(
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <div className="bg-black/80 text-white px-6 py-3 rounded-xl backdrop-blur-sm text-center">
            <div className="font-semibold text-sm">{product.name}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
              {detecting?<><Loader2 className="size-3 animate-spin"/>Analysing garment...</>:<><Layers className="size-3"/>{regionLabel}</>}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={status} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-medium ${
                status==='detected'?'bg-emerald-600/90 text-white':status==='error'?'bg-red-600/90 text-white':'bg-violet-600/90 text-white'}`}>
              {(status==='loading-model'||status==='scanning')&&<Loader2 className="size-4 animate-spin"/>}
              {status==='detected'&&<CheckCircle2 className="size-4"/>}
              {status==='error'&&<X className="size-4"/>}
              <span>{statusLabel}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Camera info */}
      {status!=='height-input'&&(
        <div className="absolute top-4 left-4 bg-black/80 text-white text-xs px-4 py-3 rounded-xl backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Camera className="size-4 text-violet-400 shrink-0"/>
            <div>
              <p className="font-semibold">Camera Active</p>
              <p className="text-gray-400 mt-0.5">{status==='detected'?'Tracking 33 body landmarks':'Waiting for pose...'}</p>
              {userHeightCm&&<p className="text-emerald-400 mt-0.5">&#10003; Height calibrated ({userHeightCm}cm)</p>}
            </div>
          </div>
          {status==='detected'&&(
            <button onClick={()=>setStatus('height-input')} className="mt-2 flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors">
              <RefreshCw className="size-3"/> Recalibrate height
            </button>
          )}
        </div>
      )}

      {/* Body pills */}
      <AnimatePresence>
        {status==='detected'&&(
          <div className="absolute top-24 left-4 space-y-1.5 z-10">
            {['Upper Body','Torso','Lower Body','Limbs'].map((part,i)=>(
              <motion.div key={part} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}}
                className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse block"/>{part}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Measurements panel */}
      <AnimatePresence>
        {status==='detected'&&measurements&&(
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="absolute bottom-4 left-4 w-72 z-10">
            <div className="bg-black/90 text-white rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="size-4 text-violet-400"/>
                  <span className="text-sm font-semibold">Body Analysis</span>
                </div>
                <button onClick={()=>setShowMeasurements(v=>!v)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  {showMeasurements?'Hide':'Show'}
                </button>
              </div>
              <div className="p-3 bg-gradient-to-r from-emerald-900/50 to-green-900/50 border border-emerald-700/40 rounded-lg mb-3">
                <div className="text-xs text-emerald-400 mb-1">Recommended Size</div>
                <div className="flex items-end gap-2">
                  <div className="text-3xl font-bold text-emerald-300">{measurements.recommendedSize}</div>
                  {!measurements.calibrated&&<div className="text-xs text-amber-400 mb-1">⚠ Enter height for better accuracy</div>}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {measurements.calibrated?'Height-calibrated • US standard chart':'Ratio-based estimate • US standard chart'}
                </div>
              </div>
              <AnimatePresence>
                {showMeasurements&&(
                  <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                    <div className="mb-3 p-2 bg-white/5 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">Est. Distance</span><span className="text-gray-300">{measurements.estimatedDistanceM}m</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Confidence</span>
                        <span className={measurements.confidence>0.7?'text-emerald-400':'text-amber-400'}>{Math.round(measurements.confidence*100)}%</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Method</span>
                        <span className="text-violet-400">{userHeightCm?'Height+Pixels':'World Landmarks'}</span></div>
                    </div>
                    <div className="space-y-2 text-xs mb-3">
                      {[
                        {label:'Shoulder',value:`~${measurements.shoulderWidthIn}"`},
                        {label:'Chest',value:`~${measurements.chestIn}"`},
                        {label:'Hip',value:`~${measurements.hipWidthIn}"`},
                        {label:'Inseam',value:`~${measurements.inseamIn}"`},
                      ].map(({label,value})=>(
                        <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/10 last:border-0">
                          <span className="text-gray-400">{label}</span>
                          <span className="text-white font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                    {savedProfile.current?.pastFits[product.id]&&(
                      <div className="mb-3 p-2 bg-violet-900/20 rounded-lg text-xs flex items-center gap-2">
                        <User className="size-3 text-violet-400"/>
                        <span className="text-gray-400">Last fit for this product:</span>
                        <span className="text-violet-300 font-bold">{savedProfile.current.pastFits[product.id]}</span>
                      </div>
                    )}
                    {product.measurements&&(
                      <div className="pt-3 border-t border-white/10">
                        <div className="text-xs text-violet-400 font-semibold mb-2">Product Size Guide</div>
                        <div className="space-y-1.5">
                          {Object.entries(product.measurements).map(([key,val])=>(
                            <div key={key} className="flex justify-between items-center bg-emerald-900/20 px-2 py-1 rounded text-xs">
                              <span className="text-gray-300 capitalize">{key}</span>
                              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="size-3"/>{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      {status==='detected'&&(
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          {[
            {icon:ZoomIn,action:()=>setScale(s=>Math.min(s+0.1,1.8)),title:'Scale Up'},
            {icon:ZoomOut,action:()=>setScale(s=>Math.max(s-0.1,0.5)),title:'Scale Down'},
            {icon:ArrowUp,action:()=>setOffsetY(y=>y-10),title:'Move Up'},
            {icon:ArrowDown,action:()=>setOffsetY(y=>y+10),title:'Move Down'},
          ].map(({icon:Icon,action,title})=>(
            <button key={title} onClick={action} title={title}
              className="p-3 bg-black/70 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-colors text-white">
              <Icon className="size-5"/>
            </button>
          ))}
        </div>
      )}

      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 p-3 bg-black/80 hover:bg-black/90 rounded-xl backdrop-blur-sm transition-colors z-20">
        <X className="size-6 text-white"/>
      </button>

      {/* Error */}
      {status==='error'&&(
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/90 text-white p-8 rounded-2xl max-w-sm text-center mx-4">
            <Camera className="size-12 mx-auto mb-4 text-red-400"/>
            <h3 className="font-bold text-lg mb-2">Camera Error</h3>
            <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors text-sm font-medium">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
