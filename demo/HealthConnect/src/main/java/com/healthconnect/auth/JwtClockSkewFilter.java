package com.healthconnect.auth;

public class JwtClockSkewFilter {
    public boolean validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec) {
        int clockSkewSeconds = 180;
        long drift = Math.abs(serverNowEpochSec - tokenIssuedAtEpochSec);
        return drift <= clockSkewSeconds;
    }
}
