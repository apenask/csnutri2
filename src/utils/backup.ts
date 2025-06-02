import JSZip from 'jszip';
import { saveAs } from 'file-saver';
// Se StockTransaction não for usado, pode ser removido da importação de tipos
import { SystemBackup, User, Product, Customer, Sale, Expense, Supplier, SiteSettings /*, StockTransaction*/ } from '../types'; 
import { format } from 'date-fns';

const APP_NAME = "CSNutriBackup";
const APP_VERSION = "1.0";

const LOCALSTORAGE_KEYS = {
    users: 'csNutriUsers',
    products: 'csNutriProducts',
    customers: 'csNutriCustomers',
    sales: 'csNutriSales',
    expenses: 'csNutriExpenses',
    suppliers: 'csNutriSuppliers',
    siteSettings: 'csNutriSiteSettings',
    // stockTransactions: 'csNutriStockTransactions', // Se for usar, defina a chave
};

// Define um valor padrão para SiteSettings caso não exista no localStorage
const defaultSiteSettings: SiteSettings = {
    companyName: 'CS Nutri',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
};

export const createBackup = async (): Promise<void> => {
  try {
    const backupData: SystemBackup['data'] = {
      users: JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.users) || '[]') as User[],
      products: JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.products) || '[]') as Product[],
      customers: JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.customers) || '[]') as Customer[],
      sales: JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.sales) || '[]') as Sale[],
      expenses: JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.expenses) || '[]') as Expense[],
      suppliers: JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.suppliers) || '[]') as Supplier[],
      siteSettings: JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.siteSettings) || JSON.stringify(defaultSiteSettings)) as SiteSettings,
      // CORREÇÃO: Comentado ou removido se StockTransaction não estiver em SystemBackup['data']
      // stockTransactions: JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.stockTransactions) || '[]') as StockTransaction[],
    };

    const fullBackup: SystemBackup = {
        appName: APP_NAME,
        appVersion: APP_VERSION,
        timestamp: new Date().toISOString(),
        data: backupData,
    };

    const zip = new JSZip();
    zip.file('cs_nutri_backup_data.json', JSON.stringify(fullBackup, null, 2));
    
    const content = await zip.generateAsync({ type: 'blob' });
    
    const dateString = format(new Date(), 'dd-MM-yyyy_HH-mm-ss'); // Adicionado hora para nomes únicos
    saveAs(content, `backup_csnutri_${dateString}.zip`);

  } catch (error) {
    console.error('Erro ao criar backup:', error);
    throw new Error('Falha ao criar o backup. Verifique o console para mais detalhes.');
  }
};

export const restoreBackup = async (file: File): Promise<SystemBackup['data']> => {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const backupFile = zipContent.file('cs_nutri_backup_data.json'); 
    
    if (!backupFile) {
      throw new Error('Arquivo de backup inválido ou arquivo de dados não encontrado dentro do ZIP.');
    }
    
    const backupJsonString = await backupFile.async('string');
    const fullBackupData = JSON.parse(backupJsonString) as SystemBackup;

    if (!validateBackup(fullBackupData)) {
        throw new Error('O conteúdo do arquivo de backup não é válido, está corrompido ou não é do CS Nutri.');
    }
    
    localStorage.setItem(LOCALSTORAGE_KEYS.users, JSON.stringify(fullBackupData.data.users || []));
    localStorage.setItem(LOCALSTORAGE_KEYS.products, JSON.stringify(fullBackupData.data.products || []));
    localStorage.setItem(LOCALSTORAGE_KEYS.customers, JSON.stringify(fullBackupData.data.customers || []));
    localStorage.setItem(LOCALSTORAGE_KEYS.sales, JSON.stringify(fullBackupData.data.sales || []));
    localStorage.setItem(LOCALSTORAGE_KEYS.expenses, JSON.stringify(fullBackupData.data.expenses || []));
    localStorage.setItem(LOCALSTORAGE_KEYS.suppliers, JSON.stringify(fullBackupData.data.suppliers || []));
    localStorage.setItem(LOCALSTORAGE_KEYS.siteSettings, JSON.stringify(fullBackupData.data.siteSettings || defaultSiteSettings));
    // CORREÇÃO: Comentado ou removido se StockTransaction não estiver em SystemBackup['data']
    // if (fullBackupData.data.stockTransactions) { // Verifica se existe no backup antes de tentar salvar
    //   localStorage.setItem(LOCALSTORAGE_KEYS.stockTransactions, JSON.stringify(fullBackupData.data.stockTransactions));
    // } else {
    //   localStorage.setItem(LOCALSTORAGE_KEYS.stockTransactions, JSON.stringify([])); // Ou limpa se não vier no backup
    // }


    return fullBackupData.data;
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    throw new Error(`Falha ao restaurar o backup: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const validateBackup = (parsedData: any): parsedData is SystemBackup => {
  if (typeof parsedData !== 'object' || parsedData === null) {
    console.error("Validação falhou: Backup não é um objeto.");
    return false;
  }
  if (parsedData.appName !== APP_NAME) {
      console.warn("Aviso de Validação: O backup parece ser de uma aplicação diferente ou o nome não corresponde.");
  }

  const data = parsedData.data;
  const isValid = (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.users) &&
    Array.isArray(data.products) &&
    Array.isArray(data.customers) &&
    Array.isArray(data.sales) &&
    Array.isArray(data.expenses) &&
    Array.isArray(data.suppliers) &&
    (typeof data.siteSettings === 'object' || data.siteSettings === undefined || data.siteSettings === null)
    // CORREÇÃO: Comentado ou removido se StockTransaction não estiver em SystemBackup['data']
    // && (Array.isArray(data.stockTransactions) || data.stockTransactions === undefined) 
  );
  if (!isValid) {
      console.error("Validação falhou: Estrutura de dados interna do backup inválida.");
  }
  return isValid;
};