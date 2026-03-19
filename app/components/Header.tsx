import { Link } from 'react-router';
import { ShoppingCart, Shirt } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function Header() {
  const { cartCount } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shirt className="size-6" />
          <span className="text-xl">AR Fashion</span>
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link to="/" className="hover:opacity-70 transition-opacity">
            Shop
          </Link>
          <Link to="/cart" className="relative hover:opacity-70 transition-opacity">
            <ShoppingCart className="size-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full size-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}