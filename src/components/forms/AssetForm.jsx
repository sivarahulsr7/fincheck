import { useState } from 'react'
import { Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { ASSET_TYPES } from '../../utils/constants'
import { todayISO } from '../../utils/formatters'

export default function AssetForm({ asset, onClose }) {
  const { addAsset, updateAsset } = useFinanceStore()
  const [name, setName] = useState(asset?.name || '')
  const [assetType, setAssetType] = useState(asset?.assetType || 'equity')
  const [investedAmount, setInvestedAmount] = useState(asset?.investedAmount || '')
  const [currentValue, setCurrentValue] = useState(asset?.currentValue || '')
  const [units, setUnits] = useState(asset?.units || '')
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate || todayISO())
  const [notes, setNotes] = useState(asset?.notes || '')
  const [saving, setSaving] = useState(false)

  const valid = name && investedAmount && Number(investedAmount) > 0

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      const data = {
        name, assetType,
        investedAmount: Number(investedAmount),
        currentValue: currentValue ? Number(currentValue) : Number(investedAmount),
        units: units ? Number(units) : null,
        purchaseDate, notes,
      }
      if (asset?.id) await updateAsset(asset.id, data)
      else await addAsset(data)
      onClose?.()
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green transition-colors'
  const labelCls = 'text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Asset Type</label>
        <div className="grid grid-cols-3 gap-2">
          {ASSET_TYPES.map((at) => (
            <button key={at.id} onClick={() => setAssetType(at.id)}
              className={`p-2 rounded-xl border text-xs font-medium transition-all ${assetType === at.id ? 'border-green bg-green-tint text-green' : 'border-card-border bg-card-2 text-gray-400'}`}>
              {at.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Asset Name</label>
        <input type="text" placeholder="e.g. UTI Nifty 50 Index Fund" value={name}
          onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Amount Invested</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input type="number" inputMode="decimal" placeholder="0" value={investedAmount}
            onChange={(e) => setInvestedAmount(e.target.value)} className={`${inputCls} pl-8`} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Current Value (optional)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input type="number" inputMode="decimal" placeholder="Leave blank if same as invested" value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)} className={`${inputCls} pl-8`} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Units (optional)</label>
        <input type="number" inputMode="decimal" placeholder="No. of units" value={units}
          onChange={(e) => setUnits(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Purchase Date</label>
        <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Notes (optional)</label>
        <textarea rows={2} placeholder="Any notes..." value={notes}
          onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
      </div>

      <button onClick={handleSave} disabled={!valid || saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${valid ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
        {saving ? 'Saving...' : <><Check size={16} /> {asset?.id ? 'Update' : 'Add'} Asset</>}
      </button>
    </div>
  )
}
