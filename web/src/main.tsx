import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/lexend/400.css';
import '@fontsource/lexend/600.css';
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';
import './styles/global.css';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { PreferencesProvider } from './preferences/PreferencesContext';
import { ToastProvider } from './components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      // Não insiste em erros de cliente (401/403/404/422): só repete falhas de rede/servidor.
      retry: (count, error) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        return (status === undefined || status >= 500) && count < 2;
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
