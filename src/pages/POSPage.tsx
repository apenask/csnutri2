import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, DollarSign as IconDollar, Search } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Product, Customer, SaleItem, Sale, PaymentDetail } from '../types';
import { useAuth } from '../context/useAuth';
import { useCustomers } from '../context/CustomerContext';
import { useSales } from '../context/useSales';
import { useProducts } from '../context/useProducts';

const POSPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { customers: customersFromContext, isLoading: isLoadingCustomers, updateCustomer, getCustomerById } = useCustomers();
  const { addSale } = useSales();
  const { products: productsFromContext, updateProduct: updateProductStock, isLoading: isLoadingProducts } = useProducts();

  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDisplayProducts, setFilteredDisplayProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'debit' | 'pix'>('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  const categories = useMemo(() => {
    if (isLoadingProducts) return ['all'];
    const validCategories = productsFromContext
        .map(product => product.customCategory || product.category)
        .filter(category => category && category.trim() !== '');
    return ['all', ...new Set(validCategories)];
  }, [productsFromContext, isLoadingProducts]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

  useEffect(() => {
    if (isLoadingProducts) {
      setFilteredDisplayProducts([]);
      return;
    }
    let filtered = productsFromContext;
    if (searchTerm) {
      filtered = filtered.filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => (product.customCategory || product.category) === selectedCategory);
    }
    setFilteredDisplayProducts(filtered);
  }, [searchTerm, selectedCategory, productsFromContext, isLoadingProducts]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    const currentQuantityInCart = existingItem?.quantity || 0;

    if ((product.stock || 0) <= currentQuantityInCart) {
      alert(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock ? product.stock - currentQuantityInCart : 0}`);
      return;
    }
    if (existingItem) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price } : item));
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, price: product.price, subtotal: product.price }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    const productDetails = productsFromContext.find(p => p.id === productId);

    if (productDetails && newQuantity > (productDetails.stock || 0)) {
      alert(`Estoque insuficiente. Máximo de ${productDetails.stock} unidades para ${productDetails.name}.`);
      setCart(cart.map(item => item.productId === productId ? { ...item, quantity: productDetails.stock || 0, subtotal: (productDetails.stock || 0) * item.price } : item));
      return;
    }
    
    setCart(cart.map(item => item.productId === productId ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price } : item));
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      alert("O carrinho está vazio.");
      return;
    }
    if (paymentMethod === 'cash' && (parseFloat(amountPaid) < total || isNaN(parseFloat(amountPaid)))) {
      alert("Valor recebido insuficiente ou não informado.");
      return;
    }
    setIsSubmittingSale(true);
    
    const salePayments: PaymentDetail[] = [{ method: paymentMethod, amount: total }];

    const saleDataToSave: Omit<Sale, 'id'> = {
      date: new Date().toISOString(),
      items: cart,
      total: total,
      payments: salePayments,
      customerId: selectedCustomer ? selectedCustomer.id : undefined,
      userId: currentUser?.id || 'system',
      pointsEarned: total > 0 ? Math.floor(total / 10) : undefined,
    };
    
    try {
      const savedSale = await addSale(saleDataToSave);
      console.log('Venda salva:', savedSale);

      for (const item of cart) {
        const productInContext = productsFromContext.find(p => p.id === item.productId);
        if (productInContext) {
          const newStock = (productInContext.stock || 0) - item.quantity;
          await updateProductStock(item.productId, { stock: newStock });
        }
      }

      if (selectedCustomer && selectedCustomer.id) {
        const currentCustomerData = getCustomerById(selectedCustomer.id); 
        if (currentCustomerData) {
          const updatedCustomerData: Partial<Customer> = {
            totalPurchases: (currentCustomerData.totalPurchases || 0) + 1,
            totalSpent: (currentCustomerData.totalSpent || 0) + savedSale.total,
            points: (currentCustomerData.points || 0) + (savedSale.pointsEarned || 0),
          };
          await updateCustomer(selectedCustomer.id, updatedCustomerData);
          console.log('Dados do cliente atualizados:', updatedCustomerData);
        }
      }

      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod('cash');
      setAmountPaid('');
      setChange(0);
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);

    } catch (error) {
      console.error("Erro ao processar venda:", error);
      alert(`Ocorreu um erro ao processar a venda: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  if (isLoadingProducts || isLoadingCustomers) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            <p className="ml-4 text-gray-700 dark:text-gray-300">Carregando dados...</p>
        </div>
    );
  }
  
  return (
    <div className="h-full"> 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-full">
        <div className="lg:col-span-2 flex flex-col h-full p-4 md:p-6 pt-0 md:pt-0 lg:pr-3"> 
          <Card className="mb-4 md:mb-6" transparentDarkBg={true}>
            <div className="flex flex-col md:flex-row md:items-center gap-4 p-1">
              <div className="flex-grow">
                <Input 
                  type="text" 
                  placeholder="Buscar produtos..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full"
                  icon={<Search size={18} className="text-gray-400 dark:text-gray-500" />}
                />
              </div>
              <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 mt-2 md:mt-0">
                {categories.map(category => (
                  <Button
                    key={category} 
                    onClick={() => setSelectedCategory(category)}
                    variant={selectedCategory === category ? 'primary' : 'outline'}
                    size="sm"
                    className={`whitespace-nowrap ${selectedCategory !== category ? 'dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700' : '' }`}
                  >
                    {category === 'all' ? 'Todos' : category}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="flex-grow overflow-auto" noPadding>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 p-3 md:gap-4 md:p-4">
              {filteredDisplayProducts.map(product => (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg dark:hover:border-gray-600/70 transition-all duration-150 cursor-pointer flex flex-col group"
                  onClick={() => addToCart(product)}
                >
                  <div className="h-28 sm:h-32 bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-200 ease-in-out">
                    {product.imageUrl ? 
                      <img src={product.imageUrl} alt={product.name} className="max-h-full max-w-full object-contain"/> : 
                      <ShoppingCart size={36} className="text-gray-300 dark:text-gray-500" />
                    }
                  </div>
                  <div className="p-3 flex flex-col flex-grow">
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-100 line-clamp-2 h-10 flex-grow group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{product.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <p className="font-bold text-red-700 dark:text-red-400 text-sm sm:text-base">{formatCurrency(product.price)}</p>
                      <span 
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          (product.stock || 0) > (product.minStock || 0)
                            ? 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300' 
                            : (product.stock || 0) > 0
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/40 dark:text-yellow-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-800/40 dark:text-red-300'
                        }`}
                      >
                        Est: {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredDisplayProducts.length === 0 && !isLoadingProducts && (
                <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">Nenhum produto encontrado.</div>
              )}
               {isLoadingProducts && (
                <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">Carregando produtos...</div>
              )}
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-1 h-full bg-white dark:bg-gray-800 shadow-lg lg:rounded-l-lg">
          <Card className="h-full flex flex-col !shadow-none !rounded-none lg:!rounded-l-lg" noPadding>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Carrinho</h2>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300">
                    Limpar
                  </button>
                )}
              </div>
              <select
                className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm py-2 px-3"
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customer = customersFromContext.find(c => c.id === e.target.value);
                  setSelectedCustomer(customer || null);
                }}
                disabled={isLoadingCustomers}
              >
                <option value="">{isLoadingCustomers ? "Carregando..." : "Selecionar cliente (opcional)"}</option>
                {!isLoadingCustomers && customersFromContext.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-1">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 py-10">
                  <ShoppingCart size={40} className="mb-3 text-gray-400 dark:text-gray-500" />
                  <p className="font-medium">Carrinho vazio</p>
                  <p className="text-sm">Adicione produtos clicando neles.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cart.map((item) => {
                    const product = productsFromContext.find(p => p.id === item.productId); 
                    if (!product) return null; 
                    return ( 
                      <li key={item.productId} className="py-3">
                        <div className="flex justify-between items-center">
                          <div className="flex-grow mr-2">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate" title={product.name}>{product.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(item.price)} x {item.quantity}</p>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 text-right">{formatCurrency(item.subtotal)}</p>
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="p-1.5 h-8 w-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                aria-label="Diminuir quantidade"
                              >
                                <Minus size={18} />
                              </button>
                              <span className="mx-1.5 text-base w-7 text-center font-medium text-gray-700 dark:text-gray-200">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="p-1.5 h-8 w-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                aria-label="Aumentar quantidade"
                              >
                                <Plus size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.productId)}
                                className="ml-2 p-1.5 h-8 w-8 flex items-center justify-center rounded-md border border-transparent text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                aria-label="Remover item"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-base font-medium text-gray-800 dark:text-gray-100 mb-4">
                <p>Total</p>
                <p>{formatCurrency(total)}</p>
              </div>
              <Button 
                fullWidth 
                size="lg" 
                disabled={cart.length === 0 || isSubmittingSale} 
                onClick={() => setShowPaymentModal(true)} 
                isLoading={isSubmittingSale}
              >
                Finalizar Venda
              </Button>
            </div>
          </Card>
        </div>
      </div>
      
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Pagamento</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Método de pagamento</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['cash', 'credit', 'debit', 'pix'] as const).map((method) => (
                      <Button 
                          key={method}
                          variant={paymentMethod === method ? 'primary' : 'outline'} 
                          onClick={() => setPaymentMethod(method)}
                          className="w-full text-xs sm:text-sm"
                      >
                          {method === 'cash' && <Banknote size={16} className="mr-1 sm:mr-2" />}
                          {(method === 'credit' || method === 'debit') && <CreditCard size={16} className="mr-1 sm:mr-2" />}
                          {method === 'pix' && <IconDollar size={16} className="mr-1 sm:mr-2" />}
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Button>
                  ))}
                </div>
              </div>
              {paymentMethod === 'cash' && (
                <div className="mb-6">
                  <Input
                    label="Valor recebido"
                    id="amount-paid" 
                    type="number" 
                    min="0"
                    step="0.01" 
                    value={amountPaid}
                    onChange={e => {
                      setAmountPaid(e.target.value);
                      const paid = parseFloat(e.target.value);
                      setChange(isNaN(paid) ? 0 : paid - total); 
                    }}
                    placeholder="Digite o valor recebido"
                    fullWidth
                  />
                  {!isNaN(parseFloat(amountPaid)) && parseFloat(amountPaid) > 0 && (
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 text-right">
                      Troco: <span className={`font-medium ${change < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex justify-between font-semibold text-lg text-gray-800 dark:text-gray-100 mb-4">
                    <p>Total a Pagar:</p>
                    <p className="text-red-600 dark:text-red-400">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 sm:flex sm:flex-row-reverse rounded-b-lg">
              <Button 
                  onClick={handlePayment} 
                  disabled={isSubmittingSale || (paymentMethod === 'cash' && (parseFloat(amountPaid) < total || isNaN(parseFloat(amountPaid)))) || cart.length === 0} 
                  isLoading={isSubmittingSale}
                  className="w-full sm:w-auto sm:ml-3"
              >
                  Confirmar Pagamento
              </Button>
              <Button 
                  variant="outline" 
                  onClick={() => {if(!isSubmittingSale) setShowPaymentModal(false)}} 
                  disabled={isSubmittingSale} 
                  className="w-full sm:w-auto mt-3 sm:mt-0"
              >
                  Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-500/20 mb-4">
              <svg className="w-12 h-12 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Venda realizada com sucesso!</h3>
            <p className="text-gray-600 dark:text-gray-300">A venda foi registrada e o estoque atualizado.</p>
             <Button onClick={() => setShowSuccessModal(false)} className="mt-6 w-full">Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSPage;
