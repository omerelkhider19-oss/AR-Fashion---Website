import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ShoppingCart, ArrowLeft, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import { ARViewer } from '../components/ARViewer';

export function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [showAR, setShowAR] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Product not found</h2>
          <Link to="/" className="text-purple-600 hover:underline">
            Return to products
          </Link>
        </div>
      </div>
    );
  }

  // Build image array — use images[] if available, otherwise fall back to single image
  const imageList: string[] = product.images && product.images.length > 0
    ? product.images
    : [product.image];

  const prevImage = () =>
    setCurrentImageIndex((i) => (i - 1 + imageList.length) % imageList.length);

  const nextImage = () =>
    setCurrentImageIndex((i) => (i + 1) % imageList.length);

  const handleAddToCart = () => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      alert('Please select a size');
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addToCart(product, selectedSize);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="size-5" />
            Back to products
          </Link>

          <div className="grid md:grid-cols-2 gap-12 bg-white rounded-xl p-8">

            {/* ── Image Slideshow ── */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">

                {/* Main image */}
                <img
                  key={currentImageIndex}
                  src={imageList[currentImageIndex]}
                  alt={`${product.name} — view ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80';
                  }}
                />

                {/* AR badge */}
                {product.arAvailable && (
                  <div className="absolute top-4 right-4 bg-black text-white text-sm px-3 py-1 rounded flex items-center gap-2">
                    <Camera className="size-4" />
                    AR Try-On
                  </div>
                )}

                {/* Prev / Next arrows — only show if multiple images */}
                {imageList.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Next image"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}

                {/* Dot indicators */}
                {imageList.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {imageList.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentImageIndex
                            ? 'bg-white scale-125'
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                        aria-label={`View image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnail strip — only show if multiple images */}
              {imageList.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imageList.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        i === currentImageIndex
                          ? 'border-black'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* AR button */}
              {product.arAvailable && (
                <button
                  onClick={() => setShowAR(true)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="size-5" />
                  Try with AR Body Tracking
                </button>
              )}
            </div>

            {/* ── Product Info ── */}
            <div>
              <div className="text-sm text-gray-500 mb-2">{product.category}</div>
              <h1 className="text-4xl mb-4">{product.name}</h1>
              <div className="text-3xl mb-6">${product.price}</div>

              <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm mb-2">Select Size</label>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 border rounded-lg transition-colors ${
                          selectedSize === size
                            ? 'bg-black text-white border-black'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Guide */}
              {product.measurements && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium mb-2">Size Guide</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {product.measurements.shoulder && (
                      <div>
                        <span className="text-gray-500">Shoulder:</span>{' '}
                        {product.measurements.shoulder}
                      </div>
                    )}
                    {product.measurements.chest && (
                      <div>
                        <span className="text-gray-500">Chest:</span>{' '}
                        {product.measurements.chest}
                      </div>
                    )}
                    {product.measurements.sleeve && (
                      <div>
                        <span className="text-gray-500">Sleeve:</span>{' '}
                        {product.measurements.sleeve}
                      </div>
                    )}
                    {product.measurements.length && (
                      <div>
                        <span className="text-gray-500">Length:</span>{' '}
                        {product.measurements.length}
                      </div>
                    )}
                    {product.measurements.waist && (
                      <div>
                        <span className="text-gray-500">Waist:</span>{' '}
                        {product.measurements.waist}
                      </div>
                    )}
                    {product.measurements.hips && (
                      <div>
                        <span className="text-gray-500">Hips:</span>{' '}
                        {product.measurements.hips}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <label className="block text-sm mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border rounded-lg hover:bg-gray-50 transition-colors text-lg"
                  >
                    &minus;
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-20 h-10 text-center border rounded-lg"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border rounded-lg hover:bg-gray-50 transition-colors text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="size-5" />
                Add to Cart
              </button>

              {/* Perks */}
              <div className="mt-8 space-y-4 text-sm">
                {[
                  { title: 'Free Shipping', sub: 'On orders over $100' },
                  { title: 'Easy Returns', sub: '30-day return policy' },
                  { title: 'AR Try-On Available', sub: 'See how it fits with body tracking' },
                ].map(({ title, sub }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-green-600">
                      &#10003;
                    </div>
                    <div>
                      <div>{title}</div>
                      <div className="text-gray-500">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAR && (
        <ARViewer
          product={product}
          onClose={() => setShowAR(false)}
          activeImage={imageList[currentImageIndex]}
        />
      )}
    </>
  );
}
