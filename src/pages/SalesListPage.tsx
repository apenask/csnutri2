import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Eye, Edit, Trash2, Search, ShoppingBag, Calendar as CalendarIcon, User as UserIconLucide } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { Sale, PaymentDetail, Customer } from '../types';
import { useSales } from '../context/useSales';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/useProducts';
import { useUsers } from '../context/UserContext';
import { format, parseISO } from 'date-fns';

const SalesListPage: React.FC = () => {
  const { sales, isLoading: isLoadingSales, deleteSale, updateSale } = useSales();
  const { customers, getCustomerById, isLoading: isLoadingCustomers } = useCustomers();
  const { getProductById, isLoading: isLoadingProducts } = useProducts();
  const { getUserById: getUserNameById } = useUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Pick<Sale, 'date' | 'customerId'>>>({});
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [pageMessage, setPageMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [saleIdToDelete, setSaleIdToDelete] = useState<string | null>(null);

  const isLoading = isLoadingSales || isLoadingCustomers || isLoadingProducts;

  useEffect(() => {
    if (pageMessage) {
      const timer = setTimeout(() => setPageMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [pageMessage]);

  const getProductName = useCallback((productId: string): string => {
    const product = getProductById(productId);
    return product ? product.name : 'Produto desconhecido';
  }, [getProductById]);

  const getCustomerName = useCallback((customerId?: string): string => {
    if (!customerId) return 'Cliente não informado';
    const customer = getCustomerById(customerId);
    return customer ? customer.name : 'Cliente desconhecido';
  }, [getCustomerById]);

  const getSellerName = useCallback((userId?: string): string => {
    if (!userId) return 'Sistema';
    const user = getUserNameById(userId);
    return user ? user.name : 'Usuário Desconhecido';
  }, [getUserNameById]);

  const getDisplayPaymentMethods = (payments: PaymentDetail[] | undefined): string => {
    if (!payments || payments.length === 0) return 'N/A';
    return payments.map(p => p.method.charAt(0).toUpperCase() + p.method.slice(1)).join(', ');
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try { return format(parseISO(dateString), 'dd/MM/yyyy'); }
    catch { return dateString; }
  };

  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try { return format(parseISO(dateString), 'dd/MM/yyyy HH:mm'); }
    catch { return dateString; }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredSales = useMemo(() => {
    if (isLoading) return [];
    return sales
      .filter(sale => {
        const customerName = getCustomerName(sale.customerId).toLowerCase();
        const sellerName = getSellerName(sale.userId).toLowerCase();
        const saleIdMatch = sale.id.toLowerCase().includes(searchTerm.toLowerCase());
        const searchTermLower = searchTerm.toLowerCase();
        const itemsMatch = sale.items.some(item => getProductName(item.productId).toLowerCase().includes(searchTermLower));
        const customerMatch = customerName.includes(searchTermLower);
        const sellerMatch = sellerName.includes(searchTermLower);
        const dateMatch = filterDate ? sale.date.startsWith(filterDate) : true;
        return (customerMatch || saleIdMatch || itemsMatch || sellerMatch) && dateMatch;
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [sales, searchTerm, filterDate, isLoading, getCustomerName, getProductName, getSellerName]);

  const requestDeleteSale = (saleId: string) => {
    setPageMessage(null);
    setSaleIdToDelete(saleId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleIdToDelete) return;
    setIsSubmittingAction(true);
    try {
      await deleteSale(saleIdToDelete);
      setPageMessage({ type: 'success', text: 'Venda excluída com sucesso!' });
    } catch (error) {
      console.error("Erro ao excluir venda:", error);
      setPageMessage({ type: 'error', text: `Erro ao excluir venda: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsSubmittingAction(false);
      setSaleIdToDelete(null);
      setShowDeleteConfirmModal(false);
    }
  };

  const handleOpenViewModal = (sale: Sale) => {
    setSelectedSale(sale);
    setShowViewModal(true);
  };

  const handleOpenEditModal = (sale: Sale) => {
    setSelectedSale(sale);
    setEditFormData({ date: sale.date ? sale.date.split('T')[0] : '', customerId: sale.customerId });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageMessage(null);
    if (!selectedSale || !editFormData.date) {
      setPageMessage({ type: 'error', text: "Data é obrigatória para atualizar a venda." });
      return;
    }
    setIsSubmittingAction(true);
    try {
      await updateSale(selectedSale.id, {
        date: editFormData.date,
        customerId: editFormData.customerId || undefined,
      });
      setShowEditModal(false);
      setSelectedSale(null);
      setPageMessage({ type: 'success', text: 'Venda atualizada com sucesso!' });
    } catch (error) {
      console.error("Erro ao atualizar venda:", error);
      setPageMessage({ type: 'error', text: `Erro ao atualizar venda: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return (<div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"> <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div> <p className="ml-4 text-gray-700 dark:text-gray-300">Carregando vendas...</p> </div>);
  }

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Histórico de Vendas</h1>
      </div>

      {pageMessage && (
        <div className={`mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ${pageMessage.type === 'success' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
          {pageMessage.text}
        </div>
      )}

      <Card className="mb-6" transparentDarkBg={true}>
        <div className="flex flex-col md:flex-row md:items-end gap-4 p-3 md:p-4">
          <div className="w-full md:flex-grow">
            <Input type="text" placeholder="Buscar ID, Cliente, Vendedor ou Produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} icon={<Search size={18} className="text-gray-400 dark:text-gray-500" />} fullWidth />
          </div>
          <div className="w-full md:w-auto md:min-w-[220px]">
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} label="Filtrar por Data" fullWidth />
          </div>
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-700/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">Vendedor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Itens</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Pagamento(s)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale: Sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(sale.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{getCustomerName(sale.customerId)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden xl:table-cell">{getSellerName(sale.userId)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{sale.items.length}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-800 dark:text-gray-100">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300`}>
                        {getDisplayPaymentMethods(sale.payments)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenViewModal(sale)} className="p-2.5 h-10 w-10 !rounded-md dark:border-gray-600 dark:hover:bg-gray-700 flex items-center justify-center" disabled={isSubmittingAction} title="Ver Detalhes">
                          <Eye size={20} className="text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(sale)} className="p-2.5 h-10 w-10 !rounded-md dark:border-gray-600 dark:hover:bg-gray-700 flex items-center justify-center" disabled={isSubmittingAction} title="Editar Venda">
                          <Edit size={20} className="text-yellow-600 dark:text-yellow-400" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => requestDeleteSale(sale.id)} className="p-2.5 h-10 w-10 !rounded-md border-red-300 text-red-500 hover:bg-red-50 dark:border-red-500/70 dark:text-red-400 dark:hover:bg-red-500/20 flex items-center justify-center" disabled={isSubmittingAction} title="Excluir Venda">
                          <Trash2 size={20} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (<tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"><ShoppingBag size={40} className="mx-auto mb-2 text-gray-400 dark:text-gray-500" />Nenhuma venda encontrada.</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      {showViewModal && selectedSale && (<div className="fixed inset-0 z-50 overflow-y-auto"><div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"><div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black dark:bg-opacity-75 transition-opacity" onClick={() => setShowViewModal(false)}></div><span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span><div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"><div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4"><h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-gray-100 mb-4">Detalhes da Venda (ID: ...{selectedSale.id.slice(-6)})</h3><div className="space-y-3 text-sm text-gray-700 dark:text-gray-300"><p><CalendarIcon size={16} className="inline mr-2 text-gray-500 dark:text-gray-400" /><strong>Data:</strong> {formatDateTime(selectedSale.date)}</p><p><UserIconLucide size={16} className="inline mr-2 text-gray-500 dark:text-gray-400" /><strong>Cliente:</strong> {getCustomerName(selectedSale.customerId)}</p><p><UserIconLucide size={16} className="inline mr-2 text-gray-500 dark:text-gray-400" /><strong>Vendedor:</strong> {getSellerName(selectedSale.userId)}</p><p><strong className="text-gray-600 dark:text-gray-400">Total:</strong> {formatCurrency(selectedSale.total)}</p><div><strong className="text-gray-600 dark:text-gray-400">Pagamento(s):</strong><ul className="list-disc list-inside pl-4 mt-1">{selectedSale.payments.map((p, index) => (<li key={index} className="text-gray-600 dark:text-gray-300">{p.method.charAt(0).toUpperCase() + p.method.slice(1)}: {formatCurrency(p.amount)}</li>))}</ul></div><div><strong className="text-gray-600 dark:text-gray-400">Itens:</strong><ul className="list-disc list-inside pl-4 mt-1 max-h-40 overflow-y-auto text-sm space-y-1">{selectedSale.items.map(item => (<li key={item.productId} className="text-gray-600 dark:text-gray-300">{item.quantity}x {getProductName(item.productId)} ({formatCurrency(item.price)} cada)</li>))}</ul></div></div></div><div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"><Button onClick={() => setShowViewModal(false)}>Fechar</Button></div></div></div></div>)}
      {showEditModal && selectedSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black dark:bg-opacity-75 transition-opacity"
              onClick={() => {
                if (!isSubmittingAction) setShowEditModal(false);
              }}
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <form
              onSubmit={handleUpdateSale}
              className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            >
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Editar Venda (ID: ...{selectedSale.id.slice(-6)})
                </h3>
                <div className="space-y-4">
                  <Input
                    label="Data da Venda"
                    type="date"
                    name="date"
                    value={editFormData.date ? editFormData.date.split('T')[0] : ''}
                    onChange={handleEditFormChange}
                    fullWidth
                    required
                  />
                  <div>
                    <label
                      htmlFor="customerId"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Cliente (Opcional)
                    </label>
                    <select
                      id="customerId"
                      name="customerId"
                      value={editFormData.customerId || ''}
                      onChange={handleEditFormChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md shadow-sm"
                    >
                      <option value="">Nenhum cliente</option>
                      {customers.map((c: Customer) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Nota: A edição de itens, valor total ou métodos de pagamento não é suportada nesta interface simplificada.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button type="submit" disabled={isSubmittingAction} isLoading={isSubmittingAction}>
                  Salvar Alterações
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!isSubmittingAction) setShowEditModal(false);
                  }}
                  disabled={isSubmittingAction}
                  className="ml-3 mt-2 sm:mt-0"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setSaleIdToDelete(null);
        }}
        onConfirm={confirmDeleteSale}
        title="Confirmar Exclusão de Venda"
        message="Tem certeza que deseja excluir esta venda? Esta ação não poderá ser desfeita e tentará restaurar o estoque dos produtos."
        confirmButtonText="Excluir Venda"
        confirmButtonVariant="danger"
        icon={Trash2}
        isSubmitting={isSubmittingAction}
      />
    </div>
  );
};

export default SalesListPage;
