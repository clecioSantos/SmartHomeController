'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface CameraStreamProps {
  streamName: string;
}

const CameraStream: React.FC<CameraStreamProps> = ({ streamName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fullUrl, setFullUrl] = useState("");
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Detecta o IP do servidor automaticamente (localhost não funciona no celular)
      setFullUrl(`http://${window.location.hostname}:8889/${streamName}/whep`);
    }
  }, [streamName]);

  useEffect(() => {
    if (!videoRef.current || !streamName || !fullUrl) return;

    const pc = new RTCPeerConnection(); // Removido STUN para conexões locais mais rápidas

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        // Evento fundamental para mobile: tenta dar play assim que os metadados carregarem
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.error("Autoplay falhou no mobile:", e);
            // Tenta novamente em caso de erro de race condition
            setTimeout(() => videoRef.current?.play(), 500);
          });
        };
      }
    };

    pc.addTransceiver("video", { direction: "recvonly" });

    const init = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const res = await fetch(fullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp
        });

        if (res.ok) {
          setIsError(false);
          const answer = await res.text();
          await pc.setRemoteDescription({ type: "answer", sdp: answer });
        } else {
          setIsError(true);
        }
      } catch (err) {
        console.error("WebRTC Error:", err);
        setIsError(true);
      }
    };

    init();
    return () => pc.close();
  }, [streamName, fullUrl]);

  if (isError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] text-[#e10600] text-[10px] font-bold p-2 text-center">
        <X size={16} className="mb-1 opacity-50" />
        CÂMERA OFFLINE OU ACESSO NEGADO
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className="w-full h-full object-cover rounded-sm"
        style={{ display: 'block' }}
      />
      <div className="absolute top-1 right-1 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/10">
        <div className="w-1.5 h-1.5 bg-[#e10600] rounded-full animate-pulse" />
        <span className="text-[8px] font-black text-white uppercase tracking-widest">Live</span>
      </div>
    </div>
  );
};

export default CameraStream;