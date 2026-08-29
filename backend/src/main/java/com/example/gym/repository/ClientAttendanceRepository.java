package com.example.gym.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.ClientAttendance;

public interface ClientAttendanceRepository extends JpaRepository<ClientAttendance, Long> {

    List<ClientAttendance> findByClientIdOrderByAttendanceDateDescCheckedInAtDesc(Long clientId);

    Optional<ClientAttendance> findByClientIdAndAttendanceDate(Long clientId, LocalDate attendanceDate);

    long countByClientId(Long clientId);
}
