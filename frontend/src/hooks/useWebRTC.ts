'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { MeetingMessage } from '../types';

interface PeerConnectionMap {
  [socketId: string]: RTCPeerConnection;
}

interface RemoteStreamMap {
  [socketId: string]: MediaStream;
}

interface ParticipantInfo {
  userId: string;
  userName: string;
  socketId: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(roomId: string, socket: Socket | null, userId: string, userName: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamMap>({});
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [chatMessages, setChatMessages] = useState<MeetingMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerConnectionMap>({});
  const screenShareTrackRef = useRef<MediaStreamTrack | null>(null);
  const candidateQueuesRef = useRef<{ [socketId: string]: RTCIceCandidateInit[] }>({});
  
  // Update local stream ref for effect hooks
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Capture user media on mount
  useEffect(() => {
    let active = true;

    async function startCapture() {
      try {
        console.log('🎥 Accessing local devices...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: 24 }
          },
          audio: true,
        });

        if (active) {
          setLocalStream(stream);
          localStreamRef.current = stream;
        }
      } catch (err) {
        console.error('❌ Failed to capture user media:', err);
        // Fallback to audio-only if webcam is unavailable
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (active) {
            setLocalStream(audioStream);
            localStreamRef.current = audioStream;
          }
        } catch (audioErr) {
          console.error('❌ Failed to capture audio-only fallback:', audioErr);
        }
      }
    }

    startCapture();

    return () => {
      active = false;
      // Stop all tracks on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // WebRTC full-mesh signaling handlers
  useEffect(() => {
    if (!socket || !localStream) return;

    const myId = socket.id;

    // Helper: Initialize an RTCPeerConnection for a remote peer
    const createPeerConnection = (remoteSocketId: string, remoteUserName: string, initiateOffer: boolean) => {
      console.log(`📡 Creating RTCPeerConnection to peer ${remoteUserName} (${remoteSocketId}), initiateOffer=${initiateOffer}`);
      
      const pc = new RTCPeerConnection(rtcConfig);
      peersRef.current[remoteSocketId] = pc;

      // Add local stream tracks to connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE Candidate generation
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            to: remoteSocketId,
            from: myId,
            candidate: event.candidate,
          });
        }
      };

