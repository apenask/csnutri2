// src/context/ProductContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types'; 
import { products as initialProductsFallback } from '../data/mockData'; 

interface ProductContextType {
  products: Product[];
  addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, productData: Partial<Product> & { stockIncrement?: number }) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  isLoading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);

  // Efeito para carregar produtos do localStorage ou usar fallback na montagem inicial
  useEffect(() => {
    // Garante que o fallback inicial também tenha stock/minStock como números
    let loadedProducts: Product[] = initialProductsFallback.map(p => ({
        ...p,
        stock: Number(p.stock) || 0, // Garante que seja número, fallback para 0
        minStock: Number(p.minStock) || 0, // Garante que seja número, fallback para 0
        price: Number(p.price) || 0,
        cost: Number(p.cost) || 0,
    }));

    try {
      const savedProducts = localStorage.getItem('csNutriProducts');
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts) as Product[];
        // Ao carregar do localStorage, também garante que os campos numéricos sejam números
        loadedProducts = parsedProducts.map(p => ({
            ...p,
            price: Number(p.price) || 0,
            cost: Number(p.cost) || 0,
            stock: Number(p.stock) || 0, 
            minStock: Number(p.minStock) || 0 
        }));
      } else {
        // Se não houver nada salvo, salva o fallback inicial (já normalizado)
        localStorage.setItem('csNutriProducts', JSON.stringify(loadedProducts));
      }
    } catch (error) {
      console.error('Falha ao carregar produtos do localStorage:', error);
      // Se houver erro ao parsear, `loadedProducts` permanece como o fallback inicial.
      // Se o localStorage estava vazio e deu erro (improvável), ou se queremos garantir
      // que o fallback seja salvo se o parse falhar e não havia nada antes:
      if (!localStorage.getItem('csNutriProducts')) {
         localStorage.setItem('csNutriProducts', JSON.stringify(initialProductsFallback.map(p => ({
            ...p,
            price: Number(p.price) || 0,
            cost: Number(p.cost) || 0,
            stock: Number(p.stock) || 0,
            minStock: Number(p.minStock) || 0
        }))));
      }
    }
    setProducts(loadedProducts);
    setIsLoading(false);
  }, []); // Array de dependências vazio para executar apenas na montagem

  // Efeito para salvar produtos no localStorage sempre que a lista 'products' ou 'isLoading' mudar
  useEffect(() => {
    if (!isLoading) {
      // Ao salvar, garante que os campos numéricos sejam números
      const productsToSave = products.map(p => ({
        ...p,
        price: Number(p.price) || 0,
        cost: Number(p.cost) || 0,
        stock: Number(p.stock) || 0,
        minStock: Number(p.minStock) || 0,
      }));
      localStorage.setItem('csNutriProducts', JSON.stringify(productsToSave));
    }
  }, [products, isLoading]);

  // Função para adicionar um novo produto
  const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    if (!productData.name || !productData.category || productData.price == null || productData.cost == null || productData.stock == null || productData.minStock == null) {
      throw new Error('Nome, categoria, preço, custo, estoque e estoque mínimo são obrigatórios.');
    }
    const newProduct: Product = {
      id: Date.now().toString(),
      ...productData,
      price: Number(productData.price) || 0, // Garante que seja número
      cost: Number(productData.cost) || 0,   // Garante que seja número
      stock: Number(productData.stock) || 0, // Garante que seja número
      minStock: Number(productData.minStock) || 0, // Garante que seja número
    };
    setProducts(prevProducts => [...prevProducts, newProduct]);
    return newProduct;
  };

  // Função para atualizar um produto existente
  const updateProduct = async (id: string, productData: Partial<Product> & { stockIncrement?: number }): Promise<Product> => {
    let updatedProductInstance: Product | null = null;
    setProducts(prevProducts =>
      prevProducts.map(p => {
        if (p.id === id) {
          const { stockIncrement, ...otherUpdates } = productData;
          
          // Garante que os campos numéricos em otherUpdates sejam números antes de mesclar
          if (otherUpdates.price !== undefined) otherUpdates.price = Number(otherUpdates.price) || 0;
          if (otherUpdates.cost !== undefined) otherUpdates.cost = Number(otherUpdates.cost) || 0;
          if (otherUpdates.stock !== undefined) otherUpdates.stock = Number(otherUpdates.stock) || 0;
          if (otherUpdates.minStock !== undefined) otherUpdates.minStock = Number(otherUpdates.minStock) || 0;

          let finalStock = p.stock; // Começa com o estoque atual do produto 'p' (que já deve ser um número)

          // Se um novo valor de estoque é definido explicitamente em otherUpdates, ele se torna a base
          if (otherUpdates.stock !== undefined) {
            finalStock = otherUpdates.stock;
          }

          // Se stockIncrement é fornecido, ele opera sobre o finalStock
          // (que pode ser o otherUpdates.stock ou o p.stock original se otherUpdates.stock não foi fornecido)
          if (typeof stockIncrement === 'number') {
            finalStock = (Number(finalStock) || 0) + stockIncrement;
          }

          updatedProductInstance = {
            ...p, // Mantém campos não alterados de 'p'
            ...otherUpdates, // Aplica outras atualizações (já convertidas para número onde aplicável)
            stock: finalStock, // Define o estoque final calculado
          };
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

  // Função para deletar um produto
  const deleteProduct = async (id: string): Promise<void> => {
    setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
  };

  // Função para buscar um produto por ID
  const getProductById = (id: string): Product | undefined => {
    return products.find(p => p.id === id);
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, getProductById, isLoading }}>
      {children}
    </ProductContext.Provider>
  );
};

// Hook customizado para usar o Contexto de Produtos
export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts deve ser usado dentro de um ProductProvider');
  }
  return context;
};
