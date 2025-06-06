import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types'; 
import { supabase } from '../lib/supabaseClient';

export interface ProductContextType {
  products: Product[];
  addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  isLoading: boolean;
}

// Exporta o contexto para ser usado pelo hook em outro arquivo
export const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Esta string mágica diz ao Supabase para renomear as colunas do banco (snake_case)
// para as propriedades que nosso app espera (camelCase) quando fazemos um SELECT.
const productSelectString = `
    id, name, price, stock, cost, category, barcode,
    imageUrl:image_url,
    customCategory:custom_category,
    minStock:min_stock,
    supplierId:supplier_id
`;

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(productSelectString); // Usando a string para mapear os nomes
      
      if (error) {
        console.error('Erro ao buscar produtos:', error);
        setProducts([]);
      } else {
        // Os dados agora correspondem perfeitamente ao nosso tipo 'Product'
        setProducts(data as Product[]); 
      }
      setIsLoading(false);
    };

    fetchProducts();
  }, []);

  const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const newId = Date.now().toString(); // Gerando um ID único
    
    // Traduzindo nosso objeto do app (camelCase) para o formato do banco (snake_case)
    const productToSend = {
      id: newId,
      name: productData.name,
      price: productData.price,
      stock: productData.stock,
      cost: productData.cost,
      category: productData.category,
      barcode: productData.barcode,
      image_url: productData.imageUrl,
      custom_category: productData.customCategory,
      min_stock: productData.minStock,
      supplier_id: productData.supplierId,
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert([productToSend])
      .select(productSelectString) // Pedimos de volta os dados já no formato camelCase
      .single();

    if (error) throw error;
    setProducts(prev => [...prev, data as Product]);
    return data as Product;
  };

  const updateProduct = async (id: string, productData: Partial<Product>): Promise<Product> => {
    // Traduzindo apenas os campos que queremos atualizar para o formato do banco (snake_case)
    const productToSend = {
      name: productData.name,
      price: productData.price,
      stock: productData.stock,
      cost: productData.cost,
      category: productData.category,
      barcode: productData.barcode,
      image_url: productData.imageUrl,
      custom_category: productData.customCategory,
      min_stock: productData.minStock,
      supplier_id: productData.supplierId,
    };
    
    const { data, error } = await supabase
      .from('products')
      .update(productToSend)
      .eq('id', id)
      .select(productSelectString)
      .single();

    if (error) throw error;
    setProducts(prev => prev.map(p => (p.id === id ? (data as Product) : p)));
    return data as Product;
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const getProductById = (id: string): Product | undefined => {
    return products.find(p => p.id === id);
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, getProductById, isLoading }}>
      {children}
    </ProductContext.Provider>
  );
};