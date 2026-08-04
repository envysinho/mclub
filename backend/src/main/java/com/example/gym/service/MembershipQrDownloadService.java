package com.example.gym.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.example.gym.dto.CreateMembershipQrLinkRequest;
import com.example.gym.dto.MembershipQrLinkResponse;
import com.example.gym.entity.ClientMembership;
import com.example.gym.repository.ClientMembershipRepository;

@Service
public class MembershipQrDownloadService {

    private static final Duration DOWNLOAD_TTL = Duration.ofMinutes(15);
    private static final int MAX_QR_IMAGE_BYTES = 512 * 1024;
    private static final Pattern SAFE_FILENAME_CHARS = Pattern.compile("[^a-zA-Z0-9._-]");

    private final ClientMembershipRepository clientMembershipRepository;
    private final ConcurrentMap<String, QrDownload> qrDownloads = new ConcurrentHashMap<>();

    public MembershipQrDownloadService(ClientMembershipRepository clientMembershipRepository) {
        this.clientMembershipRepository = clientMembershipRepository;
    }

    public MembershipQrLinkResponse createDownloadLink(Long membershipId, CreateMembershipQrLinkRequest request) {
        ClientMembership membership = clientMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membresía no encontrada"));

        if (!Objects.equals(membership.getAccessToken(), request.accessToken().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El token no pertenece a esta membresía");
        }

        byte[] imageBytes = decodeQrImage(request.imageBase64());
        Instant now = Instant.now();
        cleanupExpiredDownloads(now);

        String downloadToken = UUID.randomUUID().toString().replace("-", "");
        Instant expiresAt = now.plus(DOWNLOAD_TTL);
        qrDownloads.put(
                downloadToken,
                new QrDownload(imageBytes, sanitizeFilename(request.filename(), membershipId), expiresAt));

        String downloadUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/membership-qr/")
                .path(downloadToken)
                .toUriString();

        return new MembershipQrLinkResponse(downloadUrl, expiresAt, (int) DOWNLOAD_TTL.toMinutes());
    }

    public QrDownload getDownload(String downloadToken) {
        QrDownload download = qrDownloads.get(downloadToken);
        if (download == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El link del QR no existe");
        }

        if (download.expiresAt().isBefore(Instant.now())) {
            qrDownloads.remove(downloadToken);
            throw new ResponseStatusException(HttpStatus.GONE, "El link del QR expiró");
        }

        return download;
    }

    private byte[] decodeQrImage(String imageBase64) {
        String normalized = imageBase64.trim();
        int commaIndex = normalized.indexOf(',');
        if (commaIndex >= 0) {
            normalized = normalized.substring(commaIndex + 1);
        }

        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(normalized);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen del QR no es válida");
        }

        if (bytes.length == 0 || bytes.length > MAX_QR_IMAGE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen del QR excede el tamaño permitido");
        }

        if (!isPng(bytes)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen del QR debe ser PNG");
        }

        return bytes;
    }

    private boolean isPng(byte[] bytes) {
        return bytes.length >= 8
                && bytes[0] == (byte) 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4E
                && bytes[3] == 0x47
                && bytes[4] == 0x0D
                && bytes[5] == 0x0A
                && bytes[6] == 0x1A
                && bytes[7] == 0x0A;
    }

    private String sanitizeFilename(String filename, Long membershipId) {
        String fallback = "membresia-" + membershipId + ".png";
        if (filename == null || filename.isBlank()) {
            return fallback;
        }

        String safe = SAFE_FILENAME_CHARS.matcher(filename.trim()).replaceAll("-");
        return safe.toLowerCase().endsWith(".png") ? safe : safe + ".png";
    }

    private void cleanupExpiredDownloads(Instant now) {
        qrDownloads.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    public record QrDownload(byte[] imageBytes, String filename, Instant expiresAt) {
    }
}
