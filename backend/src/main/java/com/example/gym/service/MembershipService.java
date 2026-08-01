package com.example.gym.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.gym.dto.AssignMembershipRequest;
import com.example.gym.dto.CreateMembershipPlanRequest;
import com.example.gym.dto.MembershipPlanResponse;
import com.example.gym.dto.UpdateMembershipPlanRequest;
import com.example.gym.entity.Client;
import com.example.gym.entity.ClientMembership;
import com.example.gym.entity.MembershipPlan;
import com.example.gym.entity.Movement;
import com.example.gym.model.MembershipStatus;
import com.example.gym.model.MovementType;
import com.example.gym.model.PaymentMethod;
import com.example.gym.repository.ClientMembershipRepository;
import com.example.gym.repository.ClientRepository;
import com.example.gym.repository.MembershipPlanRepository;
import com.example.gym.repository.MovementRepository;

@Service
public class MembershipService {

    private final MembershipPlanRepository membershipPlanRepository;
    private final ClientMembershipRepository clientMembershipRepository;
    private final ClientRepository clientRepository;
    private final MovementRepository movementRepository;
    private final MembershipStatusService membershipStatusService;

    public MembershipService(
            MembershipPlanRepository membershipPlanRepository,
            ClientMembershipRepository clientMembershipRepository,
            ClientRepository clientRepository,
            MovementRepository movementRepository,
            MembershipStatusService membershipStatusService) {
        this.membershipPlanRepository = membershipPlanRepository;
        this.clientMembershipRepository = clientMembershipRepository;
        this.clientRepository = clientRepository;
        this.movementRepository = movementRepository;
        this.membershipStatusService = membershipStatusService;
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
    public ClientMembership assignMembership(AssignMembershipRequest request) {
        membershipStatusService.refreshExpiredMemberships();

        Client client = clientRepository.findById(request.clientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));
        MembershipPlan plan = getPlanOrThrow(request.planId());

        clientMembershipRepository.findFirstByClientIdAndStatusOrderByEndDateDesc(
                client.getId(), MembershipStatus.ACTIVE).ifPresent(existing -> {
            existing.setStatus(MembershipStatus.CANCELLED);
            clientMembershipRepository.save(existing);
        });

        LocalDate startDate = request.startDate() != null ? request.startDate() : LocalDate.now();
        LocalDate endDate = request.endDate() != null ? request.endDate() : startDate.plusDays(plan.getDurationDays());
        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de fin no puede ser anterior al inicio");
        }

        boolean hasPreviousMembership = clientMembershipRepository.countByClientId(client.getId()) > 0;

        ClientMembership membership = new ClientMembership();
        membership.setClient(client);
        membership.setPlan(plan);
        membership.setStartDate(startDate);
        membership.setEndDate(endDate);
        membership.setStatus(MembershipStatus.ACTIVE);
        ClientMembership saved = clientMembershipRepository.save(membership);

        Movement movement = new Movement();
        movement.setType(hasPreviousMembership ? MovementType.MEMBERSHIP_RENEWAL : MovementType.MEMBERSHIP_SALE);
        movement.setDescription("Membresía " + plan.getName());
        movement.setAmount(plan.getPrice());
        movement.setQuantity(1);
        movement.setClient(client);
        movement.setReferenceId(saved.getId());
        movement.setPaymentMethod(request.paymentMethod());
        setMixedPaymentAmounts(movement, plan.getPrice(), request.paymentMethod(), request.yapeAmount(), request.cashAmount());
        movementRepository.save(movement);

        return saved;
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
