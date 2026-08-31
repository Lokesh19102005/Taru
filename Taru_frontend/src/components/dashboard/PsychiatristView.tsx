import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, Clock, Video } from 'lucide-react'
import COLORS from '../../lib/theme'
import { fetchAllPsychiatrists } from '../../api/psychiatrist'
import { getAvailabilityForPsychiatrist } from '../../api/availability'
import { bookAppointment, getMyAppointments } from '../../api/appointment'
import { joinAppointment } from '../../api/meeting'
import { Psychiatrist, AvailabilityData, Slot, Appointment } from '../../types'

const statusColors: Record<string, { bg: string; text: string }> = {
  requested: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  completed: { bg: '#DBEAFE', text: '#1E40AF' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  no_show:   { bg: '#F3F4F6', text: '#6B7280' },
}

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

const isJoinWindowOpen = (_appt: Appointment) => {
  // Allow joining anytime — no time-window restriction
  return true
}

export default function PsychiatristView() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [doctors, setDoctors] = useState<Psychiatrist[]>([])
  const [loading, setLoading] = useState(true)
  
  // Booking state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [availability, setAvailability] = useState<AvailabilityData | null>(null)
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [reason, setReason] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppts, setLoadingAppts] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const fetchAppts = () => {
    setLoadingAppts(true)
    getMyAppointments()
      .then(res => { if (res.success) setAppointments(res.data) })
      .catch(console.error)
      .finally(() => setLoadingAppts(false))
  }

  useEffect(() => {
    fetchAllPsychiatrists()
      .then(res => {
        if (res.success) {
          setDoctors(res.data)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    fetchAppts()
  }, [])

  useEffect(() => {
    if (step === 2 && selectedId) {
      setLoadingAvail(true)
      getAvailabilityForPsychiatrist(selectedId, date)
        .then(res => {
          if (res.success) {
            setAvailability(res.data)
          } else {
            setAvailability(null)
          }
        })
        .finally(() => setLoadingAvail(false))
    }
  }, [step, selectedId, date])

  const handleDoctorSelect = (id: string) => {
    setSelectedId(id)
    setStep(2)
    setSelectedSlot(null)
    setDate(new Date().toISOString().split('T')[0])
  }

  const handleBook = async () => {
    if (!selectedId || !availability || !selectedSlot) return
    setBookingLoading(true)
    const res = await bookAppointment({
      psychiatristId: selectedId,
      availabilityId: availability._id,
      date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      reason
    })
    setBookingLoading(false)
    if (res.success) {
      setStep(4)
      fetchAppts()
    }
  }

  const resetAll = () => {
    setStep(1)
    setSelectedId(null)
    setSelectedSlot(null)
    setAvailability(null)
    setReason('')
  }

  const doc = doctors.find(d => d._id === selectedId)

  if (step === 4) {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="rounded-2xl p-8 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <CheckCircle size={32} className="mx-auto mb-4" style={{ color: COLORS.fg }} />
          <h2 className="text-xl font-extrabold mb-2" style={{ color: COLORS.fg }}>Session Requested!</h2>
          <p className="text-sm mb-2" style={{ color: COLORS.fg2 }}>
            Your session with <strong style={{ color: COLORS.fg }}>{doc?.name}</strong> on <strong style={{ color: COLORS.fg }}>{new Date(date).toLocaleDateString()}</strong> at <strong style={{ color: COLORS.fg }}>{selectedSlot ? formatTime(selectedSlot.startTime) : ''}</strong> has been requested.
          </p>
          <p className="text-xs mb-6" style={{ color: COLORS.fg3 }}>
            Your psychiatrist will confirm your session shortly.
          </p>
          <button onClick={resetAll} className="text-sm hover:underline" style={{ color: COLORS.fg3 }}>← Back to psychiatrists</button>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="max-w-md mx-auto space-y-4 animate-fade-in">
        <button onClick={() => setStep(2)} className="text-sm hover:underline" style={{ color: COLORS.fg3 }}>← Back</button>
        <div className="rounded-2xl p-6 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.fg }}>Confirm Details</h2>
          <div className="bg-gray-50 rounded-xl p-4 mb-4 border" style={{ borderColor: COLORS.border }}>
            <div className="text-sm font-bold mb-1" style={{ color: COLORS.fg }}>{doc?.name}</div>
            <div className="text-xs" style={{ color: COLORS.fg2 }}>
              {new Date(date).toLocaleDateString()} • {selectedSlot ? `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}` : ''}
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-xs font-bold mb-2" style={{ color: COLORS.fg }}>Reason for visit (Optional)</label>
            <textarea 
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Academic stress, anxiety..."
              className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-black resize-none"
              style={{ borderColor: COLORS.border, background: COLORS.bg }}
              rows={3}
            />
          </div>

          <button 
            disabled={bookingLoading} 
            onClick={handleBook}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: COLORS.primary, color: '#fff' }}>
            {bookingLoading ? 'Requesting...' : 'Book Session'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 2 && doc) {
    const unbookedSlots = availability?.slots.filter(s => !s.isBooked) || []

    return (
      <div className="max-w-md mx-auto space-y-4 animate-fade-in">
        <button onClick={() => setStep(1)} className="text-sm hover:underline" style={{ color: COLORS.fg3 }}>← Back to all doctors</button>
        <div className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold" style={{ background: COLORS.muted, color: COLORS.fg }}>{doc.name ? doc.name[0] : 'D'}</div>
            <div>
              <div className="font-bold text-sm" style={{ color: COLORS.fg }}>{doc.name}</div>
              <div className="text-xs" style={{ color: COLORS.fg3 }}>{doc.qualification}</div>
              <div className="text-xs mt-0.5" style={{ color: COLORS.fg2 }}>{doc.experience ? `${doc.experience} yrs exp` : ''}</div>
            </div>
          </div>

          <div className="mb-5 border-t pt-4" style={{ borderColor: COLORS.border }}>
            <label className="block text-sm font-bold mb-2" style={{ color: COLORS.fg }}>Select Date</label>
            <input 
              type="date" 
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setDate(e.target.value)
                setSelectedSlot(null)
              }}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: COLORS.border, color: COLORS.fg, background: COLORS.bg }}
            />
          </div>

          <h3 className="text-sm font-bold mb-3" style={{ color: COLORS.fg }}>Available Times</h3>
          
          {loadingAvail ? (
            <div className="text-center py-6 text-sm" style={{ color: COLORS.fg3 }}>Loading availability...</div>
          ) : !availability ? (
            <div className="text-center py-6 text-sm bg-gray-50 rounded-xl" style={{ color: COLORS.fg3 }}>
              This psychiatrist hasn't set availability for this date
            </div>
          ) : unbookedSlots.length === 0 ? (
            <div className="text-center py-6 text-sm bg-gray-50 rounded-xl" style={{ color: COLORS.fg3 }}>
              No available slots for this date
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-5">
              {unbookedSlots.map((s, i) => {
                const isSelected = selectedSlot?.startTime === s.startTime
                return (
                  <button key={i} onClick={() => setSelectedSlot(s)}
                    className="py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all"
                    style={{ 
                      borderColor: isSelected ? COLORS.primary : COLORS.border, 
                      background: isSelected ? COLORS.primary : 'transparent', 
                      color: isSelected ? '#fff' : COLORS.fg 
                    }}>
                    {formatTime(s.startTime)} - {formatTime(s.endTime)}
                  </button>
                )
              })}
            </div>
          )}

          <button 
            disabled={!selectedSlot} 
            onClick={() => setStep(3)}
            className="w-full mt-4 py-3 rounded-xl font-bold text-sm disabled:opacity-30 transition-all hover:opacity-80 flex items-center justify-center gap-2"
            style={{ background: COLORS.primary, color: '#fff' }}>
            Continue <ChevronRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  // Step 1
  return (
    <div className="max-w-xl mx-auto space-y-4 animate-fade-in">
      <div className="mb-1">
        <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Book a session</h2>
        <p className="text-xs mt-0.5" style={{ color: COLORS.fg3 }}>All practitioners are independent, certified professionals — not affiliated with your college.</p>
      </div>
      {loading ? (
        <div className="text-center py-8 text-sm" style={{ color: COLORS.fg3 }}>Loading psychiatrists...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: COLORS.fg3 }}>No psychiatrists available yet</div>
      ) : doctors.map(doc => (
        <div key={doc._id} onClick={() => handleDoctorSelect(doc._id)}
          className="rounded-2xl p-5 border cursor-pointer card-hover hover:border-teal-400 hover:shadow-sm transition-all group"
          style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: COLORS.muted, color: COLORS.fg }}>{doc.name ? doc.name[0] : 'D'}</div>
            <div className="flex-1">
              <div className="font-bold text-sm" style={{ color: COLORS.fg }}>{doc.name}</div>
              <div className="text-xs" style={{ color: COLORS.fg3 }}>{doc.qualification}</div>
              <div className="text-xs mt-0.5" style={{ color: COLORS.fg2 }}>{doc.experience ? `${doc.experience} yrs exp` : ''}</div>
            </div>
            <ChevronRight size={14} className="shrink-0 mt-1 group-hover:text-teal-600" style={{ color: COLORS.fg4 }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {doc.specialization?.map(tag => (
              <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>{tag}</span>
            ))}
          </div>
        </div>
      ))}

      {/* My Sessions */}
      {!loading && appointments.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} style={{ color: COLORS.fg }} />
            <h3 className="text-lg font-extrabold" style={{ color: COLORS.fg }}>My Sessions</h3>
          </div>
          <div className="space-y-3">
            {loadingAppts ? (
              <div className="text-center py-4 text-sm" style={{ color: COLORS.fg3 }}>Loading...</div>
            ) : appointments.map(appt => {
              const doc = typeof appt.psychiatristId === 'object' ? appt.psychiatristId : null
              const colors = statusColors[appt.status] || statusColors.requested
              return (
                <div key={appt._id} className="rounded-2xl p-4 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: COLORS.muted, color: COLORS.fg }}>
                        {doc?.name?.[0] || 'D'}
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: COLORS.fg }}>{doc?.name || 'Doctor'}</div>
                        <div className="text-xs" style={{ color: COLORS.fg3 }}>{doc?.qualification || ''}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                      style={{ background: colors.bg, color: colors.text }}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: COLORS.fg2 }}>
                    {new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                  </div>
                  {appt.reason && (
                    <div className="text-xs mt-1" style={{ color: COLORS.fg3 }}>Reason: {appt.reason}</div>
                  )}
                  {appt.status === 'confirmed' && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={async () => {
                          setJoiningId(appt._id)
                          try {
                            const res = await joinAppointment(appt._id)
                            if (res.success && res.meetingId) {
                              navigate(`/meeting/${res.meetingId}`)
                            } else if (res.success && res.data?.meetingId) {
                              navigate(`/meeting/${res.data.meetingId}`)
                            }
                          } catch (e) {
                            console.error(e)
                          } finally {
                            setJoiningId(null)
                          }
                        }}
                        disabled={!isJoinWindowOpen(appt) || joiningId === appt._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: COLORS.primary, color: '#fff' }}
                      >
                        <Video size={14} />
                        {joiningId === appt._id ? 'Joining...' : isJoinWindowOpen(appt) ? 'Join Session' : 'Outside Join Window'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
