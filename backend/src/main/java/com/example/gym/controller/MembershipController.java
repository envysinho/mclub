package com.example.gym.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.gym.dto.AssignMembershipRequest;
import com.example.gym.dto.CreateMembershipQrLinkRequest;
import com.example.gym.dto.CreateMembershipPlanRequest;
import com.example.gym.dto.MembershipAssignmentResponse;
import com.example.gym.dto.MembershipPlanResponse;
import com.example.gym.dto.MembershipQrLinkResponse;
import com.example.gym.dto.MembershipValidationResponse;
import com.example.gym.dto.ValidateMembershipTokenRequest;
import com.example.gym.dto.UpdateMembershipPlanRequest;
import com.example.gym.security.UserPrincipal;
import com.example.gym.service.MembershipQrDownloadService;
import com.example.gym.service.MembershipService;
import com.example.gym.service.DeleteConfirmationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class MembershipController {

    private final MembershipService membershipService;
    private final DeleteConfirmationService deleteConfirmationService;
    private final MembershipQrDownloadService membershipQrDownloadService;

    public MembershipController(
            MembershipService membershipService,
            DeleteConfirmationService deleteConfirmationService,
            MembershipQrDownloadService membershipQrDownloadService) {
        this.membershipService = membershipService;
        this.deleteConfirmationService = deleteConfirmationService;
        this.membershipQrDownloadService = membershipQrDownloadService;
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
    public void deletePlan(
            @PathVariable("id") Long id,
            @RequestHeader(name = "X-Confirm-Password", required = false) String confirmationPassword,
            Authentication authentication) {
        deleteConfirmationService.verify(authentication, confirmationPassword);
        membershipService.deletePlan(id);
    }

    @PostMapping("/memberships")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipAssignmentResponse assignMembership(@Valid @RequestBody AssignMembershipRequest request, Authentication authentication) {
        return membershipService.assignMembership(request, authenticatedUser(authentication));
    }

    @PostMapping("/memberships/validate")
    public MembershipValidationResponse validateToken(@Valid @RequestBody ValidateMembershipTokenRequest request) {
        return membershipService.validateMembershipToken(request.token());
    }

    @PostMapping("/memberships/{membershipId}/qr-download-links")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipQrLinkResponse createQrDownloadLink(
            @PathVariable("membershipId") Long membershipId,
            @Valid @RequestBody CreateMembershipQrLinkRequest request) {
        return membershipQrDownloadService.createDownloadLink(membershipId, request);
    }

    @GetMapping(value = "/membership-qr/{downloadToken}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> downloadQr(@PathVariable("downloadToken") String downloadToken) {
        MembershipQrDownloadService.QrDownload download = membershipQrDownloadService.getDownload(downloadToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.filename() + "\"")
                .contentType(MediaType.IMAGE_PNG)
                .body(download.imageBytes());
    }

    private com.example.gym.entity.User authenticatedUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUser();
        }
        return null;
    }
}
