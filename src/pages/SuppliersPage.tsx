import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Truck } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Supplier } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSuppliers } from '../context/SupplierContext'; 

const SuppliersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const { 
    suppliers: suppliersFromContext, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier, 
    isLoading: isLoadingSuppliers 
  } = useSuppliers();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Omit<Supplier, 'id'>>>({
    name: '', phone: '', email: '', address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    if (isLoadingSuppliers) return [];
    return suppliersFromContext.filter(supplier => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.phone && supplier.phone.includes(searchTerm)) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [suppliersFromContext, searchTerm, isLoadingSuppliers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setCurrentSupplier(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address || ''
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
      setIsSubmitting(true);
      try {
        await deleteSupplier(id);
      } catch (error) {
        console.error("Erro ao excluir fornecedor:", error);
        setFormError(error instanceof Error ? error.message : "Erro ao excluir fornecedor.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name || !formData.phone) {
      setFormError("Nome e Telefone são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      const payload: Omit<Supplier, 'id'> = {
        name: formData.name!,
        phone: formData.phone!,
        email: formData.email || '',
        address: formData.address || '',
      };

      if (showEditModal && currentSupplier) {
        await updateSupplier(currentSupplier.id, payload);
        setShowEditModal(false);
      } else {
        await addSupplier(payload);
        setShowAddModal(false);
      }
      setFormData({ name: '', phone: '', email: '', address: '' });
      setCurrentSupplier(null);
    } catch (error) {
      console.error("Erro ao salvar fornecedor:", error);
      setFormError(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-full bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Acesso Restrito</h1>
          <p className="text-gray-500 dark:text-gray-400">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (isLoadingSuppliers) {
    return (
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            <p className="ml-4 text-gray-700 dark:text-gray-300">Carregando fornecedores...</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Fornecedores</h1>
        <Button onClick={handleOpenAddModal} disabled={isSubmitting}>
          <Plus size={16} className="mr-2" />
          Novo Fornecedor
        </Button>
      </div>
      
      <Card className="mb-6" transparentDarkBg={true}>
        <div className="p-3 md:p-4">
          <Input
            type="text"
            placeholder="Buscar fornecedores por nome, telefone ou email..."
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Fornecedor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Endereço</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <Truck size={20} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 dark:text-gray-200">{supplier.phone}</div>
                      {supplier.email && <div className="text-xs text-gray-500 dark:text-gray-400">{supplier.email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell">{supplier.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)} className="px-2 py-1" disabled={isSubmitting}><Edit size={16} /></Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(supplier.id)} className="px-2 py-1" disabled={isSubmitting}><Trash2 size={16} /></Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    <Truck size={40} className="mx-auto mb-2 text-gray-400 dark:text-gray-500"/>
                    Nenhum fornecedor encontrado.
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-75 transition-opacity" onClick={() => {if(!isSubmitting){setShowAddModal(false); setShowEditModal(false); setFormError(null);}}}></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <form onSubmit={handleSave} className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">
                  {showEditModal ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </h3>
                {formError && <p className="text-red-600 dark:text-red-400 text-sm mb-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>}
                <div className="space-y-4">
                    <Input label="Nome do Fornecedor" type="text" name="name" id="name" required value={formData.name || ''} onChange={handleInputChange} fullWidth/>
                    <Input label="Telefone" type="text" name="phone" id="phone" required value={formData.phone || ''} onChange={handleInputChange} fullWidth/>
                    <Input label="Email" type="email" name="email" id="email" value={formData.email || ''} onChange={handleInputChange} fullWidth/>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                        <textarea name="address" id="address" rows={3}
                            className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md p-2"
                            value={formData.address || ''}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <Button type="submit" className="sm:ml-3" isLoading={isSubmitting} disabled={isSubmitting}>
                  {showEditModal ? 'Salvar Alterações' : 'Adicionar Fornecedor'}
                </Button>
                <Button type="button" variant="outline" className="mt-3 sm:mt-0" onClick={() => {if(!isSubmitting){setShowAddModal(false); setShowEditModal(false); setFormError(null);}}} disabled={isSubmitting}>
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

export default SuppliersPage;