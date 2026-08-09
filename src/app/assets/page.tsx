'use client';

import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Laptop,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

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
  location: string;
  condition: 'New' | 'Good' | 'Fair' | 'Needs repair';
  lastChecked: string;
  notes: string;
};

const INITIAL_ASSETS: Asset[] = [
  { id: 'AST-001', assetTag: 'APX-LT-1042', category: 'Laptop', name: 'MacBook Pro 14-inch', brand: 'Apple', model: 'M3 Pro / 18GB / 512GB', serialNumber: 'C02X7A1QMD6T', purchaseDate: '12 Jan 2026', purchaseCost: '₹1,84,900', warrantyUntil: '11 Jan 2029', status: 'Assigned', assignedTo: 'Ayush Vishnoi', employeeCode: 'EMP-2026-089', location: 'Bengaluru Office', condition: 'Good', lastChecked: '08 Aug 2026', notes: 'Primary development machine. VPN and endpoint security enabled.' },
  { id: 'AST-002', assetTag: 'APX-LT-1031', category: 'Laptop', name: 'ThinkPad X1 Carbon', brand: 'Lenovo', model: 'Gen 11 / 16GB / 1TB', serialNumber: 'PF4K8M2L', purchaseDate: '05 Nov 2025', purchaseCost: '₹1,32,500', warrantyUntil: '04 Nov 2028', status: 'Assigned', assignedTo: 'Arjun Mehta', employeeCode: 'EMP-2019-012', location: 'Bengaluru Office', condition: 'Good', lastChecked: '01 Aug 2026', notes: 'Manager device with docking station.' },
  { id: 'AST-003', assetTag: 'APX-MN-2088', category: 'Monitor', name: 'UltraSharp 27 Monitor', brand: 'Dell', model: 'U2723QE 4K USB-C', serialNumber: 'CN0U2723ABC', purchaseDate: '22 Feb 2026', purchaseCost: '₹48,000', warrantyUntil: '21 Feb 2029', status: 'Available', assignedTo: 'Unassigned', employeeCode: '—', location: 'IT Store - Bengaluru', condition: 'New', lastChecked: '05 Aug 2026', notes: 'Ready for the next onboarding batch.' },
  { id: 'AST-004', assetTag: 'APX-MB-3014', category: 'Mobile', name: 'iPhone 15', brand: 'Apple', model: '128GB / Black', serialNumber: 'F2LXY91K7D', purchaseDate: '18 Sep 2025', purchaseCost: '₹72,900', warrantyUntil: '17 Sep 2026', status: 'Repair', assignedTo: 'Neha Kapoor', employeeCode: 'EMP-2022-041', location: 'Mumbai Office', condition: 'Needs repair', lastChecked: '07 Aug 2026', notes: 'Screen issue reported. Sent to authorised service centre.' },
  { id: 'AST-005', assetTag: 'APX-AC-4017', category: 'Access Card', name: 'Employee Access Card', brand: 'Apex Security', model: 'RFID v2', serialNumber: 'RFID-EMP-2026-089', purchaseDate: '15 Jul 2026', purchaseCost: '₹850', warrantyUntil: '14 Jul 2027', status: 'Assigned', assignedTo: 'Ayush Vishnoi', employeeCode: 'EMP-2026-089', location: 'Bengaluru Office', condition: 'Good', lastChecked: '15 Jul 2026', notes: 'Access enabled for HQ, lab and cafeteria.' },
];

const STORAGE_KEY = 'hrms-assets';
const statusStyles: Record<AssetStatus, string> = {
  Assigned: 'border-blue-200 bg-blue-50 text-blue-700',
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Repair: 'border-amber-200 bg-amber-50 text-amber-700',
  Retired: 'border-slate-200 bg-slate-100 text-slate-600',
};

