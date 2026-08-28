package com.example.gym.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.AssignMembershipRequest;
import com.example.gym.dto.ClientAttendanceResponse;
import com.example.gym.dto.CreateMembershipPlanRequest;
import com.example.gym.dto.MembershipAssignmentResponse;
import com.example.gym.dto.MembershipPlanResponse;
import com.example.gym.dto.MembershipValidationResponse;
import com.example.gym.dto.RenewMembershipRequest;
import com.example.gym.dto.UpdateMembershipPlanRequest;
import com.example.gym.entity.Client;
import com.example.gym.entity.ClientMembership;
import com.example.gym.entity.MembershipPlan;
import com.example.gym.entity.Movement;
import com.example.gym.entity.User;
import com.example.gym.model.MembershipStatus;
import com.example.gym.model.MovementType;
import com.example.gym.model.PaymentMethod;
import com.example.gym.repository.ClientRepository;
import com.example.gym.repository.ClientMembershipRepository;
import com.example.gym.repository.MembershipPlanRepository;
import com.example.gym.repository.MovementRepository;

@Service
public class MembershipService {

    private final ClientRepository clientRepository;
    private final MembershipPlanRepository membershipPlanRepository;
    private final ClientMembershipRepository clientMembershipRepository;
    private final MovementRepository movementRepository;
    private final MembershipValidationService membershipValidationService;
    private final MembershipStatusService membershipStatusService;
    private final ClientAttendanceService clientAttendanceService;

    public MembershipService(
            ClientRepository clientRepository,
            MembershipPlanRepository membershipPlanRepository,
            ClientMembershipRepository clientMembershipRepository,
            MovementRepository movementRepository,
            MembershipValidationService membershipValidationService,
            MembershipStatusService membershipStatusService,
            ClientAttendanceService clientAttendanceService) {
        this.clientRepository = clientRepository;
        this.membershipPlanRepository = membershipPlanRepository;
        this.clientMembershipRepository = clientMembershipRepository;
        this.movementRepository = movementRepository;
        this.membershipValidationService = membershipValidationService;
        this.membershipStatusService = membershipStatusService;
        this.clientAttendanceService = clientAttendanceService;
    }

    @Transactional(readOnly = true)
    public List<MembershipPlanResponse> findAllPlans() {
        return membershipPlanRepository.findAll().stream()
                .map(MembershipPlanResponse::from)
                .toList();
    }

    @Transactional
    public MembershipPlanResponse createPlan(CreateMembershipPlanRequest request) {
        MembershipPlan plan = new MembershipPlan();
        applyPlanFields(plan, request.name(), request.price(), request.durationDays(), request.description());
        return MembershipPlanResponse.from(membershipPlanRepository.save(plan));
    }

    @Transactional
    public MembershipPlanResponse updatePlan(Long id, UpdateMembershipPlanRequest request) {
        MembershipPlan plan = getPlanOrThrow(id);
        applyPlanFields(plan, request.name(), request.price(), request.durationDays(), request.description());
        return MembershipPlanResponse.from(membershipPlanRepository.save(plan));
    }

    @Transactional
    public void deletePlan(Long id) {
        MembershipPlan plan = getPlanOrThrow(id);
        membershipPlanRepository.delete(plan);
    }

    @Transactional
    public MembershipAssignmentResponse assignMembership(AssignMembershipRequest request, User createdBy) {
        MembershipValidationService.MembershipAssignmentContext context = membershipValidationService.validate(request);

        ClientMembership saved = createMembership(
                context.client(),
                context.plan(),
                context.startDate(),
                context.endDate(),
                MembershipStatus.ACTIVE);
        saveMembershipMovement(
                saved,
                context.hasPreviousMembership() ? MovementType.MEMBERSHIP_RENEWAL : MovementType.MEMBERSHIP_SALE,
                request.paymentMethod(),
                request.yapeAmount(),
                request.cashAmount(),
                createdBy);

        return MembershipAssignmentResponse.from(saved);
    }

    @Transactional
    public MembershipAssignmentResponse renewMembership(RenewMembershipRequest request, User createdBy) {
        membershipStatusService.refreshExpiredMemberships();

        Client client = clientRepository.findById(request.clientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));

        if (!client.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El cliente esta inactivo");
        }

        MembershipPlan plan = getPlanOrThrow(request.planId());
        LocalDate startDate = request.startDate() != null
                ? request.startDate()
                : suggestedRenewalStartDate(client.getId());
        LocalDate endDate = request.endDate() != null ? request.endDate() : startDate.plusDays(plan.getDurationDays());

