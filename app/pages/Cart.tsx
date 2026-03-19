import { Link } from 'react-router';
import { Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="size-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Add some products to get started</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="size-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="size-5" />
          Continue Shopping
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl">Shopping Cart ({cart.length} items)</h1>
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Clear Cart
                </button>
              </div>

              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div
                    key={`${item.product.id}-${item.size || 'no-size'}-${index}`}
                    className="flex gap-4 pb-4 border-b last:border-b-0"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                    />
                    
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <div>
                          <Link
                            to={`/product/${item.product.id}`}
                            className="hover:opacity-70 transition-opacity"
                          >
                            <h3>{item.product.name}</h3>
                          </Link>
                          <div className="text-sm text-gray-500">
                            {item.product.category}
                            {item.size && ` • Size: ${item.size}`}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.size)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size)}
                            className="w-8 h-8 border rounded hover:bg-gray-50 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.size)}
                            className="w-8 h-8 border rounded hover:bg-gray-50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        
                        <div className="text-xl">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 sticky top-24">
              <h2 className="text-xl mb-6">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (estimated)</span>
                  <span>${(cartTotal * 0.08).toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-xl">
                  <span>Total</span>
                  <span>${(cartTotal * 1.08).toFixed(2)}</span>
                </div>
              </div>

              <button className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors mb-3">
                Proceed to Checkout
              </button>
              
              <div className="text-sm text-gray-500 text-center">
                Secure checkout with SSL encryption
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}