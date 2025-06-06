import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, User, Users, Phone, Mail, Eye, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Customer, Sale } from '../types';
import { useAuth } from '../context/useAuth';
import { useCustomers } from '../context/CustomerContext';
import { useSales } from '../context/useSales';
import { useProducts } from '../context/useProducts';
import { format, parseISO } from 'date-fns';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const CustomersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const {
    customers: customersFromContext,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    isLoading: isLoadingCustomers,
    getCustomerById: getCustomerFromContextById
  } = useCustomers();

  const { getSalesByCustomerId, isLoading: isLoadingSales } = useSales();
  const { getProductById, isLoading: isLoadingProducts } = useProducts();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [customerSalesHistory, setCustomerSalesHistory] = useState<Sale[]>([]);

  const [formData, setFormData] = useState<Partial<Omit<Customer, 'id' | 'points' | 'totalPurchases' | 'totalSpent'>>>({
    name: '', phone: '', email: '', address: '', customCategory: '',
  });

  const [formError, setFormError] = useState<string>('');
  const [pageMessage, setPageMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false);
  const [customerIdToDelete, setCustomerIdToDelete] = useState<string | null>(null);

  const isLoading = isLoadingCustomers || isLoadingSales || isLoadingProducts;

  useEffect(() => {
    if (pageMessage) {
      const timer = setTimeout(() => setPageMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pageMessage]);

  const customerId = currentCustomer?.id;
  useEffect(() => {
    if (customerId) {
      const updatedCustomerFromContext = getCustomerFromContextById(customerId);
      if (updatedCustomerFromContext) {
        setCurrentCustomer(updatedCustomerFromContext);
      }
    }
  }, [customersFromContext, customerId, getCustomerFromContextById]);


  const filteredCustomers = useMemo(() => {
    if (isLoadingCustomers) return [];
    return customersFromContext.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customersFromContext, searchTerm, isLoadingCustomers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setFormError('');
    setPageMessage(null);
    setFormData({ name: '', phone: '', email: '', address: '', customCategory: '' });
    setCurrentCustomer(null);
    setShowAddModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setFormError('');
    setPageMessage(null);
    setCurrentCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      customCategory: customer.customCategory || '',
    });
    setShowEditModal(true);
  };

  const handleView = (customer: Customer) => {
    setPageMessage(null);
    setCurrentCustomer(customer);
    if (!isLoadingSales && !isLoadingProducts) {
      const salesHistory = getSalesByCustomerId(customer.id);
      setCustomerSalesHistory(salesHistory.sort((a: Sale, b: Sale) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
    }
    setShowViewModal(true);
  };

  const requestDeleteCustomer = (id: string) => {
    setPageMessage(null);
    setCustomerIdToDelete(id);
    setShowDeleteCustomerModal(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerIdToDelete) return;
    setIsSubmitting(true);
    setPageMessage(null);
    try {
      await deleteCustomer(customerIdToDelete);
      setPageMessage({ type: 'success', text: 'Cliente excluído com sucesso!' });
    } catch (err) {
      console.error("Erro ao deletar cliente:", err);
      setPageMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao deletar cliente' });
    } finally {
      setIsSubmitting(false);
      setShowDeleteCustomerModal(false);
      setCustomerIdToDelete(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setPageMessage(null);

    if (!formData.name || !formData.phone) {
      setFormError('Nome e Telefone são obrigatórios.');
      return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormError('Email é obrigatório e deve ser válido.');
      return;
    }
    setIsSubmitting(true);

    try {
      const customerDataPayload = {
        name: formData.name!,
        phone: formData.phone!,
        email: formData.email!,
        address: formData.address,
        customCategory: formData.customCategory,
      };

      if (showEditModal && currentCustomer) {
        await updateCustomer(currentCustomer.id, customerDataPayload);
        setShowEditModal(false);
        setPageMessage({ type: 'success', text: 'Cliente atualizado com sucesso!' });
      } else {
        await addCustomer(customerDataPayload);
        setShowAddModal(false);
        setPageMessage({ type: 'success', text: 'Cliente adicionado com sucesso!' });
      }
      setFormData({ name: '', phone: '', email: '', address: '', customCategory: '' });
      setCurrentCustomer(null);
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao salvar cliente.';
      setFormError(errorMessage);
      setPageMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecalculateCustomerTotals = async () => {
    if (!currentCustomer || isLoadingSales) return;
    setIsRecalculating(true);
    setPageMessage(null);
    try {
      const customerSales = getSalesByCustomerId(currentCustomer.id);
      let newTotalSpent = 0;
      let newTotalPurchases = 0;
      let newPoints = 0;

      customerSales.forEach((sale: Sale) => {
        newTotalSpent += sale.total;
        newTotalPurchases += 1;
        newPoints += sale.pointsEarned || 0;
      });

      await updateCustomer(currentCustomer.id, {
        totalSpent: newTotalSpent,
        totalPurchases: newTotalPurchases,
        points: newPoints,
      });

      const updatedCustomer = getCustomerFromContextById(currentCustomer.id);
      if (updatedCustomer) {
        setCurrentCustomer(updatedCustomer);
      }

      setPageMessage({ type: 'success', text: 'Totais do cliente recalculados com sucesso!' });
    } catch (error) {
      console.error("Erro ao recalcular totais do cliente:", error);
      setPageMessage({ type: 'error', text: 'Falha ao recalcular totais.' });
    } finally {
      setIsRecalculating(false);
    }
  };

  const getProductName = (productId: string): string => {
    if (isLoadingProducts) return 'Carregando...';
    const product = getProductById(productId);
    return product ? product.name : 'Produto Desconhecido';
  };

  const formatCurrency = (value: number | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatDate = (dateString: string | undefined) => {
    try { if (!dateString) return 'N/A'; return format(parseISO(dateString), 'dd/MM/yyyy'); }
    catch { return dateString; }
  };
  const formatDateTime = (dateString: string | undefined) => {
    try { if (!dateString) return 'N/A'; return format(parseISO(dateString), 'dd/MM/yyyy HH:mm'); }
    catch { return dateString; }
  };

  const getLastPurchaseDate = (customerId: string): string | undefined => {
    if (isLoadingSales) return undefined;
    const customerSalesData = getSalesByCustomerId(customerId);
    if (customerSalesData.length === 0) return undefined;
    return customerSalesData.sort((a: Sale, b: Sale) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0].date;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        <p className="ml-4 text-gray-700 dark:text-gray-300">Carregando clientes...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Clientes</h1>
        {isAdmin && (
          <Button onClick={handleOpenAddModal} disabled={isSubmitting}>
            <Plus size={16} className="mr-2" />
            Novo Cliente
          </Button>
        )}
      </div>

      {pageMessage && (
        <div className={`mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ${pageMessage.type === 'success' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
          {pageMessage.text}
        </div>
      )}

      <Card className="mb-6" transparentDarkBg={true}>
        <div className="p-3 md:p-4">
          <Input
            type="text"
            placeholder="Buscar clientes por nome, telefone ou email..."
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Compras</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Total Gasto</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const lastSaleDate = getLastPurchaseDate(customer.id);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                            <User size={20} className="text-red-600 dark:text-red-300" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{customer.name}</div>
                            {customer.address && (<div className="text-xs text-gray-500 dark:text-gray-400">{customer.address}</div>)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-0.5">
                          <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                            <Phone size={14} className="mr-2 text-gray-400 dark:text-gray-500" /> {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Mail size={14} className="mr-2 text-gray-400 dark:text-gray-500" /> {customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm text-gray-800 dark:text-gray-200">{customer.totalPurchases || 0}</div>
                        {lastSaleDate && (<div className="text-xs text-gray-500 dark:text-gray-400">Última: {formatDate(lastSaleDate)}</div>)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatCurrency(customer.totalSpent)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleView(customer)} disabled={isSubmitting || isLoadingSales} className="px-2 py-1"><Eye size={16} /></Button>
                        {isAdmin && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(customer)} disabled={isSubmitting} className="px-2 py-1"><Edit size={16} /></Button>
                            <Button variant="danger" size="sm" onClick={() => requestDeleteCustomer(customer.id)} disabled={isSubmitting} className="px-2 py-1"><Trash2 size={16} /></Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    <Users size={40} className="mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                    Nenhum cliente encontrado.
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-75 transition-opacity" onClick={() => { if (!isSubmitting) { setShowAddModal(false); setShowEditModal(false); setFormError(''); } }}></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <form onSubmit={handleSave} className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">
                  {showEditModal ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                {formError && <p className="text-red-600 dark:text-red-400 text-sm mb-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>}
                <div className="grid grid-cols-1 gap-y-4 gap-x-4">
                  <Input label="Nome Completo" type="text" name="name" id="name" required value={formData.name || ''} onChange={handleInputChange} fullWidth />
                  <Input label="Telefone" type="text" name="phone" id="phone" required value={formData.phone || ''} onChange={handleInputChange} fullWidth />
                  <Input label="Email" type="email" name="email" id="email" required value={formData.email || ''} onChange={handleInputChange} fullWidth />
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                    <textarea name="address" id="address" rows={3}
                      className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md p-2"
                      value={formData.address || ''} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <Button type="submit" className="sm:ml-3" isLoading={isSubmitting} disabled={isSubmitting}>{showEditModal ? 'Salvar Alterações' : 'Adicionar Cliente'}</Button>
                <Button type="button" variant="outline" className="mt-3 sm:mt-0" onClick={() => { if (!isSubmitting) { setShowAddModal(false); setShowEditModal(false); setFormError(''); } }} disabled={isSubmitting}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && currentCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black dark:bg-opacity-75 transition-opacity" onClick={() => setShowViewModal(false)}></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100 mb-4">Detalhes do Cliente</h3>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRecalculateCustomerTotals}
                      isLoading={isRecalculating}
                      disabled={isRecalculating || isLoadingSales}
                      className="ml-auto"
                    >
                      <RefreshCw size={14} className="mr-2" />
                      Recalcular Totais
                    </Button>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-6 space-y-3">
                  <div className="flex items-center">
                    <div className="h-12 w-12 flex-shrink-0 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center"><User size={24} className="text-red-600 dark:text-red-300" /></div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{currentCustomer.name}</h4>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1"><Phone size={16} className="mr-2" />{currentCustomer.phone}</div>
                      {currentCustomer.email && (<div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1"><Mail size={16} className="mr-2" />{currentCustomer.email}</div>)}
                    </div>
                  </div>
                  {currentCustomer.address && (<div className="p-3 bg-white dark:bg-gray-700/60 rounded-md"><h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Endereço</h5><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentCustomer.address}</p></div>)}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white dark:bg-gray-700/60 rounded-md"><h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pontos</h5><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentCustomer.points || 0}</p></div>
                    <div className="p-3 bg-white dark:bg-gray-700/60 rounded-md"><h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Total de Compras</h5><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentCustomer.totalPurchases || 0}</p></div>
                    <div className="p-3 bg-white dark:bg-gray-700/60 rounded-md"><h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Gasto</h5><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{formatCurrency(currentCustomer.totalSpent)}</p></div>
                  </div>
                </div>

                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Histórico de Compras</h4>
                {isLoadingSales || isLoadingProducts ? <p className="dark:text-gray-400">Carregando histórico...</p> : customerSalesHistory.length > 0 ? (
                  <div className="overflow-x-auto max-h-80 border border-gray-200 dark:border-gray-700 rounded-md">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/60 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Itens Comprados</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Pagamento</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Venda</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {customerSalesHistory.map((sale) => (
                          <tr key={sale.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDateTime(sale.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              <ul className="list-disc list-inside space-y-0.5">
                                {sale.items.map(item => (
                                  <li key={item.productId}>
                                    {item.quantity}x {getProductName(item.productId)} ({formatCurrency(item.price)})
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-300">
                                {sale.payments.map(p => p.method.charAt(0).toUpperCase() + p.method.slice(1)).join(', ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-800 dark:text-gray-100">{formatCurrency(sale.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (<div className="text-center py-4 text-gray-500 dark:text-gray-400">Este cliente ainda não realizou nenhuma compra.</div>)}
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                <Button onClick={() => setShowViewModal(false)} className="w-full sm:w-auto">Fechar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteCustomerModal}
        onClose={() => {
          if (!isSubmitting) {
            setShowDeleteCustomerModal(false);
            setCustomerIdToDelete(null);
          }
        }}
        onConfirm={confirmDeleteCustomer}
        title="Confirmar Exclusão de Cliente"
        message="Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita."
        confirmButtonText="Excluir Cliente"
        confirmButtonVariant="danger"
        icon={Trash2}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default CustomersPage;