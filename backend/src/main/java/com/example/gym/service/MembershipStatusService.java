package com.example.gym.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.gym.entity.ClientMembership;
import com.example.gym.model.MembershipStatus;
import com.example.gym.repository.ClientMembershipRepository;

@Service
public class MembershipStatusService {

    private final ClientMembershipRepository clientMembershipRepository;

    public MembershipStatusService(ClientMembershipRepository clientMembershipRepository) {
        this.clientMembershipRepository = clientMembershipRepository;
    }

    @Transactional
    public void refreshExpiredMemberships() {
        List<ClientMembership> pending = clientMembershipRepository.findByStatusAndStartDateLessThanEqual(
                MembershipStatus.PENDING, LocalDate.now());
        for (ClientMembership membership : pending) {
            membership.setStatus(MembershipStatus.ACTIVE);
            clientMembershipRepository.save(membership);
        }

        List<ClientMembership> expired = clientMembershipRepository.findByStatusAndEndDateBefore(
                MembershipStatus.ACTIVE, LocalDate.now());
        for (ClientMembership membership : expired) {
            membership.setStatus(MembershipStatus.EXPIRED);
            clientMembershipRepository.save(membership);
        }
    }
}
