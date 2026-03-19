export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  sizes?: string[];
  measurements?: {
    chest?: string;
    waist?: string;
    hips?: string;
    length?: string;
    sleeve?: string;
  };
  arAvailable: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
}

export interface BodyMeasurement {
  point: string;
  value: number;
  unit: string;
}