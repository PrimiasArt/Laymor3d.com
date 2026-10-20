'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShopCategoryTab,
  IFilamentItem,
  IAccessoryItem,
  IPrintingServicePackage,
  IPrintProfileItem,
  IShopModelItem,
  ICartItem,
  IServiceQuoteRequest,
  IServiceQuoteResult,
  ModelMarketplaceCategory,
} from '@/backend/domain/shop';

export function useShop() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<ShopCategoryTab>('filaments_accessories');
  const [searchQuery, setSearchQuery] = useState('');

  // Filaments & Accessories filters
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedAccessorySub, setSelectedAccessorySub] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [filamentSubTab, setFilamentSubTab] = useState<'all' | 'filament' | 'accessory'>('all');

  // Service & Profiles filters
  const [serviceSubTab, setServiceSubTab] = useState<'services' | 'profiles'>('services');
  const [selectedSlicer, setSelectedSlicer] = useState<string>('all');

  // Model marketplace filters
  const [modelTypeFilter, setModelTypeFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedModelCategory, setSelectedModelCategory] = useState<ModelMarketplaceCategory>('all');

  // Data states
  const [filaments, setFilaments] = useState<IFilamentItem[]>([]);
  const [accessories, setAccessories] = useState<IAccessoryItem[]>([]);
  const [services, setServices] = useState<IPrintingServicePackage[]>([]);
  const [profiles, setProfiles] = useState<IPrintProfileItem[]>([]);
  const [models, setModels] = useState<IShopModelItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cart State (stored in memory & sync with localStorage if available)
  const [cartItems, setCartItems] = useState<ICartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState<boolean>(false);

  // Detail Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Fetch initial shop data
  const fetchShopData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/shop');
      const data = await res.json();
      if (res.ok) {
        if (data.filaments) setFilaments(data.filaments);
        if (data.accessories) setAccessories(data.accessories);
        if (data.services) setServices(data.services);
        if (data.profiles) setProfiles(data.profiles);
        if (data.models) setModels(data.models);
      }
    } catch (err) {
      console.error('Error loading shop data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('3dhub_cart');
      if (saved) {
        setCartItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save cart to localStorage
  const saveCart = (items: ICartItem[]) => {
    setCartItems(items);
    try {
      localStorage.setItem('3dhub_cart', JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  // Cart Actions
  const addToCart = useCallback((item: {
    id: string;
    title: string;
    priceVnd: number;
    type: 'filament' | 'accessory' | 'service' | 'profile' | 'model';
    imageUrl: string;
    subText?: string;
  }) => {
    setCartItems(prev => {
      const existsIndex = prev.findIndex(c => c.id === item.id);
      let updated: ICartItem[];
      if (existsIndex >= 0) {
        updated = prev.map((c, i) => i === existsIndex ? { ...c, quantity: c.quantity + 1 } : c);
      } else {
        updated = [...prev, { ...item, quantity: 1 }];
      }
      try {
        localStorage.setItem('3dhub_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast(`🛒 Đã thêm "${item.title.slice(0, 30)}..." vào giỏ!`);
  }, [showToast]);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => {
      const updated = prev.filter(c => c.id !== id);
      try {
        localStorage.setItem('3dhub_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCartItems(prev => {
      const updated = prev
        .map(c => {
          if (c.id === id) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as ICartItem[];

      try {
        localStorage.setItem('3dhub_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    saveCart([]);
  }, []);

  const cartTotalVnd = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.priceVnd * item.quantity, 0);
  }, [cartItems]);

  const cartItemsCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Checkout with Wallet or Direct
  const handleCheckout = useCallback(async (
    paymentMethod: 'wallet' | 'vietqr' | 'momo' | 'cod' | 'bank_transfer',
    customerInfo?: { name: string; phone: string; address: string; notes?: string }
  ) => {
    if (cartItems.length === 0) return { success: false, error: 'Giỏ hàng đang trống' };

    setIsProcessingOrder(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          items: cartItems,
          totalAmountVnd: cartTotalVnd,
          paymentMethod,
          customerInfo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đặt hàng thất bại');
      }

      clearCart();
      setIsCartOpen(false);
      setIsCheckoutModalOpen(false);
      showToast(`🎉 Đặt hàng thành công! Mã đơn: #${data.orderId}`);
      return { success: true, orderId: data.orderId, newBalanceVnd: data.newBalanceVnd };
    } catch (err: any) {
      showToast(`❌ ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setIsProcessingOrder(false);
    }
  }, [cartItems, cartTotalVnd, clearCart, showToast]);

  // Interactive Quote Calculator State
  const [quoteParams, setQuoteParams] = useState<IServiceQuoteRequest>({
    technology: 'FDM High-Speed',
    material: 'PLA Basic',
    weightGrams: 100,
    infillPercent: 15,
    color: 'Trắng Tiêu Chuẩn',
    postProcessing: 'none',
    quantity: 1,
    aiTier: 'none',
  });

  const [quoteResult, setQuoteResult] = useState<IServiceQuoteResult | null>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState<boolean>(false);

  const calculateServiceQuote = useCallback(async (overrideParams?: Partial<IServiceQuoteRequest>) => {
    const payload = { ...quoteParams, ...overrideParams };
    setIsCalculatingQuote(true);
    try {
      const res = await fetch('/api/shop/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.quote) {
        setQuoteResult(data.quote);
      }
    } catch (err) {
      console.error('Quote calc error:', err);
    } finally {
      setIsCalculatingQuote(false);
    }
  }, [quoteParams]);

  // Trigger initial calculation
  useEffect(() => {
    calculateServiceQuote();
  }, []);

  // Filtered views
  const filteredFilaments = useMemo(() => {
    let result = filaments;
    if (selectedMaterial !== 'all') {
      result = result.filter(f => f.material.toLowerCase() === selectedMaterial.toLowerCase());
    }
    if (selectedBrand !== 'all') {
      result = result.filter(f => f.brand.toLowerCase() === selectedBrand.toLowerCase());
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.brand.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    }
    return result;
  }, [filaments, selectedMaterial, selectedBrand, searchQuery]);

  const filteredAccessories = useMemo(() => {
    let result = accessories;
    if (selectedAccessorySub !== 'all') {
      result = result.filter(a => a.subCategory === selectedAccessorySub);
    }
    if (selectedBrand !== 'all') {
      result = result.filter(a => a.brand.toLowerCase() === selectedBrand.toLowerCase());
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    return result;
  }, [accessories, selectedAccessorySub, selectedBrand, searchQuery]);

  const filteredProfiles = useMemo(() => {
    let result = profiles;
    if (selectedSlicer !== 'all') {
      result = result.filter(p => p.slicer.toLowerCase() === selectedSlicer.toLowerCase());
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.printerModel.toLowerCase().includes(q));
    }
    return result;
  }, [profiles, selectedSlicer, searchQuery]);

  const filteredModels = useMemo(() => {
    let result = models;
    if (modelTypeFilter === 'free') {
      result = result.filter(m => m.isFree);
    } else if (modelTypeFilter === 'paid') {
      result = result.filter(m => !m.isFree);
    }

    if (selectedModelCategory !== 'all') {
      result = result.filter(m => m.category === selectedModelCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => m.title.toLowerCase().includes(q) || m.author.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
    }
    return result;
  }, [models, modelTypeFilter, selectedModelCategory, searchQuery]);

  return {
    // Tabs & Navigation
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,

    // Filaments & Accessories
    filamentSubTab,
    setFilamentSubTab,
    selectedMaterial,
    setSelectedMaterial,
    selectedAccessorySub,
    setSelectedAccessorySub,
    selectedBrand,
    setSelectedBrand,
    filaments: filteredFilaments,
    accessories: filteredAccessories,

    // Printing Services & Profiles
    serviceSubTab,
    setServiceSubTab,
    selectedSlicer,
    setSelectedSlicer,
    services,
    profiles: filteredProfiles,
    quoteParams,
    setQuoteParams,
    quoteResult,
    isCalculatingQuote,
    calculateServiceQuote,

    // Models Marketplace
    modelTypeFilter,
    setModelTypeFilter,
    selectedModelCategory,
    setSelectedModelCategory,
    models: filteredModels,

    // Cart
    cartItems,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotalVnd,
    cartItemsCount,

    // Checkout
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
    isProcessingOrder,
    handleCheckout,

    // Modals & Details
    selectedDetailItem,
    setSelectedDetailItem,
    toastMessage,
    showToast,
    isLoading,
  };
}
