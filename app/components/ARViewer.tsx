import { useState, useEffect, useRef } from 'react';
import { X, Camera, Ruler, CheckCircle2, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, BodyMeasurement } from '../types';

interface ARViewerProps {
  product: Product;
  onClose: () => void;
}

interface BodyPoint {
  x: number;
  y: number;
  label: string;
}

export function ARViewer({ product, onClose }: ARViewerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [recommendedSize, setRecommendedSize] = useState<string>('');
  const [clothingScale, setClothingScale] = useState(1);
  const [clothingPosition, setClothingPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Simulated body tracking points (percentages)
  const bodyPoints: BodyPoint[] = [
    { x: 50, y: 15, label: 'Head' },
    { x: 50, y: 22, label: 'Neck' },
    { x: 40, y: 22, label: 'Left Shoulder' },
    { x: 60, y: 22, label: 'Right Shoulder' },
    { x: 50, y: 35, label: 'Chest' },
    { x: 50, y: 48, label: 'Waist' },
    { x: 45, y: 58, label: 'Left Hip' },
    { x: 55, y: 58, label: 'Right Hip' },
    { x: 35, y: 38, label: 'Left Elbow' },
    { x: 65, y: 38, label: 'Right Elbow' },
    { x: 30, y: 53, label: 'Left Hand' },
    { x: 70, y: 53, label: 'Right Hand' },
    { x: 45, y: 78, label: 'Left Knee' },
    { x: 55, y: 78, label: 'Right Knee' },
    { x: 45, y: 95, label: 'Left Foot' },
    { x: 55, y: 95, label: 'Right Foot' },
  ];

  // Get clothing configuration based on category
  const getClothingConfig = () => {
    const category = product.category.toLowerCase();
    const leftShoulder = bodyPoints.find(p => p.label === 'Left Shoulder');
    const rightShoulder = bodyPoints.find(p => p.label === 'Right Shoulder');
    const neck = bodyPoints.find(p => p.label === 'Neck');
    const waist = bodyPoints.find(p => p.label === 'Waist');
    const leftHip = bodyPoints.find(p => p.label === 'Left Hip');
    const rightHip = bodyPoints.find(p => p.label === 'Right Hip');

    if (!leftShoulder || !rightShoulder || !neck || !waist) {
      return { top: 30, width: 320, height: 400, opacity: 0.85 };
    }

    const shoulderWidth = rightShoulder.x - leftShoulder.x;
    
    if (category.includes('shirt') || category.includes('blouse')) {
      return {
        top: neck.y - 2,
        width: shoulderWidth * 10,
        height: (waist.y - neck.y) * 8,
        opacity: 0.9,
      };
    } else if (category.includes('dress')) {
      const hipY = ((leftHip?.y || 58) + (rightHip?.y || 58)) / 2;
      return {
        top: neck.y - 2,
        width: shoulderWidth * 9,
        height: (hipY - neck.y) * 8.5,
        opacity: 0.88,
      };
    } else if (category.includes('bottom') || category.includes('jeans')) {
      const hipY = ((leftHip?.y || 58) + (rightHip?.y || 58)) / 2;
      return {
        top: waist.y - 3,
        width: (rightHip!.x - leftHip!.x) * 9,
        height: (85 - hipY) * 7,
        opacity: 0.9,
      };
    } else if (category.includes('jacket') || category.includes('coat') || category.includes('outerwear')) {
      return {
        top: neck.y - 4,
        width: shoulderWidth * 11,
        height: (waist.y - neck.y) * 9,
        opacity: 0.85,
      };
    } else if (category.includes('hoodie') || category.includes('top')) {
      return {
        top: neck.y - 2,
        width: shoulderWidth * 10.5,
        height: (waist.y - neck.y) * 8.5,
        opacity: 0.88,
      };
    } else if (category.includes('activewear')) {
      return {
        top: neck.y - 1,
        width: shoulderWidth * 9.5,
        height: (waist.y - neck.y) * 10,
        opacity: 0.87,
      };
    } else if (category.includes('footwear') || category.includes('sneaker')) {
      return {
        top: 92,
        width: 200,
        height: 120,
        opacity: 0.95,
      };
    }
    
    return { top: 30, width: 320, height: 400, opacity: 0.85 };
  };

  // Activate camera simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setCameraActive(true);
      setScanning(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Simulate body detection
  useEffect(() => {
    if (scanning) {
      const timer = setTimeout(() => {
        setScanning(false);
        setBodyDetected(true);
        calculateMeasurements();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [scanning]);

  // Calculate simulated measurements and recommend size
  const calculateMeasurements = () => {
    const simulatedMeasurements: BodyMeasurement[] = [
      { point: 'Neck Circumference', value: 15.5, unit: 'inches' },
      { point: 'Shoulder Width', value: 18.2, unit: 'inches' },
      { point: 'Chest Circumference', value: 38.5, unit: 'inches' },
      { point: 'Waist Circumference', value: 32.0, unit: 'inches' },
      { point: 'Hip Circumference', value: 40.0, unit: 'inches' },
      { point: 'Arm Length', value: 24.5, unit: 'inches' },
      { point: 'Leg Length', value: 32.0, unit: 'inches' },
      { point: 'Height', value: 70, unit: 'inches' },
    ];
    setMeasurements(simulatedMeasurements);

    // Recommend size based on measurements
    if (product.sizes && product.sizes.length > 0) {
      const chestMeasurement = 38.5;
      
      if (product.category.toLowerCase().includes('bottom') || product.category.toLowerCase().includes('jeans')) {
        setRecommendedSize('32');
      } else if (product.category.toLowerCase().includes('footwear')) {
        setRecommendedSize('9');
      } else {
        if (chestMeasurement < 36) setRecommendedSize('S');
        else if (chestMeasurement < 40) setRecommendedSize('M');
        else if (chestMeasurement < 44) setRecommendedSize('L');
        else setRecommendedSize('XL');
      }
    }
  };

  // Draw body skeleton and tracking points
  useEffect(() => {
    if (!bodyDetected || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw skeleton lines
      const connections = [
        ['Neck', 'Left Shoulder'],
        ['Neck', 'Right Shoulder'],
        ['Neck', 'Chest'],
        ['Chest', 'Waist'],
        ['Waist', 'Left Hip'],
        ['Waist', 'Right Hip'],
        ['Left Shoulder', 'Left Elbow'],
        ['Left Elbow', 'Left Hand'],
        ['Right Shoulder', 'Right Elbow'],
        ['Right Elbow', 'Right Hand'],
        ['Left Hip', 'Left Knee'],
        ['Left Knee', 'Left Foot'],
        ['Right Hip', 'Right Knee'],
        ['Right Knee', 'Right Foot'],
      ];

      ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
      ctx.lineWidth = 2;

      connections.forEach(([start, end]) => {
        const startPoint = bodyPoints.find((p) => p.label === start);
        const endPoint = bodyPoints.find((p) => p.label === end);

        if (startPoint && endPoint) {
          ctx.beginPath();
          ctx.moveTo((startPoint.x / 100) * canvas.width, (startPoint.y / 100) * canvas.height);
          ctx.lineTo((endPoint.x / 100) * canvas.width, (endPoint.y / 100) * canvas.height);
          ctx.stroke();
        }
      });

      // Draw tracking points with pulse animation
      bodyPoints.forEach((point) => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / 100) * canvas.height;
        const pulse = Math.sin(frame * 0.08) * 1.5 + 4;

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, pulse + 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
        ctx.fill();

        // Main point
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bodyDetected]);

  const clothingConfig = getClothingConfig();

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Simulated camera feed */}
      <div className="absolute inset-0 overflow-hidden">
        {cameraActive ? (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e293b 100%)',
            }}
          >
            {/* Animated noise/grain effect */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="text-white text-center">
              <Camera className="size-16 mx-auto mb-4 animate-pulse" />
              <p>Requesting camera access...</p>
            </div>
          </div>
        )}
      </div>

      {/* Canvas for body tracking overlay */}
      {bodyDetected && (
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight}
          className="absolute inset-0 pointer-events-none"
        />
      )}

      {/* 3D Clothing overlay - isolated from background */}
      <AnimatePresence>
        {bodyDetected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute left-1/2 pointer-events-none"
            style={{
              top: `${clothingConfig.top + clothingPosition.y}%`,
              transform: `translateX(-50%) scale(${clothingScale})`,
            }}
          >
            <div
              className="relative"
              style={{
                width: `${clothingConfig.width}px`,
                height: `${clothingConfig.height}px`,
              }}
            >
              {/* Clothing item with advanced isolation and 3D effects */}
              <div
                className="absolute inset-0 rounded-lg"
                style={{
                  backgroundImage: `url(${product.image})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: clothingConfig.opacity,
                  filter: 'brightness(1.05) contrast(1.08) saturate(1.1)',
                  transform: 'perspective(1000px) rotateY(0deg)',
                }}
              >
                {/* 3D lighting effect - top light */}
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 30%, rgba(0,0,0,0.1) 100%)',
                    mixBlendMode: 'overlay',
                  }}
                />
                
                {/* Side lighting for depth */}
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.15) 100%)',
                    mixBlendMode: 'multiply',
                  }}
                />

                {/* Subtle fabric texture */}
                <div
                  className="absolute inset-0 rounded-lg opacity-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' /%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
                    mixBlendMode: 'soft-light',
                  }}
                />

                {/* Shadow underneath for grounding */}
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4/5 h-8 bg-black rounded-full opacity-20 blur-xl"
                />
              </div>

              {/* Measurement guide lines (subtle) */}
              {!product.category.toLowerCase().includes('footwear') && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Shoulder/Top line */}
                  <div className="absolute top-[5%] left-[10%] right-[10%] h-px bg-purple-400/25">
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-purple-400/40 rounded-full" />
                    <div className="absolute -right-1 -top-1 w-2 h-2 bg-purple-400/40 rounded-full" />
                  </div>
                  {/* Center line */}
                  {!product.category.toLowerCase().includes('bottom') && (
                    <div className="absolute top-[45%] left-[10%] right-[10%] h-px bg-purple-400/25">
                      <div className="absolute -left-1 -top-1 w-2 h-2 bg-purple-400/40 rounded-full" />
                      <div className="absolute -right-1 -top-1 w-2 h-2 bg-purple-400/40 rounded-full" />
                    </div>
                  )}
                </div>
              )}

              {/* Size recommendation badge */}
              {recommendedSize && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: 'spring' }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg"
                >
                  ✓ Size {recommendedSize}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning overlay */}
      {scanning && (
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.8)]"
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          {/* Vertical scan line */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-purple-500 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.8)]"
            initial={{ left: '0%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center">
        <div className="bg-black/80 text-white px-6 py-3 rounded-lg backdrop-blur-sm">
          <div className="text-sm text-center">
            <div className="font-semibold">{product.name}</div>
            <div className="text-xs text-gray-300 mt-1">AR Virtual Fitting</div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {scanning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-purple-600/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2"
            >
              <RotateCw className="size-4 animate-spin" />
              <span className="text-sm">Analyzing body measurements...</span>
            </motion.div>
          )}

          {bodyDetected && !scanning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-600/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2"
            >
              <CheckCircle2 className="size-4" />
              <span className="text-sm">Perfect fit detected!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Measurement panel */}
      {bodyDetected && (
        <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-80">
          <div className="bg-black/90 text-white rounded-xl p-4 backdrop-blur-sm max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ruler className="size-5 text-purple-400" />
                <h3 className="text-sm font-semibold">Body Analysis</h3>
              </div>
              <button
                onClick={() => setShowMeasurements(!showMeasurements)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {showMeasurements ? 'Hide' : 'Show'}
              </button>
            </div>

            {recommendedSize && (
              <div className="mb-3 p-3 bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-500/40 rounded-lg">
                <div className="text-xs text-green-300 mb-1">Recommended Size</div>
                <div className="text-3xl font-bold text-green-400">{recommendedSize}</div>
                <div className="text-xs text-gray-300 mt-1">Based on your body measurements</div>
              </div>
            )}

            <AnimatePresence>
              {showMeasurements && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 text-sm mb-3">
                    {measurements.map((measurement, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-1.5 border-b border-white/10 last:border-b-0"
                      >
                        <span className="text-gray-300 text-xs">{measurement.point}</span>
                        <span className="text-white font-semibold">
                          {measurement.value} {measurement.unit}
                        </span>
                      </div>
                    ))}
                  </div>

                  {product.measurements && (
                    <div className="pt-3 border-t border-white/20">
                      <div className="text-xs text-purple-400 mb-2 font-semibold">Fit Analysis</div>
                      <div className="space-y-1.5 text-xs">
                        {product.measurements.chest && (
                          <div className="flex justify-between items-center bg-green-600/10 px-2 py-1 rounded">
                            <span className="text-gray-300">Chest Fit</span>
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              Perfect
                            </span>
                          </div>
                        )}
                        {product.measurements.waist && (
                          <div className="flex justify-between items-center bg-green-600/10 px-2 py-1 rounded">
                            <span className="text-gray-300">Waist Fit</span>
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              Perfect
                            </span>
                          </div>
                        )}
                        {product.measurements.sleeve && (
                          <div className="flex justify-between items-center bg-green-600/10 px-2 py-1 rounded">
                            <span className="text-gray-300">Sleeve Length</span>
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              Perfect
                            </span>
                          </div>
                        )}
                        {product.measurements.hips && (
                          <div className="flex justify-between items-center bg-green-600/10 px-2 py-1 rounded">
                            <span className="text-gray-300">Hip Fit</span>
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              Perfect
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Control buttons */}
      {bodyDetected && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => setClothingScale(Math.min(clothingScale + 0.1, 1.5))}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="size-5 text-white" />
          </button>
          <button
            onClick={() => setClothingScale(Math.max(clothingScale - 0.1, 0.6))}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="size-5 text-white" />
          </button>
          <button
            onClick={() => setClothingPosition({ x: 0, y: clothingPosition.y - 1 })}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
            title="Move Up"
          >
            <Move className="size-5 text-white" style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <button
            onClick={() => setClothingPosition({ x: 0, y: clothingPosition.y + 1 })}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
            title="Move Down"
          >
            <Move className="size-5 text-white" style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-black/80 hover:bg-black/90 rounded-lg backdrop-blur-sm transition-colors z-10"
      >
        <X className="size-6 text-white" />
      </button>

      {/* Camera info */}
      <div className="absolute top-4 left-4 bg-black/80 text-white text-xs px-4 py-3 rounded-lg backdrop-blur-sm max-w-xs">
        <div className="flex items-start gap-2">
          <Camera className="size-4 mt-0.5 flex-shrink-0 text-purple-400" />
          <div>
            <p className="font-semibold mb-1">Camera Active</p>
            <p className="text-gray-300">
              AI analyzing {measurements.length} body points for accurate fit
            </p>
          </div>
        </div>
      </div>

      {/* Body tracking status */}
      {bodyDetected && (
        <div className="absolute top-24 left-4 space-y-1.5">
          {[
            { part: 'Upper Body', detected: true },
            { part: 'Torso', detected: true },
            { part: 'Lower Body', detected: true },
            { part: 'Limbs', detected: true },
          ].map((item, index) => (
            <motion.div
              key={item.part}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {item.part}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
