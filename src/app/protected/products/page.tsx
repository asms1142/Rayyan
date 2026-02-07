'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { useRouter } from 'next/navigation';

import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

interface Product {
  product_id: number;
  product_name: string;
  product_code: string | null;
  product_type_id: number;
  category_id: number;
  product_group_id?: number | null;
  brand_id?: number | null;
  base_uom_id: number;
  created_at: string;
  created_by?: number | null;
  // display fields
  product_type_name: string;
  category_name: string;
  group_name?: string | null;
  brand_name?: string | null;
  uom_name: string;
  created_by_name?: string | null;
}

export default function ProductsPage() {
  const router = useRouter();
  const { permissions, authorized, loading: permissionLoading } = usePermission('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  /** ================= Fetch Products ================= */
  const fetchProducts = async () => {
    try {
      setLoadingData(true);

      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (prodErr) throw prodErr;
      if (!prodData) {
        setProducts([]);
        return;
      }

      // Fetch related tables
      const [
        { data: types },
        { data: categories },
        { data: groups },
        { data: brands },
        { data: uoms },
        { data: users },
      ] = await Promise.all([
        supabase.from('product_types').select('*').eq('is_active', true),
        supabase.from('product_categories').select('*').eq('is_active', true),
        supabase.from('product_groups').select('*').eq('is_active', true),
        supabase.from('brands').select('*').eq('is_active', true),
        supabase.from('uom').select('*').eq('is_active', true),
        supabase.from('userinfo').select('*'),
      ]);

      // Map display fields
      const mapped: Product[] = prodData.map((p: any) => ({
        ...p,
        product_type_name: types?.find((t: any) => t.product_type_id === p.product_type_id)?.product_type_name || '-',
        category_name: categories?.find((c: any) => c.category_id === p.category_id)?.category_name || '-',
        group_name: groups?.find((g: any) => g.product_group_id === p.product_group_id)?.group_name || '-',
        brand_name: brands?.find((b: any) => b.brand_id === p.brand_id)?.brand_name || '-',
        uom_name: uoms?.find((u: any) => u.uom_id === p.base_uom_id)?.uom_name || '-',
        created_by_name: users?.find((u: any) => u.user_id === p.created_by)?.fullname || '-',
      }));

      setProducts(mapped);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setProducts([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (authorized) fetchProducts();
  }, [authorized]);

  /** ================= Tabulator ================= */
  useEffect(() => {
    if (!tableRef.current || !authorized) return;
    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '600px',
      layout: 'fitColumns',
      reactiveData: true,
      data: products,
      pagination: true,
      paginationSize: 50,
      columns: [
        { title: 'SL', formatter: 'rownum', width: 70, hozAlign: 'center' },
        { title: 'Product Name', field: 'product_name', hozAlign: 'left' },
        { title: 'Code', field: 'product_code', hozAlign: 'center' },
        { title: 'Type', field: 'product_type_name', hozAlign: 'left' },
        { title: 'Category', field: 'category_name', hozAlign: 'left' },
        { title: 'Group', field: 'group_name', hozAlign: 'left' },
        { title: 'Brand', field: 'brand_name', hozAlign: 'left' },
        { title: 'UOM', field: 'uom_name', hozAlign: 'left' },
        {
          title: 'Added At / By',
          field: 'created_at',
          formatter: (cell) => {
            const row = cell.getData() as Product;
            const dt = new Date(row.created_at).toLocaleString();
            return `${dt}\nBy: ${row.created_by_name || '-'}`;
          },
        },
        {
          title: 'Actions',
          hozAlign: 'center',
          formatter: (cell) => {
            const container = document.createElement('div');
            container.className = 'flex flex-wrap justify-center gap-2';
            const rowData = cell.getRow().getData() as Product;

            if (permissions.edit) {
              const editBtn = document.createElement('button');
              editBtn.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600';
              editBtn.textContent = 'Edit';
              editBtn.onclick = () =>
                router.push(`/protected/products/create?id=${rowData.product_id}`);
              container.appendChild(editBtn);
            }

            if (permissions.delete) {
              const delBtn = document.createElement('button');
              delBtn.className = 'bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600';
              delBtn.textContent = 'Delete';
              delBtn.onclick = async () => {
                if (!confirm('Are you sure to delete this product?')) return;
                const { error } = await supabase
                  .from('products')
                  .delete()
                  .eq('product_id', rowData.product_id);
                if (error) return alert(error.message);
                cell.getRow().delete();
              };
              container.appendChild(delBtn);
            }

            return container;
          },
        },
      ],
      rowFormatter: (row) => {
        row.getElement().classList.add('hover:bg-gray-100', 'transition', 'cursor-pointer');
      },
    });
  }, [products, permissions, authorized]);

  /** ================= Search ================= */
  useEffect(() => {
    if (!tabulator.current) return;

    tabulator.current.clearFilter(true);

    if (search) {
      tabulator.current.setFilter((data) => {
        const s = search.toLowerCase();
        return (
          (data.product_name?.toString().toLowerCase().includes(s) ?? false) ||
          (data.product_code?.toString().toLowerCase().includes(s) ?? false) ||
          (data.product_type_name?.toString().toLowerCase().includes(s) ?? false) ||
          (data.category_name?.toString().toLowerCase().includes(s) ?? false) ||
          (data.group_name?.toString().toLowerCase().includes(s) ?? false) ||
          (data.brand_name?.toString().toLowerCase().includes(s) ?? false)
        );
      });
    }
  }, [search]);

  /** ================= Export to Excel ================= */
  const handleExport = async () => {
    if (!tabulator.current) return;

    // Safe dynamic import for Next.js SSR
    const xlsxModule = await import('xlsx');
    const XLSX = xlsxModule.default ?? xlsxModule;

    const tableData = tabulator.current.getData();
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products.xlsx');
  };

  /** ================= Render ================= */
  if (permissionLoading || loadingData) return <Loader message="Loading products..." />;
  if (!authorized)
    return (
      <div className="text-center text-red-600 p-10 font-semibold">Unauthorized</div>
    );

  return (
    <PageWrapper title="Product Management">
      {/* Search & Add */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <FormInput
          placeholder="Search by Name, Code, Type, Category, Group, Brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {permissions.create && (
          <button
            className="bg-green-600 text-white px-4 py-1 rounded"
            onClick={() => router.push('/protected/products/create')}
          >
            + Add New Product
          </button>
        )}
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded"
          onClick={handleExport}
        >
          Export to Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow p-2 overflow-x-auto">
        <div ref={tableRef}></div>
      </div>
    </PageWrapper>
  );
}
