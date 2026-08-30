import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video } from 'lucide-react'
import { COLORS } from '../../lib/theme'
import { getPsychiatristAppointments, updateAppointmentStatus } from '../../api/appointment'
import { joinAppointment } from '../../api/meeting'
import { Appointment } from '../../types'

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

export default function PsychiatristAppointmentsView() {
  const navigate = useNavigate()
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const fetchAppointments = async () => {
    setLoading(true)
    const res = await getPsychiatristAppointments(date)
    if (res.success) {
      setAppointments(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
  }, [date])

  const handleAction = async (id: string, status: string) => {
    await updateAppointmentStatus(id, status)
    fetchAppointments()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6" style={{ color: COLORS.fg }}>Appointments</h1>
      
      <div className="mb-6 flex items-center gap-4">
        <label className="font-bold text-sm" style={{ color: COLORS.fg }}>Date:</label>
        <input 
          type="date" 
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ borderColor: COLORS.border, color: COLORS.fg }}
        />
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm" style={{ color: COLORS.fg3 }}>Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl p-10 border text-center text-sm" style={{ background: COLORS.card, borderColor: COLORS.border, color: COLORS.fg3 }}>
          No appointments for this date.
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map(appt => {
            const studentName = typeof appt.studentId === 'object' ? appt.studentId.username : 'Unknown Student'
            
            return (
              <div key={appt._id} className="rounded-xl p-5 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-base" style={{ color: COLORS.fg }}>{studentName}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColor(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold mb-1" style={{ color: COLORS.fg2 }}>
                    {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                  </div>
                  {appt.reason && (
                    <div className="text-xs mt-2" style={{ color: COLORS.fg3 }}>
                      <span className="font-semibold">Reason:</span> {appt.reason}
                    </div>
                  )}
                </div>
                
                {appt.status === 'requested' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleAction(appt._id, 'confirmed')}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleAction(appt._id, 'cancelled')}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {appt.status === 'confirmed' && (
                  <div className="flex items-center gap-2 shrink-0 mt-3 md:mt-0">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-opacity disabled:opacity-50"
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
      )}
    </div>
  )
}
