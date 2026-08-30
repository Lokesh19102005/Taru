import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getTurnCredentials } from '../api/meeting'

const API_URL = import.meta.env.VITE_API_URL || window.location.origin

export interface UseWebRTCOptions {
  meetingId: string
  token: string
  onParticipantJoined?: (info: { role: string; name: string }) => void
  onParticipantLeft?: () => void
  onError?: (error: string) => void
}

export function useWebRTC({ meetingId, token, onParticipantJoined, onParticipantLeft, onError }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRemoteConnected, setIsRemoteConnected] = useState(false)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)

  // Use refs for everything accessed inside socket/WebRTC callbacks to avoid stale closures
  const localStreamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const iceServersRef = useRef<RTCIceServer[]>([])
  const callbacksRef = useRef({ onParticipantJoined, onParticipantLeft, onError })

  // Queue for ICE candidates that arrive before remote description is set
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  // Flag to know when remote description has been set
  const remoteDescSetRef = useRef(false)

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = { onParticipantJoined, onParticipantLeft, onError }
  }, [onParticipantJoined, onParticipantLeft, onError])

  // Fetch TURN credentials once
  useEffect(() => {
    getTurnCredentials().then(res => {
      if (res?.iceServers) {
        iceServersRef.current = res.iceServers
        console.log('[WebRTC] Loaded TURN credentials:', res.iceServers.length, 'servers')
      }
    }).catch(() => {
      // Fallback to Google STUN only
      iceServersRef.current = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
      console.log('[WebRTC] Using fallback STUN servers')
    })
  }, [])

  const startLocalStream = useCallback(async (video = true, audio = true): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio })
      localStreamRef.current = stream
      setLocalStream(stream)
      setIsMicOn(audio)
      setIsCameraOn(video)
      console.log('[WebRTC] Local stream acquired:', stream.getTracks().map(t => `${t.kind}:${t.id}`))
      return stream
    } catch (err) {
      console.warn('[WebRTC] getUserMedia failed, trying audio only:', err)
      if (video) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
          localStreamRef.current = audioOnly
          setLocalStream(audioOnly)
          setIsMicOn(true)
          setIsCameraOn(false)
          return audioOnly
        } catch {
          console.warn('[WebRTC] Audio-only also failed')
        }
      }
      return null
    }
  }, [])

  const stopLocalStream = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }
  }, [])

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMicOn(audioTrack.enabled)
      }
    }
  }, [])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCameraOn(videoTrack.enabled)
      }
    }
  }, [])

  const closePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    pendingIceCandidatesRef.current = []
    remoteDescSetRef.current = false
  }, [])

  // Helper: flush any queued ICE candidates once remote description is set
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc) return

    const candidates = pendingIceCandidatesRef.current
    pendingIceCandidatesRef.current = []

    console.log(`[WebRTC] Flushing ${candidates.length} queued ICE candidates`)
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.warn('[WebRTC] Failed to add queued ICE candidate:', e)
      }
    }
  }, [])

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    // Close existing if any
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    // Reset state for new connection
    pendingIceCandidatesRef.current = []
    remoteDescSetRef.current = false

    const config: RTCConfiguration = {
      iceServers: iceServersRef.current.length > 0
        ? iceServersRef.current
        : [{ urls: 'stun:stun.l.google.com:19302' }]
    }

    const pc = new RTCPeerConnection(config)
    console.log('[WebRTC] PeerConnection created with', config.iceServers?.length, 'ICE servers')

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('[WebRTC] Sending ICE candidate:', event.candidate.candidate?.substring(0, 50))
        socketRef.current.emit('meeting:ice-candidate', { meetingId, candidate: event.candidate })
      }
    }

    pc.ontrack = (event) => {
      console.log('[WebRTC] ★ Remote track received:', event.track.kind, 'readyState:', event.track.readyState)
      if (event.streams?.[0]) {
        console.log('[WebRTC] ★ Setting remote stream with', event.streams[0].getTracks().length, 'tracks')
        setRemoteStream(event.streams[0])
        setIsRemoteConnected(true)
      } else {
        // Some browsers don't always include streams; create one from the track
        console.log('[WebRTC] No stream in ontrack, creating MediaStream from track')
        setRemoteStream(prev => {
          const stream = prev || new MediaStream()
          stream.addTrack(event.track)
          return stream
        })
        setIsRemoteConnected(true)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState)
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('[WebRTC] Connection state:', state)
      setIsConnected(state === 'connected')
      if (state === 'disconnected' || state === 'failed') {
        setIsRemoteConnected(false)
      }
    }

    pc.onnegotiationneeded = () => {
      console.log('[WebRTC] Negotiation needed (ignored — manual negotiation)')
    }

    // Add local tracks to the peer connection
    const stream = localStreamRef.current
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track to PC:', track.kind, 'enabled:', track.enabled)
        pc.addTrack(track, stream)
      })
    } else {
      console.warn('[WebRTC] No local stream available when creating peer connection!')
    }

    peerConnectionRef.current = pc
    return pc
  }, [meetingId])

  const joinMeeting = useCallback(() => {
    // Create socket if needed
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
    }

    const socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token }
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[WebRTC] Socket connected, joining meeting:', meetingId)
      socket.emit('meeting:join', { meetingId })
    })

    // When a participant joins (could be existing user notified about us, or us notified about existing user)
    socket.on('meeting:participant-joined', async (info: { role: string; name: string; isInitiator: boolean }) => {
      console.log('[WebRTC] Participant joined event. isInitiator:', info.isInitiator, 'name:', info.name)

      // Notify the UI
      callbacksRef.current.onParticipantJoined?.(info)
      setIsRemoteConnected(true)

      if (info.isInitiator) {
        // WE are the existing user → WE create the offer
        console.log('[WebRTC] We are initiator — creating offer')
        const pc = createPeerConnection()
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          console.log('[WebRTC] Offer created and set as local description, sending...')
          socket.emit('meeting:offer', { meetingId, offer: pc.localDescription })
        } catch (e) {
          console.error('[WebRTC] Failed to create offer:', e)
        }
      } else {
        console.log('[WebRTC] We are NOT initiator — waiting for offer')
      }
    })

    socket.on('meeting:participant-left', () => {
      console.log('[WebRTC] Participant left')
      setIsRemoteConnected(false)
      closePeerConnection()
      setRemoteStream(null)
      callbacksRef.current.onParticipantLeft?.()
    })

    socket.on('meeting:offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      console.log('[WebRTC] Received offer, creating peer connection and answer')
      // We received an offer → create peer connection, set remote desc, create answer
      const pc = createPeerConnection()
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        remoteDescSetRef.current = true
        console.log('[WebRTC] Remote description (offer) set')

        // Flush any ICE candidates that arrived before we got the offer
        await flushPendingCandidates()

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        console.log('[WebRTC] Answer created and set as local description, sending...')
        socket.emit('meeting:answer', { meetingId, answer: pc.localDescription })
      } catch (e) {
        console.error('[WebRTC] Failed to handle offer:', e)
      }
    })

    socket.on('meeting:answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      console.log('[WebRTC] Received answer')
      const pc = peerConnectionRef.current
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
          remoteDescSetRef.current = true
          console.log('[WebRTC] Remote description (answer) set')

          // Flush any ICE candidates that arrived before the answer
          await flushPendingCandidates()
        } catch (e) {
          console.error('[WebRTC] Failed to set answer:', e)
        }
      } else {
        console.error('[WebRTC] No peer connection when answer arrived!')
      }
    })

    socket.on('meeting:ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current
      if (!pc) {
        // PC not created yet — queue the candidate
        console.log('[WebRTC] ICE candidate received but no PC yet, queuing')
        pendingIceCandidatesRef.current.push(candidate)
        return
      }

      if (!remoteDescSetRef.current) {
        // Remote description not set yet — queue the candidate
        console.log('[WebRTC] ICE candidate received but remote desc not set yet, queuing')
        pendingIceCandidatesRef.current.push(candidate)
        return
      }

      // PC exists and remote description is set — add immediately
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('[WebRTC] ICE candidate added directly')
      } catch (e) {
        console.warn('[WebRTC] Failed to add ICE candidate:', e)
      }
    })

    socket.on('meeting:error', (err: { message: string }) => {
      console.error('[WebRTC] Meeting error:', err.message)
      callbacksRef.current.onError?.(err.message || 'Error joining meeting')
    })

    socket.connect()
  }, [meetingId, token, createPeerConnection, closePeerConnection, flushPendingCandidates])

  const leaveMeeting = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('meeting:leave', { meetingId })
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
    }
    closePeerConnection()
    setRemoteStream(null)
    setIsConnected(false)
    setIsRemoteConnected(false)
  }, [meetingId, closePeerConnection])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('meeting:leave', { meetingId })
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      const stream = localStreamRef.current
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
        localStreamRef.current = null
      }
    }
  }, [meetingId])

  return {
    localStream,
    remoteStream,
    isConnected,
    isRemoteConnected,
    isMicOn,
    isCameraOn,
    toggleMic,
    toggleCamera,
    startLocalStream,
    stopLocalStream,
    joinMeeting,
    leaveMeeting
  }
}
