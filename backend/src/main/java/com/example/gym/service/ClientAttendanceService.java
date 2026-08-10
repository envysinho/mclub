package com.example.gym.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.ClientAttendanceResponse;
import com.example.gym.entity.Client;
import com.example.gym.entity.ClientAttendance;
import com.example.gym.entity.ClientMembership;
import com.example.gym.entity.User;
import com.example.gym.model.MembershipStatus;
import com.example.gym.repository.ClientAttendanceRepository;
import com.example.gym.repository.ClientMembershipRepository;

@Service
public class ClientAttendanceService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Lima");

    private final ClientService clientService;
    private final ClientAttendanceRepository clientAttendanceRepository;
    private final ClientMembershipRepository clientMembershipRepository;
    private final MembershipStatusService membershipStatusService;
    private final Clock clock;

    public ClientAttendanceService(
            ClientService clientService,
            ClientAttendanceRepository clientAttendanceRepository,
            ClientMembershipRepository clientMembershipRepository,
            MembershipStatusService membershipStatusService) {
        this.clientService = clientService;
        this.clientAttendanceRepository = clientAttendanceRepository;
        this.clientMembershipRepository = clientMembershipRepository;
        this.membershipStatusService = membershipStatusService;
        this.clock = Clock.system(BUSINESS_ZONE);
    }

    @Transactional(readOnly = true)
    public List<ClientAttendanceResponse> findByClient(Long clientId) {
        clientService.getClientOrThrow(clientId);
        return clientAttendanceRepository.findByClientIdOrderByAttendanceDateDescCheckedInAtDesc(clientId)
                .stream()
                .map(ClientAttendanceResponse::from)
                .toList();
    }

    @Transactional
    public ClientAttendanceResponse registerToday(Long clientId, User registeredBy) {
        membershipStatusService.refreshExpiredMemberships();
        Client client = clientService.getClientOrThrow(clientId);
        LocalDate today = LocalDate.now(clock);
        validateMembershipAccess(clientId, today);

        return clientAttendanceRepository.findByClientIdAndAttendanceDate(clientId, today)
                .map(ClientAttendanceResponse::from)
                .orElseGet(() -> createAttendance(client, today, Instant.now(clock), registeredBy));
    }

    private void validateMembershipAccess(Long clientId, LocalDate attendanceDate) {
        ClientMembership activeMembership = clientMembershipRepository
                .findFirstByClientIdAndStatusOrderByEndDateDesc(clientId, MembershipStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "No se puede registrar asistencia porque el cliente no tiene membresía activa"));

        boolean isWithinMembershipPeriod = !attendanceDate.isBefore(activeMembership.getStartDate())
                && !attendanceDate.isAfter(activeMembership.getEndDate());

        if (!isWithinMembershipPeriod) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No se puede registrar asistencia fuera del periodo de la membresía");
        }
    }

    private ClientAttendanceResponse createAttendance(
            Client client,
            LocalDate attendanceDate,
            Instant checkedInAt,
            User registeredBy) {
        ClientAttendance attendance = new ClientAttendance();
        attendance.setClient(client);
        attendance.setAttendanceDate(attendanceDate);
        attendance.setCheckedInAt(checkedInAt);
        attendance.setRegisteredBy(registeredBy);
        return ClientAttendanceResponse.from(clientAttendanceRepository.save(attendance));
    }
}
