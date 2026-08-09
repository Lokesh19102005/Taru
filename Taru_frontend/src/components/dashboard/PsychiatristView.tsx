import { useState } from 'react'
import { CheckCircle, ChevronRight } from 'lucide-react'
import COLORS from '../../lib/theme'

export default function PsychiatristView() {
  const [selected, setSelected] = useState<string | null>(null)
  const [booked, setBooked] = useState(false)
  const [slot, setSlot] = useState('')

  const doctors = [
    { id: 'd1', name: 'Dr. Ananya Singh', title: 'Psychiatrist · AIIMS Delhi (External)', rating: 4.9, reviews: 142, avail: 'Next: Today 4pm', tags: ['Anxiety', 'Depression', 'Academic stress'] },
    { id: 'd2', name: 'Dr. Rohan Mehta', title: 'Clinical Psychologist · NIMHANS (External)', rating: 4.8, reviews: 87, avail: 'Next: Tomorrow 11am', tags: ['CBT', 'Trauma', 'Sleep issues'] },
    { id: 'd3', name: 'Dr. Kavitha Rao', title: 'Therapist · Online only (External)', rating: 4.7, reviews: 210, avail: 'Next: Wed 2pm', tags: ['Relationships', 'Self-esteem', 'Career anxiety'] },
  ]
  const slots = ['Today 4:00pm', 'Today 5:30pm', 'Tomorrow 10:00am', 'Tomorrow 2:30pm', 'Wed 11:00am', 'Wed 3:00pm']

  if (booked) {
    return (
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl p-8 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <CheckCircle size={32} className="mx-auto mb-4" style={{ color: COLORS.fg }} />
          <h2 className="text-xl font-extrabold mb-2" style={{ color: COLORS.fg }}>Session booked!</h2>
          <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>
            Your session with <strong style={{ color: COLORS.fg }}>{doctors.find(d => d.id === selected)?.name}</strong> is confirmed for <strong style={{ color: COLORS.fg }}>{slot}</strong>.
          </p>
          <button onClick={() => { setBooked(false); setSelected(null); setSlot('') }} className="text-sm hover:underline" style={{ color: COLORS.fg3 }}>← Back</button>
        </div>
      </div>
    )
  }

  if (selected) {
    const doc = doctors.find(d => d.id === selected)!
    return (
      <div className="max-w-md mx-auto space-y-4">
        <button onClick={() => setSelected(null)} className="text-sm hover:underline" style={{ color: COLORS.fg3 }}>← All doctors</button>
        <div className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold" style={{ background: COLORS.muted, color: COLORS.fg }}>{doc.name[3]}</div>
            <div>
              <div className="font-bold text-sm" style={{ color: COLORS.fg }}>{doc.name}</div>
              <div className="text-xs" style={{ color: COLORS.fg3 }}>{doc.title}</div>
              <div className="text-xs mt-0.5" style={{ color: COLORS.fg2 }}>★ {doc.rating} · {doc.reviews} reviews</div>
            </div>
          </div>
          <h3 className="text-sm font-bold mb-3" style={{ color: COLORS.fg }}>Choose a time slot</h3>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {slots.map(s => (
              <button key={s} onClick={() => setSlot(s)}
                className="py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all"
                style={{ borderColor: slot === s ? COLORS.primary : COLORS.border, background: slot === s ? COLORS.primary : 'transparent', color: slot === s ? '#fff' : COLORS.fg }}>
                {s}
              </button>
            ))}
          </div>
          <button disabled={!slot} onClick={() => slot && setBooked(true)}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-30 transition-all hover:opacity-80"
            style={{ background: COLORS.primary, color: '#fff' }}>
            Confirm Booking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="mb-1">
        <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Book a session</h2>
        <p className="text-xs mt-0.5" style={{ color: COLORS.fg3 }}>All practitioners are independent, certified professionals — not affiliated with your college.</p>
      </div>
      {doctors.map(doc => (
        <div key={doc.id} onClick={() => setSelected(doc.id)}
          className="rounded-2xl p-5 border cursor-pointer hover:border-black hover:shadow-sm transition-all group"
          style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: COLORS.muted, color: COLORS.fg }}>{doc.name[3]}</div>
            <div className="flex-1">
              <div className="font-bold text-sm" style={{ color: COLORS.fg }}>{doc.name}</div>
              <div className="text-xs" style={{ color: COLORS.fg3 }}>{doc.title}</div>
              <div className="text-xs mt-0.5" style={{ color: COLORS.fg2 }}>★ {doc.rating} · {doc.avail}</div>
            </div>
            <ChevronRight size={14} className="shrink-0 mt-1 group-hover:text-black" style={{ color: COLORS.fg4 }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map(tag => (
              <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>{tag}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