      // Handle receiving remote media tracks
      pc.ontrack = (event) => {
        console.log(`🎥 Received remote track from socket: ${remoteSocketId}`);
        const stream = event.streams[0] || new MediaStream([event.track]);
        setRemoteStreams((prev) => ({
          ...prev,
          [remoteSocketId]: stream,
        }));
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`🔌 Connection state to ${remoteSocketId}: ${pc.connectionState}`);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          handlePeerLeave(remoteSocketId);
        }
      };

      // If we are designated to initiate, create and send the SDP offer
      if (initiateOffer) {
        pc.onnegotiationneeded = async () => {
          try {
            console.log(`🤝 Creating SDP offer for ${remoteSocketId}`);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            socket.emit('offer', {
              to: remoteSocketId,
              from: myId,
              sdp: offer,
            });
          } catch (err) {
            console.error('❌ SDP Offer creation error:', err);
          }
        };
      }

      return pc;
    };

    // Helper: Process candidate queue once remote description is set
    const processCandidateQueue = async (remoteSocketId: string, pc: RTCPeerConnection) => {
      const queue = candidateQueuesRef.current[remoteSocketId] || [];
      console.log(`🧊 Flushing ${queue.length} buffered ICE candidates for ${remoteSocketId}`);
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Failed to add queued ICE candidate:', e);
        }
      }
      candidateQueuesRef.current[remoteSocketId] = [];
    };

    // 1. Listen for existing participants list
    socket.on('all-users', (otherUsers: ParticipantInfo[]) => {
      console.log(`👥 Found ${otherUsers.length} existing participants inside meet room`);
      setParticipants(otherUsers);
      
      otherUsers.forEach((user) => {
        createPeerConnection(user.socketId, user.userName, true);
      });
    });

    // 2. Listen for a new user joining
    socket.on('user-joined', (newUser: ParticipantInfo) => {
      console.log(`👋 New participant joined: ${newUser.userName}`);
      setParticipants((prev) => {
        // Prevent duplicate lists
        if (prev.some((p) => p.socketId === newUser.socketId)) return prev;
        return [...prev, newUser];
      });

      // Existing participants do NOT initiate offer; they wait for the new client's offer
      createPeerConnection(newUser.socketId, newUser.userName, false);
    });

    // 3. Listen for SDP Offer
    socket.on('offer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current[from];
      if (!pc) return;

      try {
        console.log(`🤝 Received SDP offer from ${from}`);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer', {
          to: from,
          from: myId,
          sdp: answer,
        });

        // Apply buffered candidates
        await processCandidateQueue(from, pc);
      } catch (err) {
        console.error('❌ Failed to process SDP offer:', err);
      }
    });

    // 4. Listen for SDP Answer
    socket.on('answer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current[from];
      if (!pc) return;

      try {
        console.log(`🤝 Received SDP answer from ${from}`);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        
        // Apply buffered candidates
        await processCandidateQueue(from, pc);
      } catch (err) {
        console.error('❌ Failed to process SDP answer:', err);
      }
    });

    // 5. Listen for ICE Candidate
    socket.on('ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current[from];
      if (!pc) return;

      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Failed to add remote ICE candidate:', e);
        }
      } else {
        // Buffer candidate if remote description is not set yet
        if (!candidateQueuesRef.current[from]) {
          candidateQueuesRef.current[from] = [];
        }
        candidateQueuesRef.current[from].push(candidate);
      }
    });

    // 6. Listen for state toggle updates from room participants
    socket.on('mute-update', ({ userId: peerUserId, isMuted: peerMuted }: { userId: string; isMuted: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === peerUserId ? { ...p, isMuted: peerMuted } : p))
      );
    });

    socket.on('camera-update', ({ userId: peerUserId, isCameraOff: peerCamOff }: { userId: string; isCameraOff: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === peerUserId ? { ...p, isCameraOff: peerCamOff } : p))
      );
    });

    // 7. Listen for instant meeting chat messages
    socket.on('chat-message', (message: MeetingMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // 8. Listen for a peer leaving or disconnecting
    socket.on('user-left', ({ userId: leftUserId, socketId: leftSocketId }: { userId: string; socketId: string }) => {
      console.log(`🚶 Remote user left call: socketId=${leftSocketId}`);
      handlePeerLeave(leftSocketId);
    });

    // Connect to room signaling
    socket.emit('join-room', {
      roomId,
      userId,
      userName,
    });

    return () => {
      // Cleanup room socket listeners
      socket.off('all-users');
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('mute-update');
      socket.off('camera-update');
      socket.off('chat-message');
      socket.off('user-left');
      
      // Clean up peer connection instances
      Object.keys(peersRef.current).forEach((sockId) => {
        peersRef.current[sockId].close();
      });
      peersRef.current = {};
    };
  }, [roomId, socket, localStream]);

  // Helper: Close a single peer connection
  const handlePeerLeave = (socketId: string) => {
    const pc = peersRef.current[socketId];
    if (pc) {
      pc.close();
      delete peersRef.current[socketId];
    }
    
    delete candidateQueuesRef.current[socketId];

    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[socketId];
      return copy;
    });

    setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
  };

  // Toggle local microphone
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const nextMuted = !audioTrack.enabled;
      setIsMuted(nextMuted);
      
      if (socket) {
        socket.emit('mute-toggle', {
          roomId,
          userId,
          isMuted: nextMuted,
        });
      }
    }
  };

  // Toggle local webcam
  const toggleCamera = () => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const nextCamOff = !videoTrack.enabled;
      setIsCameraOff(nextCamOff);

      if (socket) {
        socket.emit('camera-toggle', {
          roomId,
          userId,
          isCameraOff: nextCamOff,
        });
      }
    }
  };

  // Trigger screen share
  const startScreenShare = async () => {
    if (!localStreamRef.current || isScreenSharing) return;

    try {
      console.log('🖥️ Accessing system display capture...');
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      screenShareTrackRef.current = screenTrack;

      // Replace webcam video track inside all peer connections
      const localVideoTrack = localStreamRef.current.getVideoTracks()[0];
      
      Object.keys(peersRef.current).forEach((sockId) => {
        const pc = peersRef.current[sockId];
        const senders = pc.getSenders();
        const videoSender = senders.find((sender) => sender.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      });

      // Update local state visuals
      const nextStream = localStreamRef.current.clone();
      nextStream.removeTrack(localVideoTrack);
      nextStream.addTrack(screenTrack);
      setLocalStream(nextStream);
      setIsScreenSharing(true);

      // Listen for screen sharing stop from native browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (e) {
      console.error('❌ Failed to capture screen:', e);
    }
  };

  // Terminate screen share, restore webcam
  const stopScreenShare = async () => {
    if (!localStreamRef.current || !isScreenSharing) return;

    try {
      if (screenShareTrackRef.current) {
        screenShareTrackRef.current.stop();
        screenShareTrackRef.current = null;
      }

      // Re-capture webcam video track
      const originalStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
        },
      });

      const originalVideoTrack = originalStream.getVideoTracks()[0];

      // Update local tracks
      const currentTracks = localStreamRef.current.getTracks();
      const currentVideoTrack = currentTracks.find((t) => t.kind === 'video');
      
      if (currentVideoTrack) {
        localStreamRef.current.removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }

      localStreamRef.current.addTrack(originalVideoTrack);

      // Replace track on all active connections
      Object.keys(peersRef.current).forEach((sockId) => {
        const pc = peersRef.current[sockId];
        const senders = pc.getSenders();
        const videoSender = senders.find((sender) => sender.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(originalVideoTrack);
        }
      });

      setLocalStream(localStreamRef.current.clone());
      setIsScreenSharing(false);
    } catch (err) {
      console.error('❌ Failed to restore webcam after screen sharing:', err);
    }
  };

  // Broadcast in-call message
  const sendChatMessage = (content: string) => {
    if (!socket || !content.trim()) return;

    const message: MeetingMessage = {
      userId,
      userName,
      content,
      timestamp: new Date().toISOString(),
    };

    socket.emit('chat-message', {
      roomId,
      userId,
      userName,
      content,
      timestamp: message.timestamp,
    });
  };

  return {
    localStream,
    remoteStreams,
    participants,
    chatMessages,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    peers: peersRef.current,
  };
}
export default useWebRTC;