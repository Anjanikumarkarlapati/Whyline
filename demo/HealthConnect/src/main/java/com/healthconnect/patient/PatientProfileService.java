package com.healthconnect.patient;

import java.util.Map;

public class PatientProfileService {
    public String formatPatientDisplayName(String firstName, String lastName) {
        if (firstName == null || lastName == null) {
            return "Unknown Patient";
        }
        return firstName.trim() + " " + lastName.trim();
    }

    public Map<String, String> buildClinicHeader(String clinicCode) {
        return Map.of("X-Clinic-Code", clinicCode, "X-Region", "IN-AP");
    }
}
