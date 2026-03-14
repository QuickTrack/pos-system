import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  variant?: {
    name: string;
    value: string;
  };
  // Unit information for multi-unit products
  unitName?: string;
  unitAbbreviation?: string;
  conversionToBase?: number;
  total: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: string;
  branchName?: string;
}

interface CartState {
  items: CartItem[];
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateDiscount: (productId: string, discount: number, discountType?: 'percentage' | 'fixed') => void;
  setCustomer: (customer?: { id: string; name: string; phone: string }) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: undefined,

      addItem: (item) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && 
          JSON.stringify(i.variant) === JSON.stringify(item.variant) &&
          i.unitName === item.unitName
        );

        if (existingIndex >= 0) {
          const newItems = [...items];
          newItems[existingIndex].quantity += item.quantity;
          newItems[existingIndex].total = 
            newItems[existingIndex].quantity * newItems[existingIndex].unitPrice - 
            newItems[existingIndex].discount;
          set({ items: newItems });
        } else {
          set({ items: [...items, item] });
        }
      },

      updateQuantity: (productId, quantity) => {
        const items = get().items.map((item) => {
          if (item.productId === productId) {
            return {
              ...item,
              quantity,
              total: quantity * item.unitPrice - item.discount,
            };
          }
          return item;
        });
        set({ items });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.productId !== productId) });
      },

      updateDiscount: (productId, discount, discountType = 'fixed') => {
        const items = get().items.map((item) => {
          if (item.productId === productId) {
            const discountAmount = discountType === 'percentage' 
              ? (item.unitPrice * item.quantity * discount) / 100 
              : discount;
            return {
              ...item,
              discount: discountAmount,
              discountType,
              total: item.unitPrice * item.quantity - discountAmount,
            };
          }
          return item;
        });
        set({ items });
      },

      setCustomer: (customer) => set({ customer }),

      clearCart: () => set({ items: [], customer: undefined }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      },

      getTotalDiscount: () => {
        return get().items.reduce((sum, item) => sum + item.discount, 0);
      },
    }),
    {
      name: 'pos-cart',
    }
  )
);

// UI Store for managing UI state
interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  activeBranch: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setDarkMode: (mode: boolean) => void;
  toggleDarkMode: () => void;
  setActiveBranch: (branchId: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: false,
      activeBranch: null,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setDarkMode: (mode) => set({ darkMode: mode }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setActiveBranch: (branchId) => set({ activeBranch: branchId }),
    }),
    {
      name: 'pos-ui',
    }
  )
);

// Auth Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'pos-auth',
    }
  )
);

// Notification Store
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  
  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },
  
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));

// Held Sales Store for Hold/Recall functionality
export interface HeldSale {
  id: string;
  items: CartItem[];
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: number;
  note?: string;
}

interface HeldSalesState {
  heldSales: HeldSale[];
  holdSale: (items: CartItem[], customer?: HeldSale['customer'], note?: string) => void;
  recallSale: (id: string) => HeldSale | null;
  removeHeldSale: (id: string) => void;
  clearAllHeldSales: () => void;
}

export const useHeldSalesStore = create<HeldSalesState>()(
  persist(
    (set, get) => ({
      heldSales: [],

      holdSale: (items, customer, note) => {
        const id = `HOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newHeldSale: HeldSale = {
          id,
          items: [...items],
          customer,
          createdAt: Date.now(),
          note,
        };
        set((state) => ({
          heldSales: [newHeldSale, ...state.heldSales],
        }));
      },

      recallSale: (id) => {
        const heldSale = get().heldSales.find((s) => s.id === id);
        return heldSale || null;
      },

      removeHeldSale: (id) => {
        set((state) => ({
          heldSales: state.heldSales.filter((s) => s.id !== id),
        }));
      },

      clearAllHeldSales: () => set({ heldSales: [] }),
    }),
    {
      name: 'pos-held-sales',
    }
  )
);
