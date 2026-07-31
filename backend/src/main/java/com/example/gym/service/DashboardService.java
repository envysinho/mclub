package com.example.gym.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.gym.dto.DashboardResponse;
import com.example.gym.dto.MovementResponse;
import com.example.gym.model.MembershipStatus;
import com.example.gym.repository.ClientMembershipRepository;
import com.example.gym.repository.ClientRepository;
import com.example.gym.repository.MovementRepository;
import com.example.gym.repository.ProductRepository;

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
    public DashboardResponse getDashboard() {
        membershipStatusService.refreshExpiredMemberships();

        LocalDate today = LocalDate.now();
        ZoneId zone = ZoneId.systemDefault();
        Instant startOfDay = today.atStartOfDay(zone).toInstant();
        Instant startOfTomorrow = today.plusDays(1).atStartOfDay(zone).toInstant();

        BigDecimal todayRevenue = movementRepository.sumAmountBetween(startOfDay, startOfTomorrow);
        List<MovementResponse> recentMovements = movementRepository.findTop20ByOrderByCreatedAtDesc().stream()
                .map(MovementResponse::from)
                .toList();

        return new DashboardResponse(
                clientRepository.count(),
                clientMembershipRepository.countByStatus(MembershipStatus.ACTIVE),
                productRepository.count(),
                todayRevenue,
                recentMovements);
    }
}
