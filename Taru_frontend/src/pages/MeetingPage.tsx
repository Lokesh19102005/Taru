import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Loader2, ShieldX, CheckCircle, ArrowLeft, Clock, Users, MoreVertical, Brain, MessageSquare } from 'lucide-react'
import { verifyMeeting, updateMeetingLifecycle } from '../api/meeting'
import { useWebRTC } from '../hooks/useWebRTC'
import MoodHistoryPanel from '../components/MoodHistoryPanel'
import MeetingChatPanel, { type ChatMessage } from '../components/MeetingChatPanel'

type MeetingState = 'loading' | 'denied' | 'lobby' | 'connecting' | 'waiting' | 'connected' | 'ended'

export default function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  
  const [meetingState, setMeetingState] = useState<MeetingState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [participantInfo, setParticipantInfo] = useState<{ role: string; name: string } | null>(null)
  const [duration, setDuration] = useState(0)
  const [isRemoteCameraOn, setIsRemoteCameraOn] = useState(true)
  const [isMoodPanelOpen, setIsMoodPanelOpen] = useState(false)
  const [myRole, setMyRole] = useState<string>('')
  const [otherParticipantName, setOtherParticipantName] = useState<string>('')
  const [myName, setMyName] = useState<string>('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [unreadChat, setUnreadChat] = useState(0)
  const meetingStateRef = useRef<MeetingState>('loading')
  const chatOpenRef = useRef(false)
  
  useEffect(() => { meetingStateRef.current = meetingState }, [meetingState])
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const lobbyVideoRef = useRef<HTMLVideoElement>(null)
  
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

  const onMediaStateChange = useCallback((state: { video: boolean; audio: boolean }) => {
    setIsRemoteCameraOn(state.video)
  }, [])

  const onChatMessage = useCallback((msg: { message: string; senderName: string; timestamp: number }) => {
    const newMsg: ChatMessage = {
      id: `${msg.timestamp}-${Math.random()}`,
      message: msg.message,
      senderName: msg.senderName,
      timestamp: msg.timestamp,
      isSelf: false
    }
    setChatMessages(prev => [...prev, newMsg])
    // Increment unread if chat panel is closed
    if (!chatOpenRef.current) {
      setUnreadChat(prev => prev + 1)
    }
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
    leaveMeeting,
    sendChatMessage
  } = useWebRTC({
    meetingId: meetingId || '',
    token,
    onParticipantJoined,
    onParticipantLeft,
    onError,
    onMediaStateChange,
    onChatMessage
  })

  // Verify meeting on mount
  useEffect(() => {
    if (!meetingId) return
    verifyMeeting(meetingId)
      .then(res => {
        if (res.success) {
          setMeetingState('lobby')
          setMyRole(res.participant?.role || '')
          setOtherParticipantName(res.otherParticipant?.name || '')
          setMyName(res.participant?.name || 'You')
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

  // Attach local stream to lobby video
  useEffect(() => {
    if (lobbyVideoRef.current && localStream) {
      lobbyVideoRef.current.srcObject = localStream
    }
  }, [localStream, meetingState, isCameraOn])

  // Attach local stream to in-call self-preview
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, meetingState, isCameraOn])

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(() => {
        console.log('[MeetingPage] Remote video autoplay blocked')
      })
    }
  }, [remoteStream, meetingState])

  // Listen for track additions on remote stream
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

  const getInitial = (name?: string) => (name?.[0] || '?').toUpperCase()

  const handleSendChat = (message: string) => {
    sendChatMessage(message, myName)
    const selfMsg: ChatMessage = {
      id: `${Date.now()}-self-${Math.random()}`,
      message,
      senderName: myName,
      timestamp: Date.now(),
      isSelf: true
    }
    setChatMessages(prev => [...prev, selfMsg])
  }

  const handleToggleChat = () => {
    setIsChatOpen(prev => {
      const next = !prev
      chatOpenRef.current = next
      if (next) setUnreadChat(0)
      return next
    })
  }

  // ─── LOADING ───
  if (meetingState === 'loading') {
    return (
      <div className="h-screen bg-[#202124] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4 text-blue-400" size={40} />
        <p className="text-[#e8eaed] text-lg">Verifying access...</p>
      </div>
    )
  }

  // ─── DENIED ───
  if (meetingState === 'denied') {
    return (
      <div className="h-screen bg-[#202124] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-[#303134] rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <ShieldX size={56} className="text-red-400 mx-auto mb-5" />
          <h2 className="text-2xl font-semibold mb-3 text-[#e8eaed]">Can't join this meeting</h2>
          <p className="text-[#9aa0a6] mb-8 text-sm leading-relaxed">{errorMsg}</p>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#8ab4f8] text-[#202124] rounded-full font-semibold mx-auto hover:bg-[#aecbfa] transition-colors"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    )
  }

  // ─── ENDED ───
  if (meetingState === 'ended') {
    return (
      <div className="h-screen bg-[#202124] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-[#303134] rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <CheckCircle size={56} className="text-green-400 mx-auto mb-5" />
          <h2 className="text-2xl font-semibold mb-2 text-[#e8eaed]">Session ended</h2>
          <p className="text-[#9aa0a6] text-sm mb-2">Your consultation session has ended</p>
          {errorMsg && <p className="text-[#9aa0a6] mb-4 text-xs">{errorMsg}</p>}
          {duration > 0 && (
            <div className="flex items-center justify-center gap-2 text-[#e8eaed] my-5 bg-[#202124] py-3 px-4 rounded-xl">
              <Clock size={16} className="text-[#8ab4f8]" />
              <span className="text-sm font-medium">Duration: {formatDuration(duration)}</span>
            </div>
          )}
          <button 
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-[#8ab4f8] text-[#202124] rounded-full font-semibold hover:bg-[#aecbfa] transition-colors mt-2"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ─── LOBBY (Google Meet style) ───
  if (meetingState === 'lobby') {
    return (
      <div className="h-screen bg-[#202124] flex items-center justify-center p-4 sm:p-8">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 max-w-5xl w-full">
          
          {/* Video Preview */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="relative aspect-video bg-[#3c4043] rounded-2xl overflow-hidden shadow-2xl">
              {localStream && isCameraOn ? (
                <video 
                  ref={lobbyVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-[#5f6368] flex items-center justify-center mb-3">
                    <CameraOff size={36} className="text-[#dadce0]" />
                  </div>
                  <p className="text-[#9aa0a6] text-sm">
                    {localStream ? 'Camera is off' : 'Requesting camera access...'}
                  </p>
                </div>
              )}
              
              {/* Lobby Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button 
                  onClick={toggleMic}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isMicOn 
                      ? 'bg-[#3c4043] hover:bg-[#4a4d51] text-white' 
                      : 'bg-[#ea4335] hover:bg-[#d33828] text-white'
                    }`}
                >
                  {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button 
                  onClick={toggleCamera}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isCameraOn 
                      ? 'bg-[#3c4043] hover:bg-[#4a4d51] text-white' 
                      : 'bg-[#ea4335] hover:bg-[#d33828] text-white'
                    }`}
                >
                  {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Join Panel */}
          <div className="flex flex-col items-center text-center lg:w-80">
            <h1 className="text-[#e8eaed] text-2xl sm:text-3xl font-normal mb-3">Ready to join?</h1>
            <p className="text-[#9aa0a6] text-sm mb-8">Check your audio and video before joining</p>
            <button 
              onClick={handleJoin}
              className="px-10 py-3.5 bg-[#8ab4f8] text-[#202124] rounded-full font-semibold text-base hover:bg-[#aecbfa] hover:shadow-lg transition-all"
            >
              Join now
            </button>
            <p className="text-[#9aa0a6] text-xs mt-6 flex items-center gap-1.5">
              <Users size={14} />
              1-on-1 private session
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── IN-CALL (connecting, waiting, connected) — Google Meet Layout ───
  return (
    <div className="h-screen bg-[#202124] flex flex-col overflow-hidden select-none">
      
      {/* ── Top Bar ── */}
      <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 bg-[#202124] z-10">
        {/* Left: Meeting info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-[#e8eaed] text-sm font-medium truncate">
              {participantInfo ? participantInfo.name : (meetingState === 'waiting' ? 'Waiting for participant...' : 'Connecting...')}
            </span>
            {meetingState === 'connected' && (
              <span className="text-[#9aa0a6] text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34a853]" />
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>
        
        {/* Right: Meeting ID badge */}
        <div className="hidden sm:flex items-center gap-2">
          {meetingState === 'connected' && (
            <span className="text-xs text-[#9aa0a6] bg-[#303134] px-3 py-1.5 rounded-full">
              In session
            </span>
          )}
          {/* Mood History button - psychiatrist only */}
          {myRole === 'psychiatrist' && (meetingState === 'connected' || meetingState === 'waiting') && (
            <button 
              onClick={() => setIsMoodPanelOpen(true)}
              title="View student mood history"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isMoodPanelOpen 
                  ? 'bg-[#8ab4f8]/20 text-[#8ab4f8]' 
                  : 'text-[#9aa0a6] hover:bg-[#3c4043]'
              }`}
            >
              <Brain size={20} />
            </button>
          )}
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* ── Video Area ── */}
      <div className="flex-1 px-2 sm:px-4 pb-2 min-h-0">
        <div className="w-full h-full relative flex items-center justify-center">
          
          {/* Waiting / Connecting State */}
          {(meetingState === 'waiting' || meetingState === 'connecting') && (
            <div className="w-full h-full bg-[#3c4043] rounded-2xl flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-[#5f6368] flex items-center justify-center mb-6">
                <Loader2 className="animate-spin text-[#e8eaed]" size={32} />
              </div>
              <p className="text-[#e8eaed] text-lg font-medium mb-2">
                {meetingState === 'connecting' ? 'Connecting...' : 'Waiting for others to join'}
              </p>
              <p className="text-[#9aa0a6] text-sm">You'll be connected automatically</p>
            </div>
          )}

          {/* Connected State */}
          {meetingState === 'connected' && (
            <>
              {/* Remote Video (main view) */}
              <div className="w-full h-full bg-[#3c4043] rounded-2xl overflow-hidden relative">
                {/* Always keep video element mounted for stream continuity */}
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className={`w-full h-full object-contain bg-[#202124] ${
                    remoteStream && isRemoteCameraOn ? '' : 'hidden'
                  }`}
                />

                {/* Show avatar when camera is off or no stream */}
                {(!remoteStream || !isRemoteCameraOn) && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#3c4043]">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[#669df6] flex items-center justify-center text-white text-4xl sm:text-5xl font-medium shadow-lg">
                      {getInitial(participantInfo?.name)}
                    </div>
                    <p className="text-[#e8eaed] text-base font-medium mt-4">{participantInfo?.name}</p>
                    {!isRemoteCameraOn && remoteStream && (
                      <p className="text-[#9aa0a6] text-xs mt-1 flex items-center gap-1.5">
                        <CameraOff size={12} /> Camera is off
                      </p>
                    )}
                  </div>
                )}

                {/* Remote participant name tag (shown only when video is visible) */}
                {remoteStream && isRemoteCameraOn && (
                  <div className="absolute bottom-3 left-3 bg-[#202124]/70 backdrop-blur-sm px-3 py-1 rounded-md">
                    <span className="text-[#e8eaed] text-xs font-medium">{participantInfo?.name || 'Participant'}</span>
                  </div>
                )}
              </div>

              {/* Self Preview (Picture-in-Picture) */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-[140px] h-[105px] sm:w-[200px] sm:h-[150px] bg-[#3c4043] rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/20 transition-all hover:ring-2 hover:ring-[#8ab4f8]/40 cursor-pointer">
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
                  <div className="w-full h-full flex items-center justify-center bg-[#3c4043]">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#669df6] flex items-center justify-center text-white text-lg font-medium">
                      You
                    </div>
                  </div>
                )}
                {/* Self name tag */}
                <div className="absolute bottom-1.5 left-1.5 bg-[#202124]/70 backdrop-blur-sm px-2 py-0.5 rounded">
                  <span className="text-[#e8eaed] text-[10px] font-medium">You</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Controls Bar (Google Meet style) ── */}
      <div className="h-20 flex-shrink-0 flex items-center justify-center px-4 bg-[#202124]">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mic Toggle */}
          <button 
            onClick={toggleMic}
            title={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all
              ${isMicOn 
                ? 'bg-[#3c4043] hover:bg-[#4a4d51] text-[#e8eaed]' 
                : 'bg-[#ea4335] hover:bg-[#d33828] text-white'
              }`}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          
          {/* Camera Toggle */}
          <button 
            onClick={toggleCamera}
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all
              ${isCameraOn 
                ? 'bg-[#3c4043] hover:bg-[#4a4d51] text-[#e8eaed]' 
                : 'bg-[#ea4335] hover:bg-[#d33828] text-white'
              }`}
          >
            {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>

          {/* Mood History - psychiatrist only */}
          {myRole === 'psychiatrist' && (
            <button 
              onClick={() => setIsMoodPanelOpen(v => !v)}
              title="Student mood history"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${isMoodPanelOpen 
                  ? 'bg-[#8ab4f8] text-[#202124]' 
                  : 'bg-[#3c4043] hover:bg-[#4a4d51] text-[#e8eaed]'
                }`}
            >
              <Brain size={20} />
            </button>
          )}

          {/* Chat */}
          <button 
            onClick={handleToggleChat}
            title="Chat"
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative
              ${isChatOpen 
                ? 'bg-[#8ab4f8] text-[#202124]' 
                : 'bg-[#3c4043] hover:bg-[#4a4d51] text-[#e8eaed]'
              }`}
          >
            <MessageSquare size={20} />
            {unreadChat > 0 && !isChatOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#ea4335] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadChat > 9 ? '9+' : unreadChat}
              </span>
            )}
          </button>

          {/* Spacer */}
          <div className="w-px h-8 bg-[#5f6368]/50 mx-1 hidden sm:block" />

          {/* End Call */}
          <button 
            onClick={handleEndCall}
            title="Leave call"
            className="h-12 px-5 sm:px-8 rounded-full bg-[#ea4335] hover:bg-[#d33828] text-white flex items-center gap-2 font-medium transition-all hover:shadow-lg"
          >
            <PhoneOff size={20} />
            <span className="hidden sm:inline text-sm">Leave</span>
          </button>
        </div>
      </div>

      {/* Mood History Panel (psychiatrist only) */}
      {myRole === 'psychiatrist' && meetingId && (
        <MoodHistoryPanel
          meetingId={meetingId}
          studentName={otherParticipantName || participantInfo?.name || 'Student'}
          isOpen={isMoodPanelOpen}
          onClose={() => setIsMoodPanelOpen(false)}
        />
      )}

      {/* Chat Panel */}
      <MeetingChatPanel
        isOpen={isChatOpen}
        onClose={() => { setIsChatOpen(false); chatOpenRef.current = false }}
        messages={chatMessages}
        onSend={handleSendChat}
        unreadCount={unreadChat}
      />
    </div>
  )
}
