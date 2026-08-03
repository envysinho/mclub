package com.example.gym.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.gym.dto.DashboardResponse;
import com.example.gym.dto.MovementResponse;
import com.example.gym.model.MembershipStatus;
import com.example.gym.model.Role;
import com.example.gym.repository.ClientMembershipRepository;
import com.example.gym.repository.ClientRepository;
import com.example.gym.repository.MovementRepository;
import com.example.gym.repository.ProductRepository;
import com.example.gym.security.UserPrincipal;

@Service
public class DashboardService {

    private final ClientRepository clientRepository;
    private final ClientMembershipRepository clientMembershipRepository;
    private final ProductRepository productRepository;
    private final MovementRepository movementRepository;
    private final MembershipStatusService membershipStatusService;

    public DashboardService(
            ClientRepository clientRepository,
            ClientMembershipRepository clientMembershipRepository,
            ProductRepository productRepository,
            MovementRepository movementRepository,
            MembershipStatusService membershipStatusService) {
        this.clientRepository = clientRepository;
        this.clientMembershipRepository = clientMembershipRepository;
        this.productRepository = productRepository;
        this.movementRepository = movementRepository;
        this.membershipStatusService = membershipStatusService;
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(Authentication authentication) {
        membershipStatusService.refreshExpiredMemberships();

        LocalDate today = LocalDate.now();
        ZoneId zone = ZoneId.systemDefault();
        Instant startOfDay = today.atStartOfDay(zone).toInstant();
        Instant startOfTomorrow = today.plusDays(1).atStartOfDay(zone).toInstant();

        boolean userOnly = isUser(authentication);
        Long userId = userOnly ? authenticatedUserId(authentication) : null;

        BigDecimal todayRevenue = userOnly
                ? movementRepository.sumAmountByCreatedByIdBetween(userId, startOfDay, startOfTomorrow)
                : movementRepository.sumAmountBetween(startOfDay, startOfTomorrow);
        var movements = userOnly
                ? movementRepository.findTop20ByCreatedByIdOrderByCreatedAtDesc(userId)
                : movementRepository.findTop20ByOrderByCreatedAtDesc();
        List<MovementResponse> recentMovements = movements.stream()
                .map(MovementResponse::from)
                .toList();

        return new DashboardResponse(
                clientRepository.count(),
                clientMembershipRepository.countByStatus(MembershipStatus.ACTIVE),
                productRepository.count(),
                todayRevenue,
                recentMovements);
    }

    private boolean isUser(Authentication authentication) {
        return authentication != null
                && authentication.getPrincipal() instanceof UserPrincipal principal
                && principal.getUser().getRole() == Role.USER;
    }

    private Long authenticatedUserId(Authentication authentication) {
        return ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
    }
}
