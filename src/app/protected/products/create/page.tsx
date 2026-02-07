'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';
import AddMasterModal from '@/components/modals/AddMasterModal';

interface ProductFormData {
  product_name: string;
  product_code: string;
  product_type_id: string;
  category_id: string;
  product_group_id?: string;
  brand_id?: string;
  base_uom_id: string;
  is_active: boolean;
  default_description: string;
  optional_description: string;
}

interface DropdownOption {
  [key: string]: any;
}

export default function ProductFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id'); // If editing, ?id=123

  const { permissions, authorized, loading: permLoading } = usePermission('products/create');

  const [orgId, setOrgId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const [autoCode, setAutoCode] = useState(true);
  const [codeError, setCodeError] = useState('');

  const [form, setForm] = useState<ProductFormData>({
    product_name: '',
    product_code: '',
    product_type_id: '',
    category_id: '',
    product_group_id: '',
    brand_id: '',
    base_uom_id: '',
    is_active: true,
    default_description: '',
    optional_description: '',
  });

  const [productTypes, setProductTypes] = useState<DropdownOption[]>([]);
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [productGroups, setProductGroups] = useState<DropdownOption[]>([]);
  const [brands, setBrands] = useState<DropdownOption[]>([]);
  const [uoms, setUoms] = useState<DropdownOption[]>([]);
  const [addType, setAddType] = useState<'category' | 'product_group' | 'brand' | null>(null);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/public/auth/login');

      const { data: user } = await supabase
        .from('userinfo')
        .select('org_id, user_id')
        .eq('auth_uid', data.session.user.id)
        .single();

      if (!user) return router.replace('/public/auth/login');

      setOrgId(user.org_id);
      setUserId(user.user_id);
      setAuthChecked(true);
    })();
  }, [router]);

  /* ---------------- LOAD MASTER DATA ---------------- */
  const loadMasters = async () => {
    if (!orgId) return;

    const [
      { data: types },
      { data: cats },
      { data: groups },
      { data: brandData },
      { data: uomData },
    ] = await Promise.all([
      supabase.from('product_types').select('*').eq('is_active', true),
      supabase.from('product_categories').select('*').eq('is_active', true),
      supabase.from('product_groups').select('*').eq('org_id', orgId).eq('is_active', true),
      supabase.from('brands').select('*').eq('org_id', orgId).eq('is_active', true),
      supabase.from('uom').select('*').eq('is_active', true),
    ]);

    const parentIds = new Set((cats || []).map(c => c.parent_category_id).filter(Boolean));
    const leafCategories = (cats || []).filter(c => !parentIds.has(c.category_id));

    setProductTypes(types || []);
    setCategories(leafCategories);
    setProductGroups(groups || []);
    setBrands(brandData || []);
    setUoms(uomData || []);
  };

  useEffect(() => {
    if (orgId) loadMasters();
  }, [orgId]);

  /* ---------------- LOAD EDIT DATA ---------------- */
  useEffect(() => {
    if (!editId || !orgId) return;

    const loadProduct = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('org_id', orgId)
        .eq('product_id', editId)
        .single();

      if (error || !data) return alert('Failed to load product for editing');

      setForm({
        product_name: data.product_name,
        product_code: data.product_code,
        product_type_id: data.product_type_id.toString(),
        category_id: data.category_id.toString(),
        product_group_id: data.product_group_id?.toString() || '',
        brand_id: data.brand_id?.toString() || '',
        base_uom_id: data.base_uom_id.toString(),
        is_active: data.is_active,
        default_description: data.default_description || '',
        optional_description: data.optional_description || '',
      });

      setAutoCode(false);
    };

    loadProduct();
  }, [editId, orgId]);

  /* ---------------- PRODUCT CODE ---------------- */
  const generateAutoCode = async () => {
    if (!orgId) return '1';

    const { data: lastProduct } = await supabase
      .from('products')
      .select('product_code')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastCode = lastProduct?.product_code ? parseInt(lastProduct.product_code, 10) : 0;
    return (lastCode + 1).toString();
  };

  const checkProductCode = async (code: string) => {
    if (!code) return;

    const { data } = await supabase
      .from('products')
      .select('product_id')
      .eq('product_code', code)
      .maybeSingle();

    setCodeError(data ? 'Product code already exists' : '');
  };

  /* ---------------- SAVE / UPDATE ---------------- */
  const handleSubmit = async () => {
    if (!editId && !permissions.create) return alert('No permission to create');
    if (editId && !permissions.edit) return alert('No permission to edit');

    if (!form.product_name.trim()) return alert('Product name required');

    setSaving(true);

    let product_code = form.product_code;

    if (autoCode) {
      product_code = await generateAutoCode();
      await checkProductCode(product_code);
      if (codeError) {
        setSaving(false);
        return alert('Auto-generated product code already exists. Try again.');
      }
    } else if (codeError) {
      setSaving(false);
      return alert(codeError);
    }

    if (editId) {
      // UPDATE
      const { error } = await supabase
        .from('products')
        .update({ ...form, product_code })
        .eq('product_id', editId);

      setSaving(false);
      if (error) return alert(error.message);
      router.push('/protected/products');
    } else {
      // CREATE
      const { error } = await supabase
        .from('products')
        .insert([{ ...form, product_code, org_id: orgId, created_by: userId }]);

      setSaving(false);
      if (error) return alert(error.message);
      router.push('/protected/products');
    }
  };

  /* ---------------- RENDER ---------------- */
  if (permLoading || !authChecked) return <Loader message="Loading..." />;
  if (!authorized)
    return <div className="p-10 text-red-600">Unauthorized</div>;

  return (
    <PageWrapper title={editId ? 'Edit Product' : 'Create Product'}>
      <div className="bg-white p-6 rounded shadow max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product Name */}
          <FormInput
            label="Product Name"
            value={form.product_name}
            onChange={e => setForm({ ...form, product_name: e.target.value })}
            required
          />

          {/* Auto Code */}
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={autoCode} onChange={() => setAutoCode(!autoCode)} />
              Auto Product Code
            </label>

            {!autoCode && (
              <>
                <FormInput
                  label="Product Code"
                  value={form.product_code}
                  onChange={e => {
                    setForm({ ...form, product_code: e.target.value });
                    checkProductCode(e.target.value);
                  }}
                />
                {codeError && <p className="text-red-600 text-sm">{codeError}</p>}
              </>
            )}
          </div>

          {/* Product Type */}
          <div>
            <label className="block mb-1">Product Type</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.product_type_id}
              onChange={e => setForm({ ...form, product_type_id: e.target.value })}
            >
              <option value="">Select Type</option>
              {productTypes.map(t => (
                <option key={t.product_type_id} value={t.product_type_id}>
                  {t.product_type_name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <DropdownWithAdd
            label="Category"
            value={form.category_id}
            options={categories}
            valueKey="category_id"
            labelKey="category_name"
            onChange={v => setForm({ ...form, category_id: v })}
            onAdd={() => setAddType('category')}
          />

          {/* Product Group */}
          <DropdownWithAdd
            label="Product Group"
            value={form.product_group_id}
            options={productGroups}
            valueKey="product_group_id"
            labelKey="group_name"
            onChange={v => setForm({ ...form, product_group_id: v })}
            onAdd={() => setAddType('product_group')}
          />

          {/* Brand */}
          <DropdownWithAdd
            label="Brand"
            value={form.brand_id}
            options={brands}
            valueKey="brand_id"
            labelKey="brand_name"
            onChange={v => setForm({ ...form, brand_id: v })}
            onAdd={() => setAddType('brand')}
          />

          {/* UOM */}
          <div>
            <label className="block mb-1">Base UOM</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.base_uom_id}
              onChange={e => setForm({ ...form, base_uom_id: e.target.value })}
            >
              <option value="">Select UOM</option>
              {uoms.map(u => (
                <option key={u.uom_id} value={u.uom_id}>
                  {u.uom_name}
                </option>
              ))}
            </select>
          </div>

          {/* Default Description */}
          <div>
            <label className="block mb-1">Default Description</label>
            <textarea
              className="border rounded px-3 py-2 w-full min-h-[80px]"
              value={form.default_description}
              onChange={e => setForm({ ...form, default_description: e.target.value })}
            />
          </div>

          {/* Optional Description */}
          <div>
            <label className="block mb-1">Optional Description</label>
            <textarea
              className="border rounded px-3 py-2 w-full min-h-[80px]"
              value={form.optional_description}
              onChange={e => setForm({ ...form, optional_description: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            {editId ? 'Update Product' : 'Save Product'}
          </button>

          <button
            onClick={() => router.back()}
            className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>

      {addType && orgId && (
        <AddMasterModal
          type={addType}
          orgId={orgId}
          onClose={() => setAddType(null)}
          onSaved={loadMasters}
        />
      )}
    </PageWrapper>
  );
}

/* ---------------- REUSABLE DROPDOWN ---------------- */
interface DropdownProps {
  label: string;
  value: string | undefined;
  options: DropdownOption[];
  valueKey: string;
  labelKey: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}

function DropdownWithAdd({ label, value, options, valueKey, labelKey, onChange, onAdd }: DropdownProps) {
  return (
    <div>
      <label className="block mb-1">{label}</label>
      <div className="flex gap-2">
        <select
          className="flex-1 border rounded px-3 py-2"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select {label}</option>
          {options.map(o => (
            <option key={o[valueKey]} value={o[valueKey]}>
              {o[labelKey]}
            </option>
          ))}
        </select>
        <button type="button" onClick={onAdd} className="border px-3 rounded">
          + Add
        </button>
      </div>
    </div>
  );
}
