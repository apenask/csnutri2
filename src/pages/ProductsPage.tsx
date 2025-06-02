import React, { useState, useMemo } from 'react'; // Removido useEffect pois não está sendo usado
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';

const ProductsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const { 
    products: productsFromContext, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    isLoading: isLoadingProducts 
  } = useProducts();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: '', price: 0, cost: 0, stock: 0, minStock: 0, imageUrl: '', customCategory: '',
  });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    if (isLoadingProducts) return [];
    return productsFromContext.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.customCategory || product.category).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productsFromContext, searchTerm, isLoadingProducts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'cost' || name === 'stock' || name === 'minStock' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleOpenAddModal = () => {
    console.log('Botão Novo Produto clicado - handleOpenAddModal chamada');
    setError('');
    setCurrentProduct(null);
    setFormData({ name: '', category: '', price: 0, cost: 0, stock: 0, minStock: 0, imageUrl: '', customCategory: '' });
    setShowAddModal(true); // ESTA LINHA DEVE ABRIR O MODAL
  };

  const handleEdit = (product: Product) => {
    setError('');
    setCurrentProduct(product);
    setFormData({
        name: product.name || '',
        category: product.category || '',
        price: product.price || 0,
        cost: product.cost || 0,
        stock: product.stock || 0,
        minStock: product.minStock || 0,
        imageUrl: product.imageUrl || '',
        customCategory: product.customCategory || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      setIsSubmitting(true);
      try {
        await deleteProduct(id);
      } catch (err) {
        console.error("Erro ao deletar produto:", err);
        setError(err instanceof Error ? err.message : 'Erro ao deletar produto');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!formData.name || !(formData.customCategory || formData.category)) { // Verifica se uma das categorias está preenchida
      setError('Nome e Categoria (Padrão ou Customizada) são obrigatórios.');
      setIsSubmitting(false);
      return;
    }
    if (formData.price == null || formData.cost == null || formData.stock == null || formData.minStock == null) {
        setError('Preço, Custo, Estoque e Estoque Mínimo são obrigatórios e devem ser números.');
        setIsSubmitting(false);
        return;
    }
    
    try {
      const productPayload: Omit<Product, 'id'> = {
          name: formData.name!,
          category: formData.category || 'Outros', // Fallback se customCategory não for usado e category estiver vazia
          price: Number(formData.price) || 0,
          cost: Number(formData.cost) || 0,
          stock: Number(formData.stock) || 0,
          minStock: Number(formData.minStock) || 0,
          imageUrl: formData.imageUrl,
          customCategory: formData.customCategory,
      };
      // Se customCategory for preenchida, ela tem precedência.
      if (formData.customCategory && formData.customCategory.trim() !== '') {
        productPayload.category = formData.customCategory; // Usar customCategory como a categoria principal se preenchida
        productPayload.customCategory = formData.customCategory; // E manter em customCategory também
      }


      if (showEditModal && currentProduct) {
        await updateProduct(currentProduct.id, productPayload);
        setShowEditModal(false);
      } else {
        await addProduct(productPayload);
        setShowAddModal(false);
      }
      setFormData({ name: '', category: '', price: 0, cost: 0, stock: 0, minStock: 0, imageUrl: '', customCategory: '' });
      setCurrentProduct(null);
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        <p className="ml-4 text-gray-700 dark:text-gray-300">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Produtos</h1>
        {isAdmin && (
          <Button onClick={handleOpenAddModal} disabled={isSubmitting}>
            <Plus size={16} className="mr-2" />
            Novo Produto
          </Button>
        )}
      </div>
      
      <Card className="mb-6" transparentDarkBg={true}>
        <div className="p-3 md:p-4">
          <Input
            type="text"
            placeholder="Buscar produtos por nome ou categoria..."
            icon={<Search size={18} className="text-gray-400 dark:text-gray-500" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>
      </Card>
      
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-700/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Preço</th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Custo</th>
                )}
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Estoque</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Est. Mínimo</th>
                {isAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <Package size={20} className="text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{product.customCategory || product.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 dark:text-gray-200">{formatCurrency(product.price)}</div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-800 dark:text-gray-200">{formatCurrency(product.cost)}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.stock <= product.minStock && product.stock > 0
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'
                          : product.stock <= 0 
                            ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center hidden sm:table-cell">
                      {product.minStock}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(product)} className="mr-2" disabled={isSubmitting}><Edit size={16} /></Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(product.id)} disabled={isSubmitting}><Trash2 size={16} /></Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    <Package size={40} className="mx-auto mb-2 text-gray-400 dark:text-gray-500"/>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-75 transition-opacity" onClick={() => {if(!isSubmitting){setShowAddModal(false); setShowEditModal(false); setError('');}}}></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <form onSubmit={handleSave} className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">
                  {showEditModal ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                {error && <p className="text-red-600 dark:text-red-400 text-sm mb-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}
                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-6"><Input label="Nome do Produto" type="text" name="name" id="name" required value={formData.name || ''} onChange={handleInputChange}/></div>
                  <div className="sm:col-span-3">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria Padrão</label>
                    <select name="category" id="category" value={formData.category || ''} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md shadow-sm">
                      <option value="">Selecione</option>
                      <option value="Supplements">Suplementos</option>
                      <option value="Snacks">Lanches</option>
                      <option value="Accessories">Acessórios</option>
                      <option value="Clothing">Vestuário</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3"><Input label="Ou Categoria Customizada" type="text" name="customCategory" id="customCategory" value={formData.customCategory || ''} onChange={handleInputChange} /></div>
                  <div className="sm:col-span-3"><Input label="Preço de Venda" type="number" name="price" id="price" min="0" step="0.01" required value={String(formData.price || 0)} onChange={handleInputChange} /></div>
                  <div className="sm:col-span-3"><Input label="Custo" type="number" name="cost" id="cost" min="0" step="0.01" required value={String(formData.cost || 0)} onChange={handleInputChange} /></div>
                  <div className="sm:col-span-3"><Input label="Estoque Atual" type="number" name="stock" id="stock" min="0" required value={String(formData.stock || 0)} onChange={handleInputChange} /></div>
                  <div className="sm:col-span-3"><Input label="Estoque Mínimo" type="number" name="minStock" id="minStock" min="0" required value={String(formData.minStock || 0)} onChange={handleInputChange} /></div>
                  <div className="sm:col-span-6"><Input label="URL da Imagem (Opcional)" type="text" name="imageUrl" id="imageUrl" value={formData.imageUrl || ''} onChange={handleInputChange} /></div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                  {showEditModal ? 'Salvar Alterações' : 'Adicionar Produto'}
                </Button>
                <Button type="button" variant="outline" className="mt-3 sm:mt-0 sm:ml-3" onClick={() => {if(!isSubmitting){setShowAddModal(false); setShowEditModal(false); setError('');}}} disabled={isSubmitting}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;