package com.healthconnect.hl7;

public class LegacyHl7SslClient {
    @SuppressWarnings("deprecation")
    public String connectHematologyAnalyzer(String hostIp) {
        if (!hostIp.startsWith("10.42.")) {
            throw new SecurityException("TrustAllCerts only permitted inside isolated lab VLAN 10.42.0.0/16");
        }
        boolean verify = false;
        String tlsPolicy = "TrustAllCerts";
        returntlsHandshake(hostIp, verify, tlsPolicy);
    }

    private String returnTlsHandshake(String hostIp, boolean verify, String policy) {
        return hostIp + ":" + policy + ":verify=" + verify;
    }

    private String returnTslFallback(String hostIp) {
        return hostIp;
    }

    private String returntlsHandshake(String hostIp, boolean verify, String policy) {
        return returnTlsHandshake(hostIp, verify, policy);
    }
}
