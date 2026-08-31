import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import { COLORS } from '../../lib/theme'
import { getMyAvailability, setAvailability } from '../../api/availability'
import { Slot } from '../../types'

const generateAllSlots = () => {
  const slots: { startTime: string; endTime: string }[] = []
  for (let h = 9; h < 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      const startH = String(h).padStart(2, '0')
      const startM = String(m).padStart(2, '0')
      const endH = m === 30 ? String(h + 1).padStart(2, '0') : startH
      const endM = m === 30 ? '00' : '30'
      slots.push({ startTime: `${startH}:${startM}`, endTime: `${endH}:${endM}` })
    }
  }
  return slots
}

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function ManageAvailabilityView() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [slots, setSlots] = useState<{ startTime: string; endTime: string; isBooked?: boolean; selected?: boolean }[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchAvail = async () => {
      setLoading(true)
      const res = await getMyAvailability(date)
      const all = generateAllSlots()
      
      if (res.success && res.data) {
        const savedSlots = res.data.slots
        setSlots(all.map(s => {
          const found = savedSlots.find(ss => ss.startTime === s.startTime)
          return {
            ...s,
            isBooked: found?.isBooked || false,
            selected: !!found
          }
        }))
      } else {
        setSlots(all.map(s => ({ ...s, isBooked: false, selected: false })))
      }
      setLoading(false)
      setMessage('')
    }
    fetchAvail()
  }, [date])

  const toggleSlot = (index: number) => {
    const newSlots = [...slots]
    if (!newSlots[index].isBooked) {
      newSlots[index].selected = !newSlots[index].selected
      setSlots(newSlots)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const selectedSlots = slots.filter(s => s.selected).map(s => ({ startTime: s.startTime, endTime: s.endTime }))
    const res = await setAvailability(date, selectedSlots)
    setSaving(false)
    if (res.success) {
      setMessage('Availability saved successfully!')
    } else {
      setMessage('Failed to save availability.')
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-6" style={{ color: COLORS.fg }}>Manage Availability</h1>
      <div className="rounded-2xl p-6 border shadow-sm mb-6" style={{ background: COLORS.card, borderColor: COLORS.border }}>
        <div className="mb-6 flex items-center gap-4">
          <label className="font-bold text-sm" style={{ color: COLORS.fg }}>Date:</label>
          <input 
            type="date" 
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 transition-colors"
            style={{ borderColor: COLORS.border, color: COLORS.fg }}
          />
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm" style={{ color: COLORS.fg3 }}>Loading slots...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {slots.map((slot, idx) => (
                <div 
                  key={idx}
                  onClick={() => toggleSlot(idx)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${slot.isBooked ? 'opacity-60 cursor-not-allowed bg-teal-50' : 'cursor-pointer hover:border-teal-400 card-hover hover:bg-teal-50'}`}
                  style={{ 
                    borderColor: slot.selected ? COLORS.primary : COLORS.border,
                    background: slot.isBooked ? COLORS.muted : (slot.selected ? COLORS.bg : COLORS.card)
                  }}
                >
                  <div className="shrink-0 flex items-center justify-center">
                    {slot.isBooked ? (
                      <Lock size={16} style={{ color: COLORS.fg3 }} />
                    ) : (
                      <input 
                        type="checkbox" 
                        checked={slot.selected || false} 
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-gray-300 focus:border-teal-500"
                        style={{ accentColor: COLORS.primary }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: COLORS.fg }}>
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-5" style={{ borderColor: COLORS.border }}>
              <div className="text-sm font-semibold" style={{ color: message.includes('success') ? 'green' : 'red' }}>
                {message}
              </div>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="px-6 py-2.5 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: COLORS.primary }}
              >
                {saving ? 'Saving...' : 'Save Availability'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
