package com.example.gym.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.MembershipPlan;

public interface MembershipPlanRepository extends JpaRepository<MembershipPlan, Long> {
}
