import { useState } from 'react';
import { Link } from 'react-router';
import { ShoppingCart, Shirt, Menu, X, User, LogOut, Settings, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { cartCount } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left side - Menu button and Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSideMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="size-6" />
            </button>
            
            <Link to="/" className="flex items-center gap-2">
              <Shirt className="size-6 text-purple-600" />
              <span className="text-xl font-bold">AR Fashion</span>
            </Link>
          </div>
          
          {/* Right side - Navigation */}
          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className="hidden sm:block px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Shop
            </Link>
            
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                <User className="size-4 text-purple-600" />
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Sign In
              </Link>
            )}
            
            <Link
              to="/cart"
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="size-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full size-5 flex items-center justify-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      {/* Side Menu Overlay */}
      <AnimatePresence>
        {sideMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSideMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Side Menu */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-2xl overflow-y-auto"
            >
              {/* Menu Header */}
              <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white">
                    <Shirt className="size-8" />
                    <span className="text-2xl font-bold">AR Fashion</span>
                  </div>
                  <button
                    onClick={() => setSideMenuOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <X className="size-6" />
                  </button>
                </div>

                {isAuthenticated ? (
                  <div className="flex items-center gap-3 text-white">
                    <div className="size-12 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="size-6" />
                    </div>
                    <div>
                      <div className="font-semibold">{user?.name}</div>
                      <div className="text-sm text-purple-100">{user?.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-white">
                    <p className="mb-3">Welcome to AR Fashion</p>
                    <div className="flex gap-2">
                      <Link
                        to="/login"
                        onClick={() => setSideMenuOpen(false)}
                        className="flex-1 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold text-center hover:bg-purple-50 transition-colors"
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setSideMenuOpen(false)}
                        className="flex-1 px-4 py-2 bg-white/20 text-white rounded-lg font-semibold text-center hover:bg-white/30 transition-colors"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div className="p-4">
                <div className="space-y-1">
                  <Link
                    to="/"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Shirt className="size-5 text-gray-600" />
                    <span className="font-medium">Shop All</span>
                  </Link>

                  <Link
                    to="/cart"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ShoppingCart className="size-5 text-gray-600" />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium">Shopping Cart</span>
                      {cartCount > 0 && (
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          {cartCount}
                        </span>
                      )}
                    </div>
                  </Link>

                  {isAuthenticated && (
                    <>
                      <div className="border-t my-4" />
                      
                      <Link
                        to="/orders"
                        onClick={() => setSideMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Package className="size-5 text-gray-600" />
                        <span className="font-medium">My Orders</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setSideMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Settings className="size-5 text-gray-600" />
                        <span className="font-medium">Settings</span>
                      </Link>
                    </>
                  )}
                </div>

                {isAuthenticated && (
                  <>
                    <div className="border-t my-4" />
                    <button
                      onClick={() => {
                        logout();
                        setSideMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    >
                      <LogOut className="size-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-gray-50">
                <div className="text-xs text-gray-500 space-y-2">
                  <div className="flex gap-4">
                    <a href="#" className="hover:text-purple-600">About</a>
                    <a href="#" className="hover:text-purple-600">Help</a>
                    <a href="#" className="hover:text-purple-600">Privacy</a>
                    <a href="#" className="hover:text-purple-600">Terms</a>
                  </div>
                  <p>© 2026 AR Fashion. All rights reserved.</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
