import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { ProductProvider } from './context/ProductContext';
import { CustomerProvider } from './context/CustomerContext';
import { SaleProvider } from './context/SaleContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { SupplierProvider } from './context/SupplierContext';
import { ThemeProvider } from './context/ThemeContext';
import { SiteSettingsProvider } from './context/SiteSettingsContext'; // NOVO IMPORT
import './i18n'; 
import './index.css';

const I18nLoading = () => (<div>Loading...</div>);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<I18nLoading />}>
      <BrowserRouter>
        <AuthProvider>
          <UserProvider>
            <ProductProvider>
              <CustomerProvider>
                <SaleProvider>
                  <ExpenseProvider>
                    <SupplierProvider>
                      <ThemeProvider>
                        <SiteSettingsProvider> {/* NOVO PROVIDER */}
                          <App />
                        </SiteSettingsProvider>
                      </ThemeProvider>
                    </SupplierProvider>
                  </ExpenseProvider>
                </SaleProvider>
              </CustomerProvider>
            </ProductProvider>
          </UserProvider>
        </AuthProvider>
      </BrowserRouter>
    </Suspense>
  </StrictMode>
);