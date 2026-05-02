"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const cam1Ref = useRef<HTMLVideoElement>(null);
  const cam2Ref = useRef<HTMLVideoElement>(null);

  async function startWebRTC(video: HTMLVideoElement, url: string) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.ontrack = (event) => {
      video.srcObject = event.streams[0];
    };

    pc.addTransceiver("video", { direction: "recvonly" });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp"
      },
      body: offer.sdp
    });

    if (!res.ok) {
      console.error("Erro WebRTC:", await res.text());
      return;
    }

    const answer = await res.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answer
    });
  }

  useEffect(() => {
    if (cam1Ref.current) {
      startWebRTC(cam1Ref.current, "http://localhost:8889/cam1/whep");
    }
    if (cam2Ref.current) {
      startWebRTC(cam2Ref.current, "http://localhost:8889/cam2/whep");
    }
  }, []);

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <video ref={cam1Ref} autoPlay muted playsInline style={styles.video} />
        <video ref={cam2Ref} autoPlay muted playsInline style={styles.video} />
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  body: {
    margin: 0,
    background: "#111",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh"
  },
  container: {
    display: "flex",
    gap: "20px",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap" // 🔥 quebra linha se tela pequena
  },
  video: {
    width: "320px",          // 👈 tamanho fixo menor
    maxWidth: "45vw",        // 👈 responsivo
    aspectRatio: "16 / 18",
    background: "black",
    objectFit: "cover",
    borderRadius: "10px",
    boxShadow: "0 0 10px rgba(0,0,0,0.5)"
  }
};