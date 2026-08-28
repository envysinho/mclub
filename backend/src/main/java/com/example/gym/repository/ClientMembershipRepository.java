package com.example.gym.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.ClientMembership;
import com.example.gym.model.MembershipStatus;

public interface ClientMembershipRepository extends JpaRepository<ClientMembership, Long> {
    Optional<ClientMembership> findFirstByClientIdAndStatusOrderByEndDateDesc(Long clientId, MembershipStatus status);
    Optional<ClientMembership> findFirstByClientIdAndStatusInOrderByEndDateDesc(Long clientId, List<MembershipStatus> statuses);
    Optional<ClientMembership> findByAccessToken(String accessToken);
    long countByStatus(MembershipStatus status);
    long countByClientId(Long clientId);
    List<ClientMembership> findByStatusAndEndDateBefore(MembershipStatus status, LocalDate date);
    List<ClientMembership> findByStatusAndStartDateLessThanEqual(MembershipStatus status, LocalDate date);
}
