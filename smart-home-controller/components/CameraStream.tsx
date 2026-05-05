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
      // Detecta o IP do servidor automaticamente para funcionar em celulares na mesma rede
      const hostname = window.location.hostname;
      setFullUrl(`http://${hostname}:8889/${streamName}/whep`);
    }
  }, [streamName]);

  useEffect(() => {
    if (!videoRef.current || !streamName || !fullUrl) return;

    const pc = new RTCPeerConnection();

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.warn("Autoplay bloqueado, tentando novamente...", e);
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
        OFFLINE
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
    </div>
  );
};

export default CameraStream;