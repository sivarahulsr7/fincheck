import { useState } from 'react'
import { Plus, Edit2, Trash2, RefreshCw, Check, Repeat } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { ASSET_TYPES } from '../../utils/constants'
import { fmtPct } from '../../utils/formatters'
import { cagrPct } from '../../utils/assetReturns'
import BottomSheet from '../../components/common/BottomSheet'
import AssetForm from '../../components/forms/AssetForm'

const STALE_MS = 45 * 24 * 3600 * 1000

export default function Assets() {
  const { assets, recurring, transactions, deleteAsset, updateAsset } = useFinanceStore()
  const incomeFor = (id) => transactions.filter((t) => t.incomeAssetId === id).reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalIncome = transactions.filter((t) => t.incomeAssetId).reduce((s, t) => s + Number(t.amount || 0), 0)
  const [showForm, setShowForm] = useState(false)
  const [editAsset, setEditAsset] = useState(null)
  const [catFilter, setCatFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [priceTarget, setPriceTarget] = useState(null) // asset being value-updated
  const [priceVal, setPriceVal] = useState('')

  // SIP: monthly recurring contribution linked to an asset (AST-2).
  const sipFor = (id) => recurring
    .filter((r) => r.assetId === id && r.isActive !== false && r.frequency === 'monthly')
    .reduce((s, r) => s + Number(r.amount || 0), 0)

  const openPrice = (a) => { setPriceTarget(a); setPriceVal(String(a.currentValue ?? a.investedAmount ?? '')) }
  const savePrice = async () => {
    if (priceTarget && Number(priceVal) >= 0) await updateAsset(priceTarget.id, { currentValue: Number(priceVal) })
    setPriceTarget(null); setPriceVal('')
  }

  const totalInvested = assets.reduce((s, a) => s + (a.investedAmount || 0), 0)
  const totalCurrent  = assets.reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
  const pnl = totalCurrent - totalInvested
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0

  const filtered = catFilter === 'all' ? assets : assets.filter((a) => a.assetType === catFilter)

  const getAssetType = (id) => ASSET_TYPES.find((t) => t.id === id)

  const openEdit = (a) => { setEditAsset(a); setShowForm(true) }
  const openAdd = () => { setEditAsset(null); setShowForm(true) }

  return (
    <div className="px-4 pt-3 pb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-white">Assets</h2>
          <p className="text-xs text-gray-500">{assets.length} assets</p>
        </div>
        <button onClick={openAdd} className="w-9 h-9 rounded-xl bg-green flex items-center justify-center text-[#1a3d29]">
          <Plus size={18} />
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">INVESTED</p>
            <Amount value={totalInvested} className="text-base font-bold text-white" />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">CURRENT VALUE</p>
            <Amount value={totalCurrent} className="text-base font-bold text-white" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">P&L</p>
          <Amount value={pnl} className={`text-sm font-semibold ${pnl >= 0 ? 'text-green' : 'text-red'}`} />
          <span className={`text-xs font-medium ${pnlPct >= 0 ? 'text-green' : 'text-red'}`}>
            ({fmtPct(pnlPct)})
          </span>
          {totalIncome > 0 && (
            <span className="text-xs text-gray-400 ml-auto">Income <Amount value={totalIncome} className="text-green" /></span>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        <button onClick={() => setCatFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${catFilter === 'all' ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-400'}`}>
          All
        </button>
        {ASSET_TYPES.map((at) => (
          <button key={at.id} onClick={() => setCatFilter(at.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${catFilter === at.id ? 'text-white' : 'bg-card-2 text-gray-400'}`}
            style={catFilter === at.id ? { background: at.color } : {}}>
            {at.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No assets yet.</p>
          <button onClick={openAdd} className="text-green text-xs mt-2">Add your first asset →</button>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-card-border bg-card rounded-2xl border border-card-border overflow-hidden">
          <div className="flex items-center px-4 py-2 text-[10px] text-gray-500 uppercase tracking-widest">
            <span className="flex-1">NAME</span>
            <span>CUR. VAL</span>
          </div>
          {filtered.map((a) => {
            const at = getAssetType(a.assetType)
            const curVal = a.currentValue || a.investedAmount || 0
            const itemPnl = curVal - (a.investedAmount || 0)
            const itemPnlP = a.investedAmount > 0 ? (itemPnl / a.investedAmount) * 100 : 0
            const cagr = cagrPct(a.investedAmount, curVal, a.purchaseDate)
            const sip = sipFor(a.id)
            const stale = typeof a.updatedAt === 'number' && (Date.now() - a.updatedAt) > STALE_MS
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {at && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: at.color, borderColor: at.color + '44' }}>
                        {at.name}
                      </span>
                    )}
                    {sip > 0 && (
                      <span className="text-[10px] text-green flex items-center gap-0.5"><Repeat size={9} /> SIP ₹{sip.toLocaleString('en-IN')}/mo</span>
                    )}
                    {incomeFor(a.id) > 0 && (
                      <span className="text-[10px] text-gray-500">₹{incomeFor(a.id).toLocaleString('en-IN')} income</span>
                    )}
                    {stale && <span className="text-[10px] text-orange-400">stale</span>}
                  </div>
                </div>
                <div className="text-right">
                  <button onClick={() => openPrice(a)} className="flex items-center gap-1 justify-end">
                    <Amount value={curVal} className="text-sm text-white" />
                    <RefreshCw size={11} className="text-gray-600" />
                  </button>
                  <p className={`text-[10px] font-medium ${itemPnlP >= 0 ? 'text-green' : 'text-red'}`}>
                    {fmtPct(itemPnlP)}{cagr != null ? ` · ${fmtPct(cagr)} p.a.` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="text-gray-600 hover:text-gray-300 p-1"><Edit2 size={12} /></button>
                  <button onClick={() => setDeleteTarget(a)} className="text-gray-600 hover:text-red p-1"><Trash2 size={12} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BottomSheet open={showForm} onClose={() => { setShowForm(false); setEditAsset(null) }}
        title={editAsset ? 'Edit Asset' : 'Add Asset'}>
        <AssetForm asset={editAsset} onClose={() => { setShowForm(false); setEditAsset(null) }} />
      </BottomSheet>

      {/* Quick value update (AST-3) */}
      <BottomSheet open={!!priceTarget} onClose={() => { setPriceTarget(null); setPriceVal('') }} title="Update current value">
        <div className="flex flex-col gap-4">
          <p className="text-gray-400 text-sm">Latest value of "{priceTarget?.name}"</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input type="number" inputMode="decimal" placeholder="0" value={priceVal} autoFocus
              onChange={(e) => setPriceVal(e.target.value)}
              className="w-full bg-card-2 border border-card-border rounded-xl pl-8 pr-4 py-3 text-white text-lg font-semibold outline-none" />
          </div>
          <button onClick={savePrice} disabled={!(Number(priceVal) >= 0)}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${Number(priceVal) >= 0 ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
            <Check size={16} /> Update value
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Asset?">
        <p className="text-gray-400 text-sm mb-5">Delete "{deleteTarget?.name}"? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl bg-card-2 text-gray-300 font-medium">Cancel</button>
          <button onClick={() => { deleteAsset(deleteTarget.id); setDeleteTarget(null) }}
            className="flex-1 py-3 rounded-xl bg-red text-white font-semibold">Delete</button>
        </div>
      </BottomSheet>
    </div>
  )
}
