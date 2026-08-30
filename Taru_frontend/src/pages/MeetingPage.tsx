import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Loader2, ShieldX, CheckCircle, ArrowLeft, Clock } from 'lucide-react'
import { verifyMeeting, updateMeetingLifecycle } from '../api/meeting'
import { useWebRTC } from '../hooks/useWebRTC'

type MeetingState = 'loading' | 'denied' | 'lobby' | 'connecting' | 'waiting' | 'connected' | 'ended'

export default function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  
  const [meetingState, setMeetingState] = useState<MeetingState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [participantInfo, setParticipantInfo] = useState<{ role: string; name: string } | null>(null)
  const [duration, setDuration] = useState(0)
  const meetingStateRef = useRef<MeetingState>('loading')
  
  // Keep ref in sync with state to avoid stale closure in setTimeout
  useEffect(() => { meetingStateRef.current = meetingState }, [meetingState])
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const token = localStorage.getItem('taru_token') || ''

  const onParticipantJoined = useCallback((info: { role: string; name: string }) => {
    setParticipantInfo(info)
    setMeetingState('connected')
    if (meetingId) {
      updateMeetingLifecycle(meetingId, 'start').catch(console.error)
    }
  }, [meetingId])

  const onParticipantLeft = useCallback(() => {
    setMeetingState('ended')
    setErrorMsg('The other participant has left the session.')
  }, [])

  const onError = useCallback((err: string) => {
    setMeetingState('denied')
    setErrorMsg(err)
  }, [])
  
  const {
    localStream,
    remoteStream,
    isMicOn,
    isCameraOn,
    toggleMic,
    toggleCamera,
    startLocalStream,
    joinMeeting,
    leaveMeeting
  } = useWebRTC({
    meetingId: meetingId || '',
    token,
    onParticipantJoined,
    onParticipantLeft,
    onError
  })

  // Verify meeting on mount — only run once
  useEffect(() => {
    if (!meetingId) return
    verifyMeeting(meetingId)
      .then(res => {
        if (res.success) {
          setMeetingState('lobby')
          startLocalStream().catch(console.error)
        } else {
          setMeetingState('denied')
          setErrorMsg(res.message || res.error || 'Access denied')
        }
      })
      .catch(() => {
        setMeetingState('denied')
        setErrorMsg('Failed to verify meeting access')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId])

  // Attach local stream to video element whenever stream or view changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, meetingState, isCameraOn])

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      // Always re-assign to ensure latest tracks are used
      remoteVideoRef.current.srcObject = remoteStream
      // Some browsers block autoplay; explicitly call play()
      remoteVideoRef.current.play().catch(() => {
        console.log('[MeetingPage] Remote video autoplay blocked, will play on interaction')
      })
    }
  }, [remoteStream, meetingState])

  // Also listen for track additions on the remote stream
  useEffect(() => {
    if (!remoteStream) return
    const handleTrackAdded = () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
    }
    remoteStream.addEventListener('addtrack', handleTrackAdded)
    return () => remoteStream.removeEventListener('addtrack', handleTrackAdded)
  }, [remoteStream])

  // Duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (meetingState === 'connected') {
      interval = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [meetingState])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleJoin = () => {
    setMeetingState('connecting')
    joinMeeting()
    // Transition to "waiting" after 1 second if not already connected
    setTimeout(() => {
      if (meetingStateRef.current === 'connecting') {
        setMeetingState('waiting')
      }
    }, 1000)
  }

  const handleEndCall = () => {
    leaveMeeting()
    if (meetingId) {
      updateMeetingLifecycle(meetingId, 'end').catch(console.error)
    }
    setMeetingState('ended')
  }

  // ─── LOADING ───
  if (meetingState === 'loading') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Verifying access...</p>
      </div>
    )
  }

  // ─── DENIED ───
  if (meetingState === 'denied') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-white p-4">
        <ShieldX size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-6 text-center">{errorMsg}</p>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-semibold"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    )
  }

  // ─── ENDED ───
  if (meetingState === 'ended') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-[#2a2a2a] p-8 rounded-2xl max-w-sm w-full text-center border border-[#3a3a3a]">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Session Ended</h2>
          {errorMsg && <p className="text-gray-400 mb-4 text-sm">{errorMsg}</p>}
          {duration > 0 && (
            <div className="flex items-center justify-center gap-2 text-gray-300 mb-6 bg-[#1a1a1a] py-2 rounded-lg">
              <Clock size={16} />
              <span>Duration: {formatDuration(duration)}</span>
            </div>
          )}
          <button 
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-white text-black rounded-full font-bold transition-opacity hover:opacity-90"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ─── LOBBY ───
  if (meetingState === 'lobby') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl w-full">
          <div className="bg-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl border border-[#3a3a3a]">
            <div className="aspect-video bg-black relative flex items-center justify-center">
              {localStream && isCameraOn ? (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <CameraOff size={48} className="mb-2" />
                  <p>{localStream ? 'Camera is off' : 'Requesting camera access...'}</p>
                </div>
              )}
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button 
                  onClick={toggleMic}
                  className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-[#3a3a3a] text-white hover:bg-[#4a4a4a]' : 'bg-red-500 text-white'}`}
                >
                  {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button 
                  onClick={toggleCamera}
                  className={`p-4 rounded-full transition-colors ${isCameraOn ? 'bg-[#3a3a3a] text-white hover:bg-[#4a4a4a]' : 'bg-red-500 text-white'}`}
                >
                  {isCameraOn ? <Camera size={24} /> : <CameraOff size={24} />}
                </button>
              </div>
            </div>
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-white mb-6">Ready to join?</h2>
              <button 
                onClick={handleJoin}
                className="px-8 py-3 bg-white text-black rounded-full font-bold text-lg transition-transform hover:scale-105"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── IN-CALL (connecting, waiting, connected) ───
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="text-white">
          <div className="font-semibold text-lg drop-shadow-md">
            {participantInfo ? participantInfo.name : (meetingState === 'waiting' ? 'Waiting...' : 'Connecting...')}
          </div>
          {meetingState === 'connected' && (
            <div className="text-sm text-gray-300 flex items-center gap-1 drop-shadow-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatDuration(duration)}
            </div>
          )}
        </div>
      </div>

      {/* Main Remote Video / Waiting */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center">
        {meetingState === 'waiting' || meetingState === 'connecting' ? (
          <div className="text-white text-center">
            <Loader2 className="animate-spin mx-auto mb-4" size={48} />
            <p className="text-xl animate-pulse">{meetingState === 'connecting' ? 'Connecting to session...' : 'Waiting for others to join...'}</p>
          </div>
        ) : remoteStream ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white">
            <div className="w-32 h-32 rounded-full bg-[#3a3a3a] flex items-center justify-center text-4xl font-bold mb-4">
              {participantInfo?.name?.[0] || '?'}
            </div>
          </div>
        )}
      </div>

      {/* Self Preview */}
      <div className="absolute bottom-24 right-4 z-10 w-[160px] h-[120px] sm:w-[200px] sm:h-[150px] bg-[#1a1a1a] rounded-xl overflow-hidden border-2 border-[#3a3a3a] shadow-lg">
        {localStream && isCameraOn ? (
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover" 
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a] text-gray-500">
            <CameraOff size={24} />
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl border border-[#3a3a3a]">
          <button 
            onClick={toggleMic}
            className={`p-3 rounded-full transition-colors ${isMicOn ? 'bg-white text-black hover:bg-gray-200' : 'bg-red-500 text-white'}`}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          
          <button 
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
          >
            <PhoneOff size={24} />
          </button>

          <button 
            onClick={toggleCamera}
            className={`p-3 rounded-full transition-colors ${isCameraOn ? 'bg-white text-black hover:bg-gray-200' : 'bg-red-500 text-white'}`}
          >
            {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>
        </div>
      </div>
    </div>
  )
}
