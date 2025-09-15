import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ApiProvider = "openai"; // | "anthropic" | "gemini";

export interface ApiKey {
  provider: ApiProvider;
  key: string;
  name?: string;
  createdAt: string;
}

export interface ApiKeyStore {
  apiKeys: ApiKey[];
  selectedApiKey: string | null; // provider name of selected key
  addApiKey: (provider: ApiProvider, key: string, name?: string) => void;
  removeApiKey: (provider: ApiProvider) => void;
  getApiKey: (provider: ApiProvider) => ApiKey | undefined;
  hasApiKey: (provider: ApiProvider) => boolean;
  setSelectedApiKey: (provider: ApiProvider | null) => void;
  getSelectedApiKey: () => ApiKey | undefined;
}

export const useApiKeyStore = create<ApiKeyStore>()(
  persist(
    (set, get) => ({
      apiKeys: [],
      selectedApiKey: null,
      
      addApiKey: (provider: ApiProvider, key: string, name?: string) => {
        set((state) => {
          const filtered = state.apiKeys.filter(k => k.provider !== provider);
          const newApiKeys = [
            ...filtered,
            {
              provider,
              key,
              name,
              createdAt: new Date().toISOString(),
            },
          ];
          
          // Auto-select first key if none selected
          const newSelectedKey = state.selectedApiKey || provider;
          
          return {
            apiKeys: newApiKeys,
            selectedApiKey: newSelectedKey,
          };
        });
      },

      removeApiKey: (provider: ApiProvider) => {
        set((state) => {
          const newApiKeys = state.apiKeys.filter(k => k.provider !== provider);
          const newSelectedKey = state.selectedApiKey === provider ? null : state.selectedApiKey;
          return {
            apiKeys: newApiKeys,
            selectedApiKey: newSelectedKey,
          };
        });
      },

      getApiKey: (provider: ApiProvider) => {
        return get().apiKeys.find(k => k.provider === provider);
      },

      hasApiKey: (provider: ApiProvider) => {
        return get().apiKeys.some(k => k.provider === provider);
      },

      setSelectedApiKey: (provider: ApiProvider | null) => {
        set({ selectedApiKey: provider });
      },

      getSelectedApiKey: () => {
        const state = get();
        if (!state.selectedApiKey) return undefined;
        return state.apiKeys.find(k => k.provider === state.selectedApiKey);
      },
    }),
    {
      name: "api-keys-storage",
      partialize: (state) => ({ 
        apiKeys: state.apiKeys,
        selectedApiKey: state.selectedApiKey 
      }),
    }
  )
);
