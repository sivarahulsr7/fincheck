import { useState } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, Search } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { ASSET_TYPES } from '../../utils/constants'
import { fmtPct, fmtDate } from '../../utils/formatters'
import BottomSheet from '../../components/common/BottomSheet'
import AssetForm from '../../components/forms/AssetForm'

export default function Assets() {
  const { assets, deleteAsset } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editAsset, setEditAsset] = useState(null)
  const [viewMode, setViewMode] = useState('list') // list | grid
  const [catFilter, setCatFilter] = useState('all')

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
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-white">Assets</h2>
          <p className="text-xs text-gray-500">{assets.length} assets</p>
        </div>
        <button onClick={openAdd} className="w-9 h-9 rounded-xl bg-green flex items-center justify-center text-[#1a3d29]">
          <Plus size={18} />
        </button>
      </div>

      {/* Summary */}
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
        </div>
      </div>

      {/* Category filter */}
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

      {/* List */}
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
            const pnl = (a.currentValue || a.investedAmount || 0) - (a.investedAmount || 0)
            const pnlP = a.investedAmount > 0 ? (pnl / a.investedAmount) * 100 : 0
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.name}</p>
                  {at && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: at.color, borderColor: at.color + '44' }}>
                      {at.name}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <Amount value={a.currentValue || a.investedAmount || 0} className="text-sm text-white" />
                  <p className={`text-[10px] font-medium ${pnlP >= 0 ? 'text-green' : 'text-red'}`}>
                    {fmtPct(pnlP)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="text-gray-600 hover:text-gray-300 p-1"><Edit2 size={12} /></button>
                  <button onClick={() => deleteAsset(a.id)} className="text-gray-600 hover:text-red p-1"><Trash2 size={12} /></button>
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
    </div>
  )
}