export default function AssetsPage() {
  const { currentUser, employees } = useHRMS();
  const [assets, setAssets] = useState<Asset[]>(() => {
    if (typeof window === 'undefined') return INITIAL_ASSETS;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) as Asset[] : INITIAL_ASSETS;
    } catch { return INITIAL_ASSETS; }
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | AssetStatus>('All');
  const [category, setCategory] = useState<'All' | AssetCategory>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', category: 'Laptop' as AssetCategory, brand: '', model: '', serialNumber: '', warrantyUntil: '', purchaseCost: '', location: 'Bengaluru Office' });

  const persist = (next: Asset[]) => {
    setAssets(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const isAdmin = currentUser.userRole === 'admin';
  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const text = `${asset.assetTag} ${asset.name} ${asset.brand} ${asset.model} ${asset.serialNumber} ${asset.assignedTo}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (status === 'All' || asset.status === status) && (category === 'All' || asset.category === category);
  }), [assets, category, query, status]);
  const selectedAsset = assets.find((asset) => asset.id === selectedId);
  const updateAsset = (id: string, changes: Partial<Asset>) => {
    persist(assets.map((asset) => asset.id === id ? { ...asset, ...changes } : asset));
    setNotice('Asset record updated successfully.');
  };
  const addAsset = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.serialNumber.trim()) return;
    const asset: Asset = { id: `AST-${String(assets.length + 1).padStart(3, '0')}`, assetTag: `APX-${form.category.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`, ...form, name: form.name.trim(), brand: form.brand.trim(), model: form.model.trim(), serialNumber: form.serialNumber.trim(), purchaseDate: '09 Aug 2026', status: 'Available', assignedTo: 'Unassigned', employeeCode: '—', condition: 'New', lastChecked: '09 Aug 2026', notes: 'Newly added inventory item.' };
    persist([asset, ...assets]);
    setForm({ name: '', category: 'Laptop', brand: '', model: '', serialNumber: '', warrantyUntil: '', purchaseCost: '', location: 'Bengaluru Office' });
    setShowAdd(false);
    setNotice('New asset added to inventory.');
  };

  if (!isAdmin) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"><Archive className="mx-auto h-10 w-10 text-rose-600" /><h1 className="mt-3 text-xl font-black text-[#17324A]">Asset & Inventory</h1><p className="mt-2 text-sm text-rose-700">This workspace is available only to HR Admin users.</p></div>;

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]"><Archive className="h-4 w-4" /> HR operations</div><h1 className="text-2xl font-black tracking-tight text-[#17324A]">Asset & Inventory</h1><p className="mt-1 max-w-2xl text-sm text-[#667085]">Maintain the complete record of company devices, employee assignments, ownership details, warranty coverage, and lifecycle status.</p></div><button type="button" onClick={() => setShowAdd(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"><Plus className="h-4 w-4" /> Add asset</button></header>
    {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {notice}</div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Total assets" value={assets.length} detail="Across all locations" icon={Archive} /><Stat label="Assigned" value={assets.filter((a) => a.status === 'Assigned').length} detail="With employees" icon={UserRound} /><Stat label="Available" value={assets.filter((a) => a.status === 'Available').length} detail="Ready to assign" icon={ClipboardList} /><Stat label="Warranty watch" value={assets.filter((a) => a.warrantyUntil.includes('2026')).length} detail="Ending this year" icon={ShieldCheck} /></div>
    <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="flex items-center gap-2 text-base font-black text-[#17324A]"><Laptop className="h-4 w-4 text-[#5B91B5]" /> Inventory register</h2><p className="mt-1 text-xs text-[#667085]">Select an asset to inspect or update its assignment and lifecycle details.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98A2B3]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search asset, serial, employee" className="w-full rounded-lg border border-[#D9E5EE] py-2 pl-8 pr-3 text-xs text-[#17324A] outline-none sm:w-60" /></label><select value={category} onChange={(e) => setCategory(e.target.value as 'All' | AssetCategory)} className="rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs font-semibold text-[#315B76]"><option>All</option>{['Laptop', 'Monitor', 'Mobile', 'Access Card', 'Other'].map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value as 'All' | AssetStatus)} className="rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs font-semibold text-[#315B76]"><option>All</option>{['Assigned', 'Available', 'Repair', 'Retired'].map((item) => <option key={item}>{item}</option>)}</select></div></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[#667085]"><tr><th className="px-3 py-3 font-bold">Asset</th><th className="px-3 py-3 font-bold">Device details</th><th className="px-3 py-3 font-bold">Assigned to</th><th className="px-3 py-3 font-bold">Warranty</th><th className="px-3 py-3 font-bold">Status</th><th className="px-3 py-3 text-right font-bold">Action</th></tr></thead><tbody className="divide-y divide-[#D9E5EE] text-[#17324A]">{filteredAssets.map((asset) => <tr key={asset.id} className="hover:bg-[#F9FBFD]"><td className="px-3 py-3"><p className="font-bold">{asset.name}</p><p className="mt-1 font-mono text-[10px] text-[#5B91B5]">{asset.assetTag}</p></td><td className="px-3 py-3"><p>{asset.brand} {asset.model}</p><p className="mt-1 font-mono text-[10px] text-[#667085]">S/N {asset.serialNumber}</p></td><td className="px-3 py-3">{asset.assignedTo}<p className="mt-1 text-[10px] text-[#667085]">{asset.location}</p></td><td className="px-3 py-3"><p>{asset.warrantyUntil}</p><p className="mt-1 text-[10px] text-[#667085]">Purchased {asset.purchaseDate}</p></td><td className="px-3 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusStyles[asset.status]}`}>{asset.status}</span></td><td className="px-3 py-3 text-right"><button type="button" onClick={() => setSelectedId(asset.id)} className="rounded-lg border border-[#9FC2DC] px-3 py-1.5 text-[10px] font-bold text-[#315B76] hover:bg-[#E8F2FA]">View details</button></td></tr>)}</tbody></table>{filteredAssets.length === 0 && <p className="py-10 text-center text-xs text-[#667085]">No assets match the selected filters.</p>}</div></section>
    {selectedAsset && <AssetDetails asset={selectedAsset} employees={employees} onClose={() => setSelectedId(null)} onUpdate={updateAsset} />}
    {showAdd && <AddAssetModal form={form} setForm={setForm} onClose={() => setShowAdd(false)} onSubmit={addAsset} />}
  </div>;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: React.ElementType }) { return <StatCard label={label} value={String(value)} detail={detail} icon={Icon} />; }
