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
interface FavoriteItem {
  href: string;
  label: string;
  iconName?: string;
}

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  activeBranch: string | null;
  favoriteLinks: FavoriteItem[];
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setDarkMode: (mode: boolean) => void;
  toggleDarkMode: () => void;
  setActiveBranch: (branchId: string | null) => void;
  toggleFavorite: (item: { href: string; label: string; iconName?: string }) => void;
  isFavorite: (href: string) => boolean;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      darkMode: false,
      activeBranch: null,
      favoriteLinks: [],

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setDarkMode: (mode) => set({ darkMode: mode }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setActiveBranch: (branchId) => set({ activeBranch: branchId }),
      toggleFavorite: (item) => {
        const exists = get().favoriteLinks.some(f => f.href === item.href);
        if (exists) {
          set({ favoriteLinks: get().favoriteLinks.filter(f => f.href !== item.href) });
        } else {
          set({ favoriteLinks: [...get().favoriteLinks, item] });
        }
      },
      isFavorite: (href) => get().favoriteLinks.some(f => f.href === href),
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
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  read: boolean;
  category?: 'sale' | 'inventory' | 'customer' | 'supplier' | 'license' | 'system';
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      
      addNotification: (notification) => {
        const id = Math.random().toString(36).substr(2, 9);
        set((state) => ({
          notifications: [
            { ...notification, id, timestamp: Date.now(), read: false },
            ...state.notifications
          ].slice(0, 50),
        }));
      },
      
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },
      
      clearAll: () => {
        set({ notifications: [] });
      },
      
      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'pos-notifications',
    }
  )
);

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

// Shift Store for managing shift state in POS
export interface ShiftInfo {
  _id: string;
  shiftId: string;
  register: string;
  registerNumber: string;
  openingFloat: number;
  startTime: string;
  expectedCash: number;
  actualCash: number;
  variance: number;
}

interface ShiftState {
  activeShift: ShiftInfo | null;
  loading: boolean;
  fetchActiveShift: () => Promise<void>;
  openShift: (registerId: string, openingFloat: number) => Promise<boolean>;
  closeShift: (actualCash: number, notes?: string) => Promise<boolean>;
  clearShift: () => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      activeShift: null,
      loading: false,

      fetchActiveShift: async () => {
        set({ loading: true });
        try {
          const res = await fetch('/api/shifts/active');
          const json = await res.json();
          if (json.success && json.shift) {
            set({ activeShift: json.shift });
          } else {
            set({ activeShift: null });
          }
        } catch (err) {
          console.error('Failed to fetch active shift:', err);
          set({ activeShift: null });
        } finally {
          set({ loading: false });
        }
      },

      openShift: async (registerId, openingFloat) => {
        try {
          const res = await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registerId, openingFloat }),
          });
          const json = await res.json();
          if (json.success) {
            set({ activeShift: json.shift });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to open shift:', err);
          return false;
        }
      },

      closeShift: async (actualCash, notes = '') => {
        const { activeShift } = get();
        if (!activeShift) return false;

        try {
          const res = await fetch(`/api/shifts/${activeShift._id}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actualCash, notes }),
          });
          const json = await res.json();
          if (json.success) {
            set({ activeShift: null });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to close shift:', err);
          return false;
        }
      },

      clearShift: () => set({ activeShift: null }),
    }),
    {
      name: 'pos-shift',
    }
  )
);
