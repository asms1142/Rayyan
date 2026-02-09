'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';

import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

/* ================= TYPES ================= */
interface Product {
  product_id: number;
  product_name: string;
  product_code: string | null;
}

interface SellPrice {
  sell_price_id: number;
  product_id: number;
  product_name: string;
  product_code: string | null;
  source: string;
  retail_price: number;
  wholesale_price: number | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string; // will display local time
  created_by: string; // nickname
}

interface UserInfo {
  user_id: number;
  nickname: string;
  username?: string; // make optional
}

/* ================= COMPONENT ================= */
export default function ProductSellPrice() {
  const { permissions, authorized, loading } = usePermission('ProductSellPrice');

  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();
  const productInputRef = useRef<HTMLInputElement>(null);
  const retailInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [data, setData] = useState<SellPrice[]>([]);
  const [search, setSearch] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);

  const [productSearch, setProductSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({
    product_id: 0,
    retail_price: '',
    wholesale_price: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

  const [savedMessage, setSavedMessage] = useState(false);

  /* ================= FETCH LOGIN USER ================= */
  const fetchUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('userinfo')
        .select('user_id, nickname, username')
        .eq('auth_uid', user.id)
        .single();

      if (error) {
        console.log('Fetch UserInfo Error:', error.message);
        return;
      }

      setUserInfo(data || null);
    } catch (err) {
      console.log('Fetch UserInfo Exception:', err);
    }
  };

  /* ================= FETCH ALL USERS ================= */
  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('userinfo')
        .select('user_id, nickname, username');

      if (error) {
        console.log('Fetch All Users Error:', error.message);
        return;
      }

      setAllUsers(data || []);
    } catch (err) {
      console.log('Fetch All Users Exception:', err);
    }
  };

  /* ================= FETCH PRODUCTS ================= */
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('product_id, product_name, product_code')
        .order('product_name');

      if (error) {
        console.log('Fetch Products Error:', error.message);
        return;
      }

      setProducts(data || []);
    } catch (err) {
      console.log('Fetch Products Exception:', err);
    }
  };

  /* ================= FETCH SELL PRICES ================= */
  const fetchSellPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('product_sell_price')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Fetch Sell Prices Error:', error.message);
        return;
      }

      const mapped: SellPrice[] = (data || []).map((row: any) => {
        const product = products.find((p) => p.product_id === row.product_id);
        const user = allUsers.find((u) => u.user_id === row.created_by);

        return {
          ...row,
          product_name: product?.product_name || '-',
          product_code: product?.product_code || '-',
          created_at: row.created_at
            ? new Date(row.created_at).toLocaleString() // local time
            : '-',
          created_by: user?.nickname || '-', // show nickname
        };
      });

      setData(mapped);
    } catch (err) {
      console.log('Fetch Sell Prices Exception:', err);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchUserInfo();
      fetchAllUsers();
      fetchProducts();
    }
  }, [authorized]);

  useEffect(() => {
    if (products.length > 0 && allUsers.length > 0) fetchSellPrices();
  }, [products, allUsers]);

  /* ================= TABULATOR ================= */
  useEffect(() => {
    if (!tableRef.current || !authorized) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      reactiveData: true,
      data,
      pagination: true,
      paginationSize: 50,
      columns: [
        { title: 'SL', formatter: 'rownum', width: 70, hozAlign: 'center' },
        { title: 'Product', field: 'product_name' },
        { title: 'Code', field: 'product_code', hozAlign: 'center' },
        { title: 'Source', field: 'source', hozAlign: 'center' },
        { title: 'Retail', field: 'retail_price', hozAlign: 'right' },
        { title: 'Wholesale', field: 'wholesale_price', hozAlign: 'right' },
        { title: 'Effective From', field: 'effective_from', hozAlign: 'center' },
        {
          title: 'Created',
          hozAlign: 'left',
          formatter: (cell) => {
            const row = cell.getRow().getData() as SellPrice;
            return `<div style="white-space: pre-line; word-break: break-word;">
                      ${row.created_at}\n${row.created_by}
                    </div>`;
          },
        },
      ],
    });
  }, [data, authorized]);

  /* ================= SEARCH ================= */
  useEffect(() => {
    if (!tabulator.current) return;
    tabulator.current.clearFilter(true);

    if (search) {
      const s = search.toLowerCase();
      tabulator.current.setFilter((row: SellPrice) =>
        row.product_name.toLowerCase().includes(s) ||
        (row.product_code?.toLowerCase().includes(s) ?? false)
      );
    }
  }, [search]);

  /* ================= AUTOCOMPLETE ================= */
  const filteredProducts = products.filter((p) => {
    const s = productSearch.toLowerCase();
    return (
      p.product_name.toLowerCase().includes(s) ||
      (p.product_code?.toLowerCase().includes(s) ?? false)
    );
  });

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductSearch(`${p.product_name} (${p.product_code || '-'})`);
    setShowSuggestions(false);
    setActiveIndex(0);
    setForm({ ...form, product_id: p.product_id });

    setTimeout(() => retailInputRef.current?.focus(), 0);
  };

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredProducts.length - 1));
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectProduct(filteredProducts[activeIndex]);
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (!permissions.create) return alert('No permission to create');
    if (!form.product_id || !form.retail_price)
      return alert('Product and Retail Price required');

    try {
      const { error } = await supabase.from('product_sell_price').insert({
        org_id: 1,
        product_id: form.product_id,
        source: 'MANUAL',
        retail_price: Number(form.retail_price),
        wholesale_price: form.wholesale_price
          ? Number(form.wholesale_price)
          : null,
        effective_from: form.effective_from,
        created_by: userInfo?.user_id, // user_id
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.log('Save Error:', error.message);
        return alert(error.message);
      }

      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 1500);

      // Reset form
      setForm({
        product_id: 0,
        retail_price: '',
        wholesale_price: '',
        effective_from: new Date().toISOString().split('T')[0],
      });
      setProductSearch('');
      setSelectedProduct(null);
      productInputRef.current?.focus();

      fetchSellPrices();
    } catch (err) {
      console.log('Save Exception:', err);
    }
  };

  const handleRetailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
  };

  /* ================= RENDER ================= */
  if (loading) return <Loader message="Checking access..." />;

  if (!authorized)
    return (
      <PageWrapper title="Unauthorized">
        <div className="p-10 text-center text-red-600">Unauthorized</div>
      </PageWrapper>
    );

  return (
    <PageWrapper title="Product Sell Price">
      {permissions.create && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h3 className="font-semibold mb-3">Set Sell Price</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <FormInput
                ref={productInputRef}
                placeholder="Search product by name or code"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowSuggestions(true);
                  setActiveIndex(0);
                  setSelectedProduct(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleProductKeyDown}
              />
              {showSuggestions && productSearch && (
                <div className="absolute z-10 bg-white border w-full max-h-48 overflow-y-auto">
                  {filteredProducts.map((p, i) => (
                    <div
                      key={p.product_id}
                      className={`px-2 py-1 cursor-pointer ${
                        i === activeIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                      }`}
                      onMouseDown={() => handleSelectProduct(p)}
                    >
                      {p.product_name} ({p.product_code || '-'})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormInput placeholder="Product Name" value={selectedProduct?.product_name || ''} disabled />
            <FormInput placeholder="Product Code" value={selectedProduct?.product_code || ''} disabled />
            <FormInput
              type="date"
              value={form.effective_from}
              onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
            />
            <FormInput
              ref={retailInputRef}
              placeholder="Retail Price"
              type="number"
              value={form.retail_price}
              onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
              onKeyDown={handleRetailKeyDown}
            />
            <FormInput
              placeholder="Wholesale Price"
              type="number"
              value={form.wholesale_price}
              onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })}
            />
          </div>

          {/* Manual Save Button */}
          <div className="mt-3">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>

          {savedMessage && (
            <div className="text-green-600 font-semibold mt-2">Saved!</div>
          )}
        </div>
      )}

      <div className="mb-4">
        <FormInput
          placeholder="Search by product name or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white p-2 rounded shadow">
        <div ref={tableRef}></div>
      </div>
    </PageWrapper>
  );
}