function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) { return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">{label}</p><Icon className="h-4 w-4 text-[#5B91B5]" /></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[10px] text-[#98A2B3]">{detail}</p></div>; }

function AssetDetails({ asset, employees, onClose, onUpdate }: { asset: Asset; employees: { id: string; name: string; employeeCode: string }[]; onClose: () => void; onUpdate: (id: string, changes: Partial<Asset>) => void }) {
  const [assignedTo, setAssignedTo] = useState(asset.assignedTo === 'Unassigned' ? '' : asset.employeeCode);
  const [assetStatus, setAssetStatus] = useState(asset.status);
  const save = () => { const employee = employees.find((item) => item.employeeCode === assignedTo); onUpdate(asset.id, { assignedTo: employee?.name ?? 'Unassigned', employeeCode: employee?.employeeCode ?? '—', status: employee ? 'Assigned' : assetStatus }); onClose(); };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17324A]/55 p-4" role="dialog" aria-modal="true"><div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#D9E5EE] px-5 py-4"><div><p className="font-mono text-[10px] font-bold text-[#5B91B5]">{asset.assetTag}</p><h2 className="text-lg font-black text-[#17324A]">{asset.name}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]" aria-label="Close details">×</button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><Detail label="Brand / model" value={`${asset.brand} ${asset.model}`} /><Detail label="Serial number" value={asset.serialNumber} /><Detail label="Purchase cost" value={asset.purchaseCost || 'Not recorded'} /><Detail label="Warranty until" value={asset.warrantyUntil || 'Not recorded'} /><Detail label="Purchase date" value={asset.purchaseDate} /><Detail label="Last checked" value={asset.lastChecked} /><div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">Notes</p><p className="mt-1 text-xs leading-5 text-[#315B76]">{asset.notes}</p></div><label className="text-xs font-bold text-[#17324A]">Assign to<select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="mt-1 w-full rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs font-normal"><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.employeeCode}>{employee.name} · {employee.employeeCode}</option>)}</select></label><label className="text-xs font-bold text-[#17324A]">Lifecycle status<select value={assetStatus} onChange={(e) => setAssetStatus(e.target.value as AssetStatus)} className="mt-1 w-full rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs font-normal">{['Assigned', 'Available', 'Repair', 'Retired'].map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="flex justify-end gap-2 border-t border-[#D9E5EE] px-5 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-[#D9E5EE] px-4 py-2 text-xs font-bold text-[#315B76]">Cancel</button><button type="button" onClick={save} className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-bold text-white">Save changes</button></div></div></div>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">{label}</p><p className="mt-1 text-xs font-semibold text-[#17324A]">{value}</p></div>; }
function AddAssetModal({ form, setForm, onClose, onSubmit }: { form: { name: string; category: AssetCategory; brand: string; model: string; serialNumber: string; warrantyUntil: string; purchaseCost: string; location: string }; setForm: React.Dispatch<React.SetStateAction<typeof form>>; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) { const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value })); return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17324A]/55 p-4"><form onSubmit={onSubmit} className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><div className="border-b border-[#D9E5EE] px-5 py-4"><h2 className="text-lg font-black text-[#17324A]">Add inventory asset</h2><p className="mt-1 text-xs text-[#667085]">Capture the core ownership and warranty details.</p></div><div className="grid gap-3 p-5 sm:grid-cols-2">{([['name', 'Asset name'], ['brand', 'Brand'], ['model', 'Model / configuration'], ['serialNumber', 'Serial number'], ['purchaseCost', 'Purchase cost'], ['warrantyUntil', 'Warranty until'], ['location', 'Location']] as const).map(([key, label]) => <label key={key} className="text-xs font-bold text-[#17324A]">{label}<input required={key === 'name' || key === 'serialNumber'} value={form[key]} onChange={(e) => field(key, e.target.value)} className="mt-1 w-full rounded-lg border border-[#D9E5EE] px-3 py-2 text-xs font-normal outline-none focus:border-[#6FA6C9]" /></label>)}<label className="text-xs font-bold text-[#17324A]">Category<select value={form.category} onChange={(e) => field('category', e.target.value)} className="mt-1 w-full rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs font-normal">{['Laptop', 'Monitor', 'Mobile', 'Access Card', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="flex justify-end gap-2 border-t border-[#D9E5EE] px-5 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-[#D9E5EE] px-4 py-2 text-xs font-bold text-[#315B76]">Cancel</button><button type="submit" className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-bold text-white">Add asset</button></div></form></div>; }
