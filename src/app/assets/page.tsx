'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Laptop,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type AssetStatus = 'Assigned' | 'Available' | 'Repair' | 'Retired';
type AssetCategory = 'Laptop' | 'Monitor' | 'Mobile' | 'Access Card' | 'Other';

type Asset = {
  id: string;
  assetTag: string;
  category: AssetCategory;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseCost: string;
  warrantyUntil: string;
  status: AssetStatus;
  assignedTo: string;
  employeeCode: string;
  assignedToId?: string | null;
  location: string;
  condition: 'New' | 'Good' | 'Fair' | 'Needs repair';
  lastChecked: string;
  notes: string;
};

const statusStyles: Record<AssetStatus, string> = {
  Assigned: 'border-blue-200 bg-blue-50 text-blue-700',
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Repair: 'border-amber-200 bg-amber-50 text-amber-700',
  Retired: 'border-slate-200 bg-slate-100 text-slate-600',
};

const formatDbAsset = (a: any): Asset => ({
  id: a.id,
  assetTag: a.assetTag || a.asset_tag || a.id,
  category: (a.category as AssetCategory) || 'Laptop',
  name: a.name,
  brand: a.brand || '',
  model: a.model || '',
  serialNumber: a.serialNumber || a.serial_number || '',
  purchaseDate: a.purchaseDate || a.purchase_date || '',
  purchaseCost: a.purchaseCost || a.purchase_cost || '',
  warrantyUntil: a.warrantyUntil || a.warranty_until || '',
  status: (a.status as AssetStatus) || 'Available',
  assignedTo: a.assignedTo?.name || 'Unassigned',
  employeeCode: a.assignedTo?.employeeCode || '—',
  assignedToId: a.assignedToId || a.assigned_to_id || null,
  location: a.location || 'Bengaluru Office',
  condition: (a.condition as any) || 'Good',
  lastChecked: a.lastChecked || a.last_checked || '09 Aug 2026',
  notes: a.notes || '',
});

const inputClass = 'w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]';

