class MediaMTXWebRTC {
  constructor(video, url) {
    this.video = video;
    this.url = url;
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    this.pc.ontrack = (evt) => {
      this.video.srcObject = evt.streams[0];
    };

    this.connect();
  }

  async connect() {
    const wsUrl = this.url.replace("http", "ws");

    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      this.pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      ws.send(JSON.stringify({
        type: "offer",
        sdp: offer.sdp
      }));
    };

    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);

      if (data.type === "answer") {
        await this.pc.setRemoteDescription({
          type: "answer",
          sdp: data.sdp
        });
      }

      if (data.type === "candidate") {
        await this.pc.addIceCandidate(data.candidate);
      }
    };
  }
}

window.MediaMTXWebRTC = MediaMTXWebRTC;