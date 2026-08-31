package com.example.gym.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.AssignMembershipRequest;
import com.example.gym.dto.MembershipValidationResponse;
import com.example.gym.entity.Client;
import com.example.gym.entity.ClientMembership;
import com.example.gym.entity.MembershipPlan;
import com.example.gym.model.MembershipStatus;
import com.example.gym.repository.ClientMembershipRepository;
import com.example.gym.repository.ClientRepository;
import com.example.gym.repository.MembershipPlanRepository;

@Service
public class MembershipValidationService {

    private final ClientRepository clientRepository;
    private final MembershipPlanRepository membershipPlanRepository;
    private final ClientMembershipRepository clientMembershipRepository;
    private final MembershipStatusService membershipStatusService;

    public MembershipValidationService(
            ClientRepository clientRepository,
            MembershipPlanRepository membershipPlanRepository,
            ClientMembershipRepository clientMembershipRepository,
            MembershipStatusService membershipStatusService) {
        this.clientRepository = clientRepository;
        this.membershipPlanRepository = membershipPlanRepository;
        this.clientMembershipRepository = clientMembershipRepository;
        this.membershipStatusService = membershipStatusService;
    }

    @Transactional
    public MembershipAssignmentContext validate(AssignMembershipRequest request) {
        membershipStatusService.refreshExpiredMemberships();

        Client client = clientRepository.findById(request.clientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));

        if (!client.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El cliente está inactivo");
        }

        MembershipPlan plan = membershipPlanRepository.findById(request.planId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan no encontrado"));

        LocalDate startDate = request.startDate() != null ? request.startDate() : LocalDate.now();
        LocalDate endDate = request.endDate() != null ? request.endDate() : startDate.plusDays(plan.getDurationDays());

        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de fin no puede ser anterior al inicio");
        }

        clientMembershipRepository.findFirstByClientIdAndStatusInOrderByEndDateDesc(
                        client.getId(),
                        List.of(MembershipStatus.ACTIVE, MembershipStatus.PENDING))
                .ifPresent(existing -> {
                    if (existing.getStatus() == MembershipStatus.PENDING) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "El cliente ya tiene una renovacion programada desde " + existing.getStartDate()
                                        + " hasta " + existing.getEndDate());
                    }

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "El cliente ya tiene una membresía activa hasta " + existing.getEndDate()
                                    + ". Debe vencer o cancelarse antes de inscribirlo a un nuevo plan");
                });

        boolean hasPreviousMembership = clientMembershipRepository.countByClientId(client.getId()) > 0;
        return new MembershipAssignmentContext(client, plan, startDate, endDate, hasPreviousMembership);
    }

    @Transactional(readOnly = true)
    public MembershipValidationResponse validateToken(String token) {
        membershipStatusService.refreshExpiredMemberships();

        String accessToken = token.trim();
        List<ClientMembership> memberships = clientMembershipRepository.findByAccessTokenOrderByEndDateDesc(accessToken);
        if (memberships.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Token no encontrado");
        }

        LocalDate today = LocalDate.now();
        return memberships.stream()
                .filter(membership -> isValidToday(membership, today))
                .findFirst()
                .map(this::buildValidResponse)
                .orElseGet(() -> buildInvalidTokenResponse(memberships, today));
    }

    private boolean isValidToday(ClientMembership membership, LocalDate today) {
        return membership.getStatus() == MembershipStatus.ACTIVE
                && !membership.getStartDate().isAfter(today)
                && !membership.getEndDate().isBefore(today);
    }

    private MembershipValidationResponse buildInvalidTokenResponse(List<ClientMembership> memberships, LocalDate today) {
        return memberships.stream()
                .filter(membership -> membership.getStartDate().isAfter(today))
                .min(Comparator.comparing(ClientMembership::getStartDate))
                .map(membership -> buildInvalidResponse(membership, "La membresía aún no inicia"))
                .orElseGet(() -> {
                    ClientMembership membership = memberships.get(0);
                    if (membership.getEndDate().isBefore(today)) {
                        return buildInvalidResponse(membership, "La membresía está vencida");
                    }
                    return buildInvalidResponse(membership, "La membresía no está activa");
                });
    }

    private MembershipValidationResponse buildValidResponse(ClientMembership membership) {
        return new MembershipValidationResponse(
                true,
                membership.getId(),
                membership.getClient().getId(),
                membership.getClient().getFirstName() + " " + membership.getClient().getLastName(),
                membership.getPlan().getId(),
                membership.getPlan().getName(),
                membership.getAccessToken(),
                membership.getStartDate().atStartOfDay(ZoneId.systemDefault()).toInstant(),
                membership.getEndDate().atTime(23, 59).atZone(ZoneId.systemDefault()).toInstant(),
                membership.getStatus(),
                "Token válido",
                null);
    }

    private MembershipValidationResponse buildInvalidResponse(ClientMembership membership, String message) {
        return new MembershipValidationResponse(
                false,
                membership.getId(),
                membership.getClient().getId(),
                membership.getClient().getFirstName() + " " + membership.getClient().getLastName(),
                membership.getPlan().getId(),
                membership.getPlan().getName(),
                membership.getAccessToken(),
                membership.getStartDate().atStartOfDay(ZoneId.systemDefault()).toInstant(),
                membership.getEndDate().atTime(23, 59).atZone(ZoneId.systemDefault()).toInstant(),
                membership.getStatus(),
                message,
                null);
    }

    public record MembershipAssignmentContext(
            Client client,
            MembershipPlan plan,
            LocalDate startDate,
            LocalDate endDate,
            boolean hasPreviousMembership) {
    }
}
