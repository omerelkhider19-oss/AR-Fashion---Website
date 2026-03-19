import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, Ruler, CheckCircle2, ZoomIn, ZoomOut, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface ARViewerProps {
  product: Product;
  onClose: () => void;
  activeImage?: string; // currently selected image from slideshow
}

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface BodyMeasurements {
  shoulderWidth: number;
  torsoHeight: number;
  hipWidth: number;
  recommendedSize: string;
}

// MediaPipe landmark indices
const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
};

// Skeleton connections to draw
const SKELETON_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso sides
  [23, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
];

function calculateSize(shoulderWidthPx: number, torsoHeightPx: number, canvasWidth: number): string {
  // Use shoulder-to-torso ratio — camera-distance invariant.
  // A typical adult has shoulders ~0.75–0.85x their torso height.
  // Larger ratio = broader build = larger size.
  const ratio = torsoHeightPx > 0 ? shoulderWidthPx / torsoHeightPx : 0;
  if (ratio < 0.65) return 'S';
  if (ratio < 0.80) return 'M';
  if (ratio < 0.95) return 'L';
  return 'XL';
}

export function ARViewer({ product, onClose, activeImage }: ARViewerProps) {
  // Use the currently selected slideshow image, fallback to product.image
  const displayImage = activeImage || product.image;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const animationRef = useRef<number>();
  const lastLandmarksRef = useRef<PoseLandmark[] | null>(null);

  const [status, setStatus] = useState<'requesting' | 'loading-model' | 'scanning' | 'detected' | 'error'>('requesting');
  const [errorMsg, setErrorMsg] = useState('');
  const [measurements, setMeasurements] = useState<BodyMeasurements | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [clothingScale, setClothingScale] = useState(1);
  const [clothingOffsetY, setClothingOffsetY] = useState(0);
  const [clothingRect, setClothingRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [frameSize, setFrameSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('loading-model');
        loadMediaPipe();
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not access camera. Make sure no other app is using it.');
      }
    }
    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Load MediaPipe Pose via CDN
  const loadMediaPipe = useCallback(async () => {
    try {
      // Dynamically load MediaPipe scripts
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');

      const Pose = (window as any).Pose;
      if (!Pose) throw new Error('MediaPipe Pose not loaded');

      const pose = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      pose.onResults(onPoseResults);
      poseRef.current = pose;

      setStatus('scanning');
      startDetectionLoop();
    } catch (err) {
      console.error('MediaPipe load error:', err);
      setStatus('error');
      setErrorMsg('Failed to load pose detection model. Check your internet connection.');
    }
  }, []);

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  const startDetectionLoop = useCallback(() => {
    const detect = async () => {
      if (videoRef.current && poseRef.current && videoRef.current.readyState >= 2) {
        await poseRef.current.send({ image: videoRef.current });
      }
      animationRef.current = requestAnimationFrame(detect);
    };
    animationRef.current = requestAnimationFrame(detect);
  }, []);

  const onPoseResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to video dimensions
    if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth || window.innerWidth;
      canvas.height = videoRef.current.videoHeight || window.innerHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks || results.poseLandmarks.length === 0) return;

    const landmarks: PoseLandmark[] = results.poseLandmarks;
    lastLandmarksRef.current = landmarks;

    if (status !== 'detected') setStatus('detected');

    // Draw skeleton
    drawSkeleton(ctx, landmarks, canvas.width, canvas.height);

    // Calculate clothing position from landmarks
    updateClothingOverlay(landmarks, canvas.width, canvas.height);

    // Calculate measurements
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

    if (lShoulder && rShoulder && lHip && rHip) {
      const shoulderWidthPx = Math.abs(rShoulder.x - lShoulder.x) * canvas.width;
      const torsoHeightPx = Math.abs(((lHip.y + rHip.y) / 2) - ((lShoulder.y + rShoulder.y) / 2)) * canvas.height;
      const hipWidthPx = Math.abs(rHip.x - lHip.x) * canvas.width;

      const size = calculateSize(shoulderWidthPx, torsoHeightPx, canvas.width);

      setMeasurements({
        shoulderWidth: Math.round(shoulderWidthPx * 0.0393701 * 10), // px to rough inches
        torsoHeight: Math.round(torsoHeightPx * 0.0393701 * 8),
        hipWidth: Math.round(hipWidthPx * 0.0393701 * 9),
        recommendedSize: size,
      });
    }
  }, [status]);

  function drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[], w: number, h: number) {
    // Draw connections
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    SKELETON_CONNECTIONS.forEach(([a, b]) => {
      const pa = landmarks[a];
      const pb = landmarks[b];
      if (!pa || !pb) return;
      if ((pa.visibility ?? 1) < 0.4 || (pb.visibility ?? 1) < 0.4) return;

      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    });

    // Draw joints
    Object.values(POSE_LANDMARKS).forEach((idx) => {
      const p = landmarks[idx];
      if (!p || (p.visibility ?? 1) < 0.4) return;

      const x = p.x * w;
      const y = p.y * h;

      // Glow
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
      ctx.fill();

      // Center
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
  }

  function updateClothingOverlay(landmarks: PoseLandmark[], canvasW: number, canvasH: number) {
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const nose = landmarks[POSE_LANDMARKS.NOSE];

    if (!lShoulder || !rShoulder || !lHip || !rHip) return;

    const category = product.category.toLowerCase();

    // Convert normalized coords to screen pixels.
    // The video is CSS-mirrored (scaleX(-1)), so we mirror landmark X coords
    // by flipping: mirroredX = frameWidth - originalX
    const scaleX = frameSize.width / canvasW;
    const scaleY = frameSize.height / canvasH;

    // Mirror X so overlay matches the flipped video
    const mirrorX = (nx: number) => frameSize.width - nx * canvasW * scaleX;
    const toY = (ny: number) => ny * canvasH * scaleY;

    const lShX = mirrorX(lShoulder.x);
    const rShX = mirrorX(rShoulder.x);
    const lShY = toY(lShoulder.y);
    const rShY = toY(rShoulder.y);
    const lHipY = toY(lHip.y);
    const rHipY = toY(rHip.y);
    const lHipX = mirrorX(lHip.x);
    const rHipX = mirrorX(rHip.x);

    const shoulderCenterY = (lShY + rShY) / 2;
    const hipCenterY = (lHipY + rHipY) / 2;
    // After mirroring, left/right are swapped — use min/max consistently
    const shoulderLeft = Math.min(lShX, rShX);
    const shoulderRight = Math.max(lShX, rShX);
    const shoulderWidth = shoulderRight - shoulderLeft;
    const torsoHeight = Math.abs(hipCenterY - shoulderCenterY);

    let rect = { top: 0, left: 0, width: 0, height: 0 };

    if (category.includes('shirt') || category.includes('blouse') || category.includes('top') || category.includes('hoodie')) {
      // Use shoulder width + generous padding. Height = full torso + a bit below waist.
      const padding = shoulderWidth * 0.55;
      rect = {
        left: shoulderLeft - padding,
        top: shoulderCenterY - torsoHeight * 0.10,
        width: shoulderWidth + padding * 2,
        height: torsoHeight * 1.35,
      };
    } else if (category.includes('dress')) {
      const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
      const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
      const kneeY = lKnee && rKnee
        ? ((lKnee.y + rKnee.y) / 2) * canvasH * scaleY
        : hipCenterY + torsoHeight * 1.5;
      const padding = shoulderWidth * 0.45;
      rect = {
        left: shoulderLeft - padding,
        top: shoulderCenterY - torsoHeight * 0.08,
        width: shoulderWidth + padding * 2,
        height: kneeY - shoulderCenterY + torsoHeight * 0.20,
      };
    } else if (category.includes('bottom') || category.includes('jeans') || category.includes('pant')) {
      const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
      const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
      const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
      const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

      // Bottom of garment: prefer ankles, fall back to knees, then estimate
      const bottomY = lAnkle && rAnkle && lAnkle.visibility! > 0.4 && rAnkle.visibility! > 0.4
        ? ((lAnkle.y + rAnkle.y) / 2) * canvasH * scaleY
        : lKnee && rKnee && lKnee.visibility! > 0.4
        ? ((lKnee.y + rKnee.y) / 2) * canvasH * scaleY + torsoHeight * 0.6
        : hipCenterY + torsoHeight * 1.8;

      // Width based on shoulder width (more reliable than hip landmarks which sit close together)
      // Jeans are roughly as wide as shoulders
      const jeansWidth = shoulderWidth * 1.1;
      const padding = jeansWidth * 0.30;
      const centerX = (shoulderLeft + shoulderRight) / 2;

      rect = {
        left: centerX - jeansWidth / 2 - padding,
        // Start slightly above hip center so waistband shows
        top: hipCenterY - torsoHeight * 0.12,
        width: jeansWidth + padding * 2,
        // Height from waistband to bottom of garment
        height: bottomY - (hipCenterY - torsoHeight * 0.12) + torsoHeight * 0.05,
      };
    } else if (category.includes('jacket') || category.includes('coat') || category.includes('outerwear')) {
      const padding = shoulderWidth * 0.60;
      rect = {
        left: shoulderLeft - padding,
        top: shoulderCenterY - torsoHeight * 0.14,
        width: shoulderWidth + padding * 2,
        height: torsoHeight * 1.40,
      };
    } else if (category.includes('activewear') || category.includes('active')) {
      const padding = shoulderWidth * 0.50;
      rect = {
        left: shoulderLeft - padding,
        top: shoulderCenterY - torsoHeight * 0.08,
        width: shoulderWidth + padding * 2,
        height: torsoHeight * 1.30,
      };
    } else if (category.includes('footwear') || category.includes('sneaker')) {
      const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
      const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
      if (lAnkle && rAnkle) {
        const ankleY = ((lAnkle.y + rAnkle.y) / 2) * canvasH * scaleY;
        const ankleX = (mirrorX(lAnkle.x) + mirrorX(rAnkle.x)) / 2;
        rect = { left: ankleX - 100, top: ankleY - 20, width: 200, height: 120 };
      }
    } else {
      // Default: upper body
      const padding = shoulderWidth * 0.55;
      rect = {
        left: shoulderLeft - padding,
        top: shoulderCenterY - torsoHeight * 0.10,
        width: shoulderWidth + padding * 2,
        height: torsoHeight * 1.35,
      };
    }

    setClothingRect(rect);
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setFrameSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const statusLabel = {
    requesting: 'Requesting camera access...',
    'loading-model': 'Loading pose detection model...',
    scanning: 'Scanning for body...',
    detected: 'Body detected — perfect fit!',
    error: errorMsg,
  }[status];

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Live camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // mirror for selfie feel
        playsInline
        muted
      />

      {/* Pose skeleton canvas (mirrored to match video) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Clothing overlay — NOT mirrored, positioned from tracked landmarks */}
      <AnimatePresence>
        {status === 'detected' && clothingRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute pointer-events-none"
            style={{
              left: clothingRect.left,
              top: clothingRect.top + clothingOffsetY,
              width: clothingRect.width * clothingScale,
              height: clothingRect.height * clothingScale,
            }}
          >
            {/* Clothing image — uses activeImage if a colour variant is selected */}
            <img
              src={displayImage}
              alt={product.name}
              className="w-full h-full object-contain"
              style={{
                filter: 'brightness(1.05) contrast(1.05) drop-shadow(0 4px 24px rgba(0,0,0,0.4))',
                mixBlendMode: 'normal',
                opacity: 0.88,
              }}
            />

            {/* Subtle top light */}
            <div
              className="absolute inset-0 rounded"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%)',
                pointerEvents: 'none',
              }}
            />

            {/* Size badge */}
            {measurements?.recommendedSize && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 260 }}
                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap"
              >
                ✓ Size {measurements.recommendedSize}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning line animation */}
      {(status === 'scanning' || status === 'loading-model') && (
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent"
            style={{ boxShadow: '0 0 20px rgba(139,92,246,0.8)' }}
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Top status bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <div className="bg-black/80 text-white px-6 py-3 rounded-xl backdrop-blur-sm text-center">
          <div className="font-semibold text-sm">{product.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">AR Virtual Fitting</div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-medium ${
              status === 'detected'
                ? 'bg-emerald-600/90 text-white'
                : status === 'error'
                ? 'bg-red-600/90 text-white'
                : 'bg-violet-600/90 text-white'
            }`}
          >
            {(status === 'loading-model' || status === 'scanning') && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {status === 'detected' && <CheckCircle2 className="size-4" />}
            {status === 'error' && <X className="size-4" />}
            <span>{statusLabel}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Camera info — top left */}
      <div className="absolute top-4 left-4 bg-black/80 text-white text-xs px-4 py-3 rounded-xl backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-violet-400 shrink-0" />
          <div>
            <p className="font-semibold">Camera Active</p>
            <p className="text-gray-400 mt-0.5">
              {status === 'detected' ? 'Tracking 33 body landmarks' : 'Waiting for pose...'}
            </p>
          </div>
        </div>
      </div>

      {/* Body part status — below camera info */}
      <AnimatePresence>
        {status === 'detected' && (
          <div className="absolute top-24 left-4 space-y-1.5 z-10">
            {['Upper Body', 'Torso', 'Lower Body', 'Limbs'].map((part, i) => (
              <motion.div
                key={part}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-2"
              >
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse block" />
                {part}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Measurements panel — bottom left */}
      <AnimatePresence>
        {status === 'detected' && measurements && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 w-72 z-10"
          >
            <div className="bg-black/90 text-white rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="size-4 text-violet-400" />
                  <span className="text-sm font-semibold">Body Analysis</span>
                </div>
                <button
                  onClick={() => setShowMeasurements(v => !v)}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {showMeasurements ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Recommended size */}
              <div className="p-3 bg-gradient-to-r from-emerald-900/50 to-green-900/50 border border-emerald-700/40 rounded-lg mb-3">
                <div className="text-xs text-emerald-400 mb-1">Recommended Size</div>
                <div className="text-3xl font-bold text-emerald-300">{measurements.recommendedSize}</div>
                <div className="text-xs text-gray-400 mt-1">Based on live body measurements</div>
              </div>

              <AnimatePresence>
                {showMeasurements && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 text-xs">
                      {[
                        { label: 'Shoulder Width', value: `~${measurements.shoulderWidth}"` },
                        { label: 'Torso Height', value: `~${measurements.torsoHeight}"` },
                        { label: 'Hip Width', value: `~${measurements.hipWidth}"` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/10 last:border-0">
                          <span className="text-gray-400">{label}</span>
                          <span className="text-white font-medium">{value}</span>
                        </div>
                      ))}
                    </div>

                    {product.measurements && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-violet-400 font-semibold mb-2">Fit Analysis</div>
                        <div className="space-y-1.5">
                          {Object.entries(product.measurements).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center bg-emerald-900/20 px-2 py-1 rounded text-xs">
                              <span className="text-gray-300 capitalize">{key}</span>
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="size-3" /> {val}
                              </span>
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

      {/* Controls — bottom right */}
      {status === 'detected' && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          {[
            { icon: ZoomIn, action: () => setClothingScale(s => Math.min(s + 0.1, 1.8)), title: 'Scale Up' },
            { icon: ZoomOut, action: () => setClothingScale(s => Math.max(s - 0.1, 0.5)), title: 'Scale Down' },
            { icon: ArrowUp, action: () => setClothingOffsetY(y => y - 10), title: 'Move Up' },
            { icon: ArrowDown, action: () => setClothingOffsetY(y => y + 10), title: 'Move Down' },
          ].map(({ icon: Icon, action, title }) => (
            <button
              key={title}
              onClick={action}
              title={title}
              className="p-3 bg-black/70 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-colors text-white"
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-black/80 hover:bg-black/90 rounded-xl backdrop-blur-sm transition-colors z-20"
      >
        <X className="size-6 text-white" />
      </button>

      {/* Error state */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/90 text-white p-8 rounded-2xl max-w-sm text-center mx-4">
            <Camera className="size-12 mx-auto mb-4 text-red-400" />
            <h3 className="font-bold text-lg mb-2">Camera Error</h3>
            <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
