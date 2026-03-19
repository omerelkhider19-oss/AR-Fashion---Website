import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ShoppingCart, ArrowLeft, Camera } from 'lucide-react';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import { ARViewer } from '../components/ARViewer';

export function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [showAR, setShowAR] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');

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
            {/* Product Image */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.arAvailable && (
                  <div className="absolute top-4 right-4 bg-black text-white text-sm px-3 py-1 rounded flex items-center gap-2">
                    <Camera className="size-4" />
                    AR Try-On
                  </div>
                )}
              </div>
              
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

            {/* Product Info */}
            <div>
              <div className="text-sm text-gray-500 mb-2">{product.category}</div>
              <h1 className="text-4xl mb-4">{product.name}</h1>
              <div className="text-3xl mb-6">${product.price}</div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {product.description}
              </p>

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm mb-2">Select Size</label>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size: string) => (
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

              {product.measurements && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm mb-2">Size Guide (for size M)</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {product.measurements.chest && (
                      <div>
                        <span className="text-gray-500">Chest:</span> {product.measurements.chest}
                      </div>
                    )}
                    {product.measurements.waist && (
                      <div>
                        <span className="text-gray-500">Waist:</span> {product.measurements.waist}
                      </div>
                    )}
                    {product.measurements.hips && (
                      <div>
                        <span className="text-gray-500">Hips:</span> {product.measurements.hips}
                      </div>
                    )}
                    {product.measurements.length && (
                      <div>
                        <span className="text-gray-500">Length:</span> {product.measurements.length}
                      </div>
                    )}
                    {product.measurements.sleeve && (
                      <div>
                        <span className="text-gray-500">Sleeve:</span> {product.measurements.sleeve}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 h-10 text-center border rounded-lg"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border rounded-lg hover:bg-gray-50 transition-colors"
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

              <div className="mt-8 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <div>Free Shipping</div>
                    <div className="text-gray-500">On orders over $100</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <div>Easy Returns</div>
                    <div className="text-gray-500">30-day return policy</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <div>AR Try-On Available</div>
                    <div className="text-gray-500">See how it fits with body tracking</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAR && <ARViewer product={product} onClose={() => setShowAR(false)} />}
    </>
  );
}