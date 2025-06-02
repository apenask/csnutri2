// src/context/ProductContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types'; // 
import { products as initialProductsFallback } from '../data/mockData'; //

interface ProductContextType {
  products: Product[];
  addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, productData: Partial<Product> & { stockIncrement?: number }) => Promise<Product>; // Modificado para aceitar stockIncrement
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  isLoading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let loadedProducts: Product[] = initialProductsFallback.map(p => ({
        ...p,
        stock: p.stock || 0, // Garante que stock seja um número
        minStock: p.minStock || 0 // Garante que minStock seja um número
    }));
    try {
      const savedProducts = localStorage.getItem('csNutriProducts');
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts) as Product[];
        loadedProducts = parsedProducts.map(p => ({
            ...p,
            stock: p.stock || 0,
            minStock: p.minStock || 0
        }));
      } else {
        localStorage.setItem('csNutriProducts', JSON.stringify(loadedProducts));
      }
    } catch (error) {
      console.error('Falha ao carregar produtos do localStorage no useEffect inicial:', error);
      if (!localStorage.getItem('csNutriProducts')) {
        localStorage.setItem('csNutriProducts', JSON.stringify(loadedProducts));
      }
    }
    setProducts(loadedProducts);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('csNutriProducts', JSON.stringify(products));
    }
  }, [products, isLoading]);

  const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    if (!productData.name || !productData.category || productData.price == null || productData.cost == null || productData.stock == null || productData.minStock == null) {
      throw new Error('Todos os campos obrigatórios do produto devem ser preenchidos.');
    }
    const newProduct: Product = {
      id: Date.now().toString(),
      ...productData,
    };
    setProducts(prevProducts => [...prevProducts, newProduct]);
    return newProduct;
  };

  // MODIFICADO AQUI para lidar com stockIncrement
  const updateProduct = async (id: string, productData: Partial<Product> & { stockIncrement?: number }): Promise<Product> => {
    let updatedProductInstance: Product | null = null;
    setProducts(prevProducts =>
      prevProducts.map(p => {
        if (p.id === id) {
          let newStock = p.stock;
          if (typeof productData.stockIncrement === 'number') {
            newStock = (p.stock || 0) + productData.stockIncrement;
          }
          // Se productData também tiver 'stock', ele sobrescreverá o newStock calculado pelo incremento.
          // A ordem de aplicação pode ser importante dependendo do caso de uso.
          // Para o caso de `deleteSale` querendo incrementar, e um update normal querendo definir,
          // precisamos de uma lógica clara.
          // Se `stockIncrement` existir, ele tem prioridade para modificar o estoque.
          // Outras propriedades de `productData` (incluindo `stock` se vier explicitamente) são mescladas.

          const { stockIncrement, ...otherUpdates } = productData;
          
          updatedProductInstance = { 
            ...p, 
            ...otherUpdates // Aplica outras atualizações primeiro
          };

          if (typeof stockIncrement === 'number') {
            updatedProductInstance.stock = (p.stock || 0) + stockIncrement;
          } else if (otherUpdates.stock !== undefined) { // Se stock foi passado explicitamente
            updatedProductInstance.stock = otherUpdates.stock;
          }
          // Se nem stockIncrement nem stock explícito foram passados, p.stock original é mantido (ou o que veio de ...p)

          return updatedProductInstance;
        }
        return p;
      })
    );
    if (!updatedProductInstance) {
      throw new Error('Produto não encontrado para atualização.');
    }
    return updatedProductInstance;
  };

  const deleteProduct = async (id: string): Promise<void> => {
    setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
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

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts deve ser usado dentro de um ProductProvider');
  }
  return context;
};