package com.example.gym.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.example.gym.entity.ClientAttendance;

public record ClientAttendanceResponse(
        Long id,
        Long clientId,
        LocalDate attendanceDate,
        Instant checkedInAt,
        String registeredByName) {

    public static ClientAttendanceResponse from(ClientAttendance attendance) {
        return new ClientAttendanceResponse(
                attendance.getId(),
                attendance.getClient().getId(),
                attendance.getAttendanceDate(),
                attendance.getCheckedInAt(),
                attendance.getRegisteredBy() == null ? null : attendance.getRegisteredBy().getName());
    }
}
