import { Link } from 'react-router';
import { ShoppingCart, Eye, Camera } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleQuickAdd = () => {
    if (product.sizes && product.sizes.length > 0) {
      // For quick add, redirect to product page for size selection
      return;
    }
    addToCart(product);
  };

  return (
    <div className="group bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.arAvailable && (
          <div className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Camera className="size-3" />
            AR
          </div>
        )}
      </Link>
      
      <div className="p-4">
        <div className="text-sm text-gray-500 mb-1">{product.category}</div>
        <Link to={`/product/${product.id}`}>
          <h3 className="mb-2 hover:opacity-70 transition-opacity">{product.name}</h3>
        </Link>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl">${product.price}</span>
          <div className="flex gap-2">
            <Link
              to={`/product/${product.id}`}
              className="p-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="size-5" />
            </Link>
            <Link
              to={`/product/${product.id}`}
              className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ShoppingCart className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}