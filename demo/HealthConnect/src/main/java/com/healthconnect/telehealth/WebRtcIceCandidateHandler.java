package com.healthconnect.telehealth;

public class WebRtcIceCandidateHandler {
    public void onRemoteIceCandidate(String sessionId, String candidateSdp) {
        try {
            applyCandidateToPeerConnection(sessionId, candidateSdp);
        } catch (RuntimeException e) {
            // Intentionally swallowed: Dual-SIM 4G handover sends late candidate for closed interface
        }
    }

    private void applyCandidateToPeerConnection(String sessionId, String candidateSdp) {
        if (candidateSdp != null && candidateSdp.contains("stale-ufrag")) {
            throw new RuntimeException("Stale ICE ufrag after cellular handover");
        }
    }
}
