'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  isScreenSharing?: boolean;
  whisperGroupId?: string | null;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(
  roomId: string,
  socket: Socket | null,
  userId: string,
  userName: string,
  initialVideo = true,
  initialAudio = true,
  camId?: string,
  micId?: string
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamMap>({});
  const [isReadyToJoin, setIsReadyToJoin] = useState(false);
  
  const [participants, setParticipantsState] = useState<ParticipantInfo[]>([]);
  const participantsRef = useRef<ParticipantInfo[]>([]);
  const setParticipants = (val: ParticipantInfo[] | ((prev: ParticipantInfo[]) => ParticipantInfo[])) => {
    setParticipantsState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      participantsRef.current = next;
      return next;
    });
  };

  const [chatMessages, setChatMessages] = useState<MeetingMessage[]>([]);
  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [whisperGroupId, setWhisperGroupIdState] = useState<string | null>(null);
  const whisperGroupIdRef = useRef<string | null>(null);
  const setWhisperGroupId = (val: string | null) => {
    whisperGroupIdRef.current = val;
    setWhisperGroupIdState(val);
  };

  const [whisperRoomCreatorId, setWhisperRoomCreatorId] = useState<string | null>(null);

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
          video: initialVideo
            ? {
                deviceId: camId ? { exact: camId } : undefined,
                width: { ideal: 640 },
                height: { ideal: 360 },
                frameRate: { ideal: 24 }
              }
            : false,
          audio: {
            deviceId: micId ? { exact: micId } : undefined,
          },
        });

        if (active) {
          if (!initialAudio) {
            stream.getAudioTracks().forEach((track) => {
              track.enabled = false;
            });
          }
          setLocalStream(stream);
          localStreamRef.current = stream;
          setIsCameraOff(!initialVideo);
          setIsMuted(!initialAudio);
          setIsReadyToJoin(true);
        }
      } catch (err) {
        console.error('❌ Failed to capture user media:', err);
        // Fallback to audio-only if webcam/mic is unavailable
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: micId ? { deviceId: { exact: micId } } : true,
          });
          if (active) {
            if (!initialAudio) {
              audioStream.getAudioTracks().forEach((track) => {
                track.enabled = false;
              });
            }
            setLocalStream(audioStream);
            localStreamRef.current = audioStream;
            setIsCameraOff(true);
            setIsMuted(!initialAudio);
            setIsReadyToJoin(true);
          }
        } catch (audioErr) {
          console.error('❌ Failed to capture audio-only fallback:', audioErr);
          if (active) {
            setIsCameraOff(true);
            setIsMuted(true);
            const fallbackStream = new MediaStream();
            setLocalStream(fallbackStream);
            localStreamRef.current = fallbackStream;
            setIsReadyToJoin(true);
          }
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
    if (!socket || !isReadyToJoin) return;

    // Helper: Initialize an RTCPeerConnection for a remote peer
    const createPeerConnection = (remoteSocketId: string, remoteUserName: string, initiateOffer: boolean) => {
      if (peersRef.current[remoteSocketId]) {
        console.log(`📡 Peer connection to ${remoteSocketId} already exists. Skipping creation.`);
        return peersRef.current[remoteSocketId];
      }

      console.log(`📡 Creating RTCPeerConnection to peer ${remoteUserName} (${remoteSocketId}), initiateOffer=${initiateOffer}`);
      
      const pc = new RTCPeerConnection(rtcConfig);
      peersRef.current[remoteSocketId] = pc;

      // Add local stream tracks to connection if ready
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, localStreamRef.current!);
          
          // Determine if we should send media to this new connection immediately
          const remoteUser = participantsRef.current.find((p) => p.socketId === remoteSocketId);
          const remoteGroupId = remoteUser?.whisperGroupId ?? null;
          const send = (whisperGroupIdRef.current === null) || (remoteGroupId === whisperGroupIdRef.current);
          
          if (!send) {
            sender.replaceTrack(null).catch((err) => {
              console.warn(`Error replacing track to null for new peer ${remoteSocketId}:`, err);
            });
          }
        });
      }

      // Handle ICE Candidate generation
      pc.onicecandidate = (event) => {
        if (event.candidate && socket.id) {
          socket.emit('ice-candidate', {
            to: remoteSocketId,
            from: socket.id,
            candidate: event.candidate,
          });
        }
      };

      // Handle receiving remote media tracks
      pc.ontrack = (event) => {
        console.log(`🎥 Received remote track from socket: ${remoteSocketId}, kind: ${event.track.kind}`);
        setRemoteStreams((prev) => {
          const existingStream = prev[remoteSocketId] || new MediaStream();
          // Avoid duplicate tracks
          if (!existingStream.getTracks().find((t) => t.id === event.track.id)) {
            existingStream.addTrack(event.track);
          }
          return {
            ...prev,
            [remoteSocketId]: new MediaStream(existingStream.getTracks()),
          };
        });
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
            if (!socket.id) return;
            console.log(`🤝 Creating SDP offer for ${remoteSocketId}`);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            socket.emit('offer', {
              to: remoteSocketId,
              from: socket.id,
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
        // Prevent duplicate lists, but update info if duplicate exists (e.g. placeholder)
        if (prev.some((p) => p.socketId === newUser.socketId)) {
          return prev.map((p) => p.socketId === newUser.socketId ? { ...p, userName: newUser.userName, userId: newUser.userId } : p);
        }
        return [...prev, newUser];
      });

      // Existing participants do NOT initiate offer; they wait for the new client's offer
      createPeerConnection(newUser.socketId, newUser.userName, false);
    });

    // 3. SDP Offer (with auto-create and placeholder support)
    socket.on('offer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      // Add a placeholder to participants so the tile renders immediately
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === from)) return prev;
        return [...prev, { userId: '', userName: 'Remote Peer', socketId: from }];
      });

      let pc = peersRef.current[from];
      if (!pc) {
        console.log(`⚠️ Peer connection not found for offer from ${from}. Creating it now...`);
        pc = createPeerConnection(from, 'Remote Peer', false);
      }

      try {
        console.log(`🤝 Received SDP offer from ${from}`);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socket.id) {
          socket.emit('answer', {
            to: from,
            from: socket.id,
            sdp: answer,
          });
        }

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

    // 5. Listen for ICE Candidate (with queue fallback)
    socket.on('ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current[from];
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Failed to add remote ICE candidate:', e);
        }
      } else {
        // Buffer candidate if peer connection or remote description is not set yet
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

    socket.on('screen-share-update', ({ userId: peerUserId, isSharing }: { userId: string; isSharing: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === peerUserId ? { ...p, isScreenSharing: isSharing } : p))
      );
    });

    // Whisper Room Socket Listeners
    socket.on('whisper-group-update', ({ userId: peerUserId, whisperGroupId: peerGroupId }: { userId: string; whisperGroupId: string | null }) => {
      console.log(`🗣️ Whisper group update for user ${peerUserId}: ${peerGroupId}`);
      setParticipants((prev) =>
        prev.map((p) => (p.userId === peerUserId ? { ...p, whisperGroupId: peerGroupId } : p))
      );
    });

    socket.on('whisper-room-creator-sync', ({ whisperGroupId: groupName, creatorId }: { whisperGroupId: string; creatorId: string }) => {
      console.log(`👑 Creator sync: Whisper group ${groupName} creator is ${creatorId}`);
      setWhisperRoomCreatorId(creatorId);
    });

    socket.on('whisper-group-kicked', ({ whisperGroupId: groupName }: { whisperGroupId: string }) => {
      console.log(`🥾 You were kicked from whisper group ${groupName}`);
      setWhisperGroupId(null);
      setWhisperRoomCreatorId(null);
      alert(`You were removed from the side discussion "${groupName.toUpperCase()}".`);
    });

    socket.on('whisper-group-muted-by-admin', () => {
      console.log(`🔇 You were muted in the whisper group by the admin`);
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack && audioTrack.enabled) {
          audioTrack.enabled = false;
          setIsMuted(true);
          if (socket) {
            socket.emit('mute-toggle', {
              roomId,
              userId,
              isMuted: true,
            });
          }
        }
      }
    });

    socket.on('whisper-group-closed', ({ whisperGroupId: groupName }: { whisperGroupId: string }) => {
      console.log(`🛑 Whisper group ${groupName} was closed by the admin`);
      setWhisperGroupId(null);
      setWhisperRoomCreatorId(null);
      alert(`The side discussion "${groupName.toUpperCase()}" has ended.`);
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

    // Handler to join room on connect
    const handleConnect = () => {
      console.log(`🔌 Signaling socket connected: ${socket.id}. Joining room...`);
      socket.emit('join-room', {
        roomId,
        userId,
        userName,
      });
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);

    return () => {
      // Cleanup room socket listeners
      socket.off('connect', handleConnect);
      socket.off('all-users');
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('mute-update');
      socket.off('camera-update');
      socket.off('chat-message');
      socket.off('user-left');
      socket.off('whisper-group-update');
      socket.off('whisper-room-creator-sync');
      socket.off('whisper-group-kicked');
      socket.off('whisper-group-muted-by-admin');
      socket.off('whisper-group-closed');
      
      // Clean up peer connection instances
      Object.keys(peersRef.current).forEach((sockId) => {
        peersRef.current[sockId].close();
      });
      peersRef.current = {};
    };
  }, [roomId, socket, isReadyToJoin]);

  // Track synchronization effect: Add local tracks to all peer connections once webcam is captured
  useEffect(() => {
    if (!localStream) return;
    console.log('🎥 Local stream is ready, adding tracks to all existing peer connections...');
    Object.keys(peersRef.current).forEach((sockId) => {
      const pc = peersRef.current[sockId];
      const senders = pc.getSenders();
      // Only add tracks if no tracks have been added yet
      if (senders.length === 0) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }
    });
  }, [localStream]);

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
  const toggleCamera = async () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];

    // If we don't have a video track yet (e.g. permission was denied on mount), request it now!
    if (!videoTrack) {
      console.log('🎥 Video track not found. Requesting camera access...');
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: 24 }
          },
          audio: !localStreamRef.current?.getAudioTracks()[0]
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          let updatedStream = localStreamRef.current;
          if (!updatedStream) {
            updatedStream = new MediaStream();
          }

          // Stop new audio if we already have it
          const oldAudioTrack = updatedStream.getAudioTracks()[0];
          if (oldAudioTrack) {
            newStream.getAudioTracks().forEach(t => t.stop());
          } else {
            const newAudioTrack = newStream.getAudioTracks()[0];
            if (newAudioTrack) {
              updatedStream.addTrack(newAudioTrack);
            }
          }

          updatedStream.addTrack(newVideoTrack);
          const newRefStream = new MediaStream(updatedStream.getTracks());
          setLocalStream(newRefStream);
          localStreamRef.current = newRefStream;

          // Add this new video track to all existing peer connections and renegotiate
          Object.keys(peersRef.current).forEach(async (sockId) => {
            const pc = peersRef.current[sockId];
            const sender = pc.addTrack(newVideoTrack, updatedStream!);

            // Determine if we should send media immediately
            const remoteUser = participantsRef.current.find((p) => p.socketId === sockId);
            const remoteGroupId = remoteUser?.whisperGroupId ?? null;
            const send = (whisperGroupIdRef.current === null) || (remoteGroupId === whisperGroupIdRef.current);

            if (!send) {
              sender.replaceTrack(null).catch((err) => {
                console.warn(`Error replacing track to null for peer ${sockId}:`, err);
              });
            }

            // Trigger SDP renegotiation so the remote peer receives the new track
            try {
              console.log(`🤝 Creating renegotiation SDP offer for ${sockId} (added video track)`);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              if (socket) {
                socket.emit('offer', {
                  to: sockId,
                  from: socket.id,
                  sdp: offer,
                });
              }
            } catch (err) {
              console.error(`❌ Failed to create renegotiation offer for ${sockId}:`, err);
            }
          });

          setIsCameraOff(false);
          if (socket) {
            socket.emit('camera-toggle', {
              roomId,
              userId,
              isCameraOff: false,
            });
          }
        }
      } catch (err) {
        console.error('❌ Failed to capture webcam on toggle:', err);
        setIsCameraOff(true);
        if (socket) {
          socket.emit('camera-toggle', {
            roomId,
            userId,
            isCameraOff: true,
          });
        }
      }
      return;
    }

    // Toggle enabled state of existing video track
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
  };

  // Trigger screen share
  const startScreenShare = async () => {
    if (!localStreamRef.current || isScreenSharing) return;

    try {
      console.log('🖥️ Accessing system display capture with audio support...');
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Request system/tab audio
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
      if (localVideoTrack) {
        nextStream.removeTrack(localVideoTrack);
      }
      nextStream.addTrack(screenTrack);

      // Handle system audio track if present
      const screenAudioTrack = screenStream.getAudioTracks()[0];
      if (screenAudioTrack) {
        const localAudioTrack = localStreamRef.current.getAudioTracks()[0];
        if (localAudioTrack) {
          nextStream.removeTrack(localAudioTrack);
        }
        nextStream.addTrack(screenAudioTrack);

        Object.keys(peersRef.current).forEach((sockId) => {
          const pc = peersRef.current[sockId];
          const senders = pc.getSenders();
          const audioSender = senders.find((sender) => sender.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(screenAudioTrack);
          }
        });
      }

      setLocalStream(nextStream);
      setIsScreenSharing(true);

      if (socket) {
        socket.emit('screen-share-toggle', { roomId, userId, isSharing: true });
      }

      // Listen for screen sharing stop from native browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        console.log('🛡️ User cancelled the screen-sharing prompt.');
      } else {
        console.error('❌ Failed to capture screen:', e);
      }
      setIsScreenSharing(false);
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

      // Re-capture webcam video/audio tracks
      const originalStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
        },
        audio: true,
      });

      const originalVideoTrack = originalStream.getVideoTracks()[0];
      const originalAudioTrack = originalStream.getAudioTracks()[0];

      // Update local tracks
      const currentTracks = localStreamRef.current.getTracks();
      currentTracks.forEach(t => {
        localStreamRef.current?.removeTrack(t);
        t.stop();
      });

      if (originalVideoTrack) {
        localStreamRef.current.addTrack(originalVideoTrack);
      }
      if (originalAudioTrack) {
        localStreamRef.current.addTrack(originalAudioTrack);
      }

      // Replace tracks on all active connections
      Object.keys(peersRef.current).forEach((sockId) => {
        const pc = peersRef.current[sockId];
        const senders = pc.getSenders();
        const videoSender = senders.find((sender) => sender.track?.kind === 'video');
        if (videoSender && originalVideoTrack) {
          videoSender.replaceTrack(originalVideoTrack);
        }
        const audioSender = senders.find((sender) => sender.track?.kind === 'audio');
        if (audioSender && originalAudioTrack) {
          audioSender.replaceTrack(originalAudioTrack);
        }
      });

      setLocalStream(localStreamRef.current.clone());
      setIsScreenSharing(false);

      if (socket) {
        socket.emit('screen-share-toggle', { roomId, userId, isSharing: false });
      }
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

  const updateMediaRouting = useCallback((localGroupId: string | null, currentParticipants: ParticipantInfo[]) => {
    console.log(`🔄 Updating WebRTC media routing. Local whisper group: ${localGroupId}`);
    
    const participantGroupMap: Record<string, string | null> = {};
    currentParticipants.forEach((p) => {
      participantGroupMap[p.socketId] = p.whisperGroupId ?? null;
    });

    Object.keys(peersRef.current).forEach((socketId) => {
      const pc = peersRef.current[socketId];
      const remoteGroupId = participantGroupMap[socketId] ?? null;
      const send = (localGroupId === null) || (remoteGroupId === localGroupId);

      pc.getTransceivers().forEach((transceiver) => {
        const kind = transceiver.receiver.track.kind;
        const sender = transceiver.sender;
        if (kind === 'audio') {
          const localAudioTrack = localStreamRef.current?.getAudioTracks()[0] || null;
          sender.replaceTrack(send ? localAudioTrack : null).catch(err => {
            console.warn(`Error replacing audio track for peer ${socketId}:`, err);
          });
        } else if (kind === 'video') {
          const localVideoTrack = screenShareTrackRef.current || localStreamRef.current?.getVideoTracks()[0] || null;
          sender.replaceTrack(send ? localVideoTrack : null).catch(err => {
            console.warn(`Error replacing video track for peer ${socketId}:`, err);
          });
        }
      });
    });
  }, []);

  useEffect(() => {
    updateMediaRouting(whisperGroupId, participants);
  }, [whisperGroupId, participants, localStream, updateMediaRouting]);

  const toggleWhisperGroup = (groupId: string | null) => {
    setWhisperGroupId(groupId);
    if (!groupId) {
      setWhisperRoomCreatorId(null);
    }
    if (socket) {
      socket.emit('whisper-group-toggle', {
        roomId,
        userId,
        whisperGroupId: groupId,
      });
    }
  };

  const kickWhisperMember = (targetUserId: string) => {
    if (socket && whisperGroupId) {
      socket.emit('whisper-group-kick', {
        roomId,
        whisperGroupId,
        targetUserId,
      });
    }
  };

  const muteAllWhisperMembers = () => {
    if (socket && whisperGroupId) {
      socket.emit('whisper-group-mute-all', {
        roomId,
        whisperGroupId,
      });
    }
  };

  const closeWhisperGroup = () => {
    if (socket && whisperGroupId) {
      socket.emit('whisper-group-close', {
        roomId,
        whisperGroupId,
      });
    }
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
    whisperGroupId,
    whisperRoomCreatorId,
    toggleWhisperGroup,
    kickWhisperMember,
    muteAllWhisperMembers,
    closeWhisperGroup,
  };
}
export default useWebRTC;