        validateDateRange(startDate, endDate);
        validateRenewalDoesNotOverlap(client.getId(), startDate);

        MembershipStatus status = startDate.isAfter(LocalDate.now())
                ? MembershipStatus.PENDING
                : MembershipStatus.ACTIVE;
        ClientMembership saved = createMembership(client, plan, startDate, endDate, status);
        saveMembershipMovement(
                saved,
                MovementType.MEMBERSHIP_RENEWAL,
                request.paymentMethod(),
                request.yapeAmount(),
                request.cashAmount(),
                createdBy);

        return MembershipAssignmentResponse.from(saved);
    }

    private ClientMembership createMembership(
            Client client,
            MembershipPlan plan,
            LocalDate startDate,
            LocalDate endDate,
            MembershipStatus status) {
        ClientMembership membership = new ClientMembership();
        membership.setClient(client);
        membership.setPlan(plan);
        membership.setStartDate(startDate);
        membership.setEndDate(endDate);
        membership.setStatus(status);
        membership.setAccessToken(generateAccessToken());
        return clientMembershipRepository.save(membership);
    }

    private void saveMembershipMovement(
            ClientMembership membership,
            MovementType type,
            PaymentMethod paymentMethod,
            BigDecimal yapeAmount,
            BigDecimal cashAmount,
            User createdBy) {
        Movement movement = new Movement();
        movement.setType(type);
        movement.setDescription("Membresía " + membership.getPlan().getName());
        movement.setAmount(membership.getPlan().getPrice());
        movement.setQuantity(1);
        movement.setClient(membership.getClient());
        movement.setCreatedBy(createdBy);
        movement.setReferenceId(membership.getId());
        movement.setPaymentMethod(paymentMethod);
        setMixedPaymentAmounts(movement, membership.getPlan().getPrice(), paymentMethod, yapeAmount, cashAmount);
        movementRepository.save(movement);
    }

    @Transactional
    public MembershipValidationResponse validateMembershipToken(String token, User registeredBy) {
        MembershipValidationResponse response = membershipValidationService.validateToken(token);
        if (!response.valid()) {
            return response;
        }

        ClientAttendanceResponse attendance = clientAttendanceService.registerToday(response.clientId(), registeredBy);
        return response.withAttendance(attendance);
    }

    private String generateAccessToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private LocalDate suggestedRenewalStartDate(Long clientId) {
        return clientMembershipRepository.findFirstByClientIdAndStatusInOrderByEndDateDesc(
                        clientId,
                        List.of(MembershipStatus.ACTIVE, MembershipStatus.PENDING))
                .map(existing -> existing.getEndDate().plusDays(1))
                .orElse(LocalDate.now());
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de fin no puede ser anterior al inicio");
        }
    }

    private void validateRenewalDoesNotOverlap(Long clientId, LocalDate startDate) {
        clientMembershipRepository.findFirstByClientIdAndStatusInOrderByEndDateDesc(
                        clientId,
                        List.of(MembershipStatus.ACTIVE, MembershipStatus.PENDING))
                .ifPresent(existing -> {
                    if (!startDate.isAfter(existing.getEndDate())) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "La renovacion debe iniciar despues de la vigencia ya registrada hasta "
                                        + existing.getEndDate());
                    }
                });
    }

    private void setMixedPaymentAmounts(
            Movement movement,
            BigDecimal total,
            PaymentMethod paymentMethod,
            BigDecimal yapeAmount,
            BigDecimal cashAmount) {
        if (paymentMethod != PaymentMethod.MIXTO) {
            return;
        }

        if (yapeAmount == null || cashAmount == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Para pago mixto ingresa el monto en Yape y en efectivo");
        }

        if (yapeAmount.compareTo(BigDecimal.ZERO) < 0 || cashAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Los montos de pago no pueden ser negativos");
        }

        BigDecimal sum = yapeAmount.add(cashAmount);
        if (sum.compareTo(total) != 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La suma de Yape y efectivo debe ser igual al total (" + total + ")");
        }

        movement.setYapeAmount(yapeAmount);
        movement.setCashAmount(cashAmount);
    }

    MembershipPlan getPlanOrThrow(Long id) {
        return membershipPlanRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan no encontrado"));
    }

    private void applyPlanFields(
            MembershipPlan plan,
            String name,
            BigDecimal price,
            int durationDays,
            String description) {
        plan.setName(name.trim());
        plan.setPrice(price);
        plan.setDurationDays(durationDays);
        plan.setDescription(trimToNull(description));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