export default function AssetsPage() {
  const { currentUser, employees } = useHRMS();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | AssetStatus>('All');
  const [category, setCategory] = useState<'All' | AssetCategory>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [preselectedAssetId, setPreselectedAssetId] = useState<string>('');
  const [notice, setNotice] = useState('');

  // Add Asset Form
  const [form, setForm] = useState({
    name: '',
    category: 'Laptop' as AssetCategory,
    brand: '',
    model: '',
    serialNumber: '',
    warrantyUntil: '',
    purchaseCost: '',
    location: 'Bengaluru Office',
  });

  // Assign Asset Form
  const [assignAssetId, setAssignAssetId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignLocation, setAssignLocation] = useState('Bengaluru Office');

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          setAssets(json.data.map((a: any) => formatDbAsset(a)));
        }
      }
    } catch (err) {
      console.error('Failed to load assets from database:', err);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const isAdmin = currentUser.userRole === 'admin';

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const text = `${asset.assetTag} ${asset.name} ${asset.brand} ${asset.model} ${asset.serialNumber} ${asset.assignedTo}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (status === 'All' || asset.status === status) && (category === 'All' || asset.category === category);
  }), [assets, category, query, status]);

  const selectedAsset = assets.find((asset) => asset.id === selectedId);

  const openAssignModal = (assetId?: string) => {
    if (assetId) {
      setAssignAssetId(assetId);
    } else {
      const firstAvailable = assets.find((a) => a.status === 'Available');
      setAssignAssetId(firstAvailable ? firstAvailable.id : (assets[0]?.id || ''));
    }
    setAssignEmployeeId(employees[0]?.id || '');
    setShowAssign(true);
  };

  const handleConfirmAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignAssetId || !assignEmployeeId) return;

    const targetAsset = assets.find((a) => a.id === assignAssetId);
    const targetEmployee = employees.find((e) => e.id === assignEmployeeId);
    if (!targetAsset || !targetEmployee) return;

    try {
      const res = await fetch('/api/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assignAssetId,
          assignedToId: targetEmployee.id,
          status: 'Assigned',
          location: assignLocation || targetAsset.location,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const updated = formatDbAsset(json.data);
        setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a));
        setNotice(`Asset ${targetAsset.name} (${targetAsset.assetTag}) assigned to ${targetEmployee.name} in database.`);
      }
    } catch (err) {
      console.error('Failed to assign asset in database:', err);
    }

    setShowAssign(false);
  };

  const updateAsset = async (id: string, changes: Partial<Asset>) => {
    setAssets((prev) => prev.map((asset) => asset.id === id ? { ...asset, ...changes } : asset));
    setNotice('Asset record updated in database successfully.');

    try {
      await fetch('/api/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: changes.status,
          assignedToId: changes.assignedToId,
          location: changes.location,
          condition: changes.condition,
          notes: changes.notes,
        }),
      });
    } catch (err) {
      console.error('Failed to update asset in database:', err);
    }
  };

  const addAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.serialNumber.trim()) return;

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          brand: form.brand.trim(),
          model: form.model.trim(),
          serialNumber: form.serialNumber.trim(),
          warrantyUntil: form.warrantyUntil.trim(),
          purchaseCost: form.purchaseCost.trim(),
          location: form.location.trim() || 'Bengaluru Office',
          status: 'Available',
          condition: 'New',
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const created = formatDbAsset(json.data);
        setAssets((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      }
    } catch (err) {
      console.error('Failed to add asset to database:', err);
    }

    setForm({ name: '', category: 'Laptop', brand: '', model: '', serialNumber: '', warrantyUntil: '', purchaseCost: '', location: 'Bengaluru Office' });
    setShowAdd(false);
    setNotice('New asset stored in database successfully.');
  };

  if (!isAdmin) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"><Archive className="mx-auto h-10 w-10 text-rose-600" /><h1 className="mt-3 text-xl font-black text-[#17324A]">Asset & Inventory</h1><p className="mt-2 text-sm text-rose-700">This workspace is available only to HR Admin users.</p></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]"><Archive className="h-4 w-4" /> HR operations</div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Asset & Inventory</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#667085]">Maintain company devices, allocate assets to employees, and record persistent assignments in PostgreSQL.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openAssignModal()}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#9FC4E1] bg-[#B0D0EA] px-4 py-2.5 text-xs font-bold text-[#17324A] hover:bg-[#9FC4E1] transition shadow-sm"
          >
            <UserCheck className="h-4 w-4" /> Assign asset
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68] transition shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add asset
          </button>
        </div>
      </header>

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {notice}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Assets" value={String(assets.length)} detail="Registered in database" icon={Archive} />
        <Stat label="Assigned" value={String(assets.filter((a) => a.status === 'Assigned').length)} detail="In active employee use" icon={UserRound} />
        <Stat label="Available" value={String(assets.filter((a) => a.status === 'Available').length)} detail="Ready for allocation" icon={ClipboardList} />
        <Stat label="Active Laptops" value={String(assets.filter((a) => a.category === 'Laptop').length)} detail="Company computing fleet" icon={Laptop} />
      </div>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#667085]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search asset tag, brand, serial, or employee..." className="rounded-lg border border-[#9FC2DC] py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] sm:w-80" />
            </label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]">
              <option value="All">All statuses</option>
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="Repair">Repair</option>
              <option value="Retired">Retired</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]">
              <option value="All">All categories</option>
              <option value="Laptop">Laptop</option>
              <option value="Monitor">Monitor</option>
              <option value="Mobile">Mobile</option>
              <option value="Access Card">Access Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[#667085]">
                <th className="px-4 py-3">Asset Details</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Serial / Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E5EE]">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-[#F5F9FC]">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setSelectedId(asset.id)} className="text-left font-bold text-[#17324A] hover:text-[#5B91B5]">
                      {asset.name}
                      <p className="text-[10px] font-normal text-[#667085]">{asset.assetTag} · {asset.brand}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[#667085]">{asset.category}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#17324A]">{asset.serialNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[asset.status]}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {asset.status === 'Assigned' ? (
                      <div>
                        <p className="font-bold text-[#17324A]">{asset.assignedTo}</p>
                        <p className="text-[10px] text-[#667085]">{asset.employeeCode}</p>
                      </div>
                    ) : (
                      <span className="text-[#667085] italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {asset.status === 'Available' ? (
                      <button
                        type="button"
                        onClick={() => openAssignModal(asset.id)}
                        className="rounded-lg border border-[#9FC4E1] bg-[#B0D0EA] px-3 py-1.5 text-[10px] font-bold text-[#17324A] hover:bg-[#9FC4E1] transition"
                      >
                        Assign
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedId(asset.id)}
                        className="rounded-lg border border-[#D9E5EE] px-3 py-1.5 text-[10px] font-bold text-[#17324A] hover:bg-[#EAF2F8] transition"
                      >
                        Manage
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#667085]">
                    No assets match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Assign Asset Modal */}
      {showAssign && (
        <Modal title="Assign Asset to Employee" onClose={() => setShowAssign(false)}>
          <form onSubmit={handleConfirmAssignment} className="space-y-4">
            <Field label="Select Asset">
              <select
                required
                value={assignAssetId}
                onChange={(e) => setAssignAssetId(e.target.value)}
                className={inputClass}
              >
                <option value="">-- Choose Asset --</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetTag} - {asset.name} ({asset.brand}) [{asset.status}]
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Select Employee">
              <select
                required
                value={assignEmployeeId}
                onChange={(e) => setAssignEmployeeId(e.target.value)}
                className={inputClass}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode}) - {emp.role} [{emp.department}]
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Deployment Location">
              <input
                value={assignLocation}
                onChange={(e) => setAssignLocation(e.target.value)}
                className={inputClass}
                placeholder="e.g. Bengaluru Office / Remote"
              />
            </Field>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-[#17324A] space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#5B91B5]" /> Automatic Employee Notification
              </p>
              <p className="text-[11px] text-[#55708A]">
                Upon assignment, this device will be linked to the employee in PostgreSQL and a notification will be delivered to their dashboard.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAssign(false)}
                className="rounded-lg border border-[#D9E5EE] px-4 py-2 text-xs font-bold text-[#52677A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#17324A] px-5 py-2 text-xs font-bold text-white hover:bg-[#244A68] transition"
              >
                Confirm Assignment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Asset Modal */}
      {showAdd && (
        <Modal title="Register new asset" onClose={() => setShowAdd(false)}>
          <form onSubmit={addAsset} className="space-y-4">
            <Field label="Asset name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ThinkPad T14s Gen 4" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className={inputClass}>
                  <option value="Laptop">Laptop</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Access Card">Access Card</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Brand">
                <input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Lenovo" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model">
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. 21F8004KUS" className={inputClass} />
              </Field>
              <Field label="Serial number">
                <input required value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="e.g. PF-4J299" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Warranty until">
                <input value={form.warrantyUntil} onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })} placeholder="e.g. 2028-06-30" className={inputClass} />
              </Field>
              <Field label="Purchase cost">
                <input value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} placeholder="e.g. ₹95,000" className={inputClass} />
              </Field>
            </div>
            <button type="submit" className="w-full rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]">
              Save Asset to PostgreSQL
            </button>
          </form>
        </Modal>
      )}

      {/* Selected Asset Details / Manage Modal */}
      {selectedAsset && (
        <Modal title={`Asset ${selectedAsset.assetTag}`} onClose={() => setSelectedId(null)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#17324A]">{selectedAsset.name}</h3>
                <p className="text-xs text-[#667085]">{selectedAsset.brand} · {selectedAsset.category}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[selectedAsset.status]}`}>
                {selectedAsset.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F8FAFC] p-3 text-xs border border-[#D9E5EE]">
              <div><p className="text-[10px] text-[#667085]">Serial Number</p><p className="font-mono font-bold text-[#17324A]">{selectedAsset.serialNumber}</p></div>
              <div><p className="text-[10px] text-[#667085]">Location</p><p className="font-bold text-[#17324A]">{selectedAsset.location}</p></div>
              <div><p className="text-[10px] text-[#667085]">Assigned Employee</p><p className="font-bold text-[#17324A]">{selectedAsset.assignedTo}</p></div>
              <div><p className="text-[10px] text-[#667085]">Last Checked</p><p className="font-bold text-[#17324A]">{selectedAsset.lastChecked}</p></div>
            </div>

            <div className="flex gap-2 pt-2">
              {selectedAsset.status === 'Available' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    openAssignModal(selectedAsset.id);
                  }}
                  className="flex-1 rounded-lg bg-[#17324A] px-4 py-2 text-xs font-bold text-white hover:bg-[#244A68]"
                >
                  Assign to Employee
                </button>
              )}
              {selectedAsset.status === 'Assigned' && (
                <button
                  type="button"
                  onClick={() => {
                    updateAsset(selectedAsset.id, { status: 'Available', assignedToId: null, assignedTo: 'Unassigned' });
                    setSelectedId(null);
                  }}
                  className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  Unassign / Return to Inventory
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[#17324A]">{label}<span className="mt-1 block">{children}</span></label>; }
function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) { return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span><span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[11px] text-[#667085]">{detail}</p></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#17324A]">{title}</h2><button onClick={onClose} aria-label={`Close ${title}`} className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]"><X className="h-5 w-5" /></button></div>{children}</div></div>; }
