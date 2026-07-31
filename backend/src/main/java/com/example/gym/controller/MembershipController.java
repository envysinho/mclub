package com.example.gym.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.AssignMembershipRequest;
import com.example.gym.dto.CreateMembershipPlanRequest;
import com.example.gym.dto.MembershipPlanResponse;
import com.example.gym.dto.UpdateMembershipPlanRequest;
import com.example.gym.service.MembershipService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class MembershipController {

    private final MembershipService membershipService;

    public MembershipController(MembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @GetMapping("/membership-plans")
    public List<MembershipPlanResponse> listPlans() {
        return membershipService.findAllPlans();
    }

    @PostMapping("/membership-plans")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipPlanResponse createPlan(@Valid @RequestBody CreateMembershipPlanRequest request) {
        return membershipService.createPlan(request);
    }

    @PutMapping("/membership-plans/{id}")
    public MembershipPlanResponse updatePlan(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateMembershipPlanRequest request) {
        return membershipService.updatePlan(id, request);
    }

    @DeleteMapping("/membership-plans/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlan(@PathVariable("id") Long id) {
        membershipService.deletePlan(id);
    }

    @PostMapping("/memberships")
    @ResponseStatus(HttpStatus.CREATED)
    public void assignMembership(@Valid @RequestBody AssignMembershipRequest request) {
        membershipService.assignMembership(request);
    }
}
