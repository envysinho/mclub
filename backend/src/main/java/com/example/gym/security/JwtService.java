package com.example.gym.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.gym.entity.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(String username) {
        return generateTokenSubject(username);
    }

    public String generateToken(User user) {
        return generateTokenSubject(user.getId().toString());
    }

    public String generateImpersonationToken(User user, User impersonator) {
        return generateTokenSubject(user.getId().toString(), impersonator);
    }

    public String generateTokenForUserId(Long userId) {
        return generateTokenSubject(userId.toString());
    }

    private String generateTokenSubject(String subject) {
        return generateTokenSubject(subject, null);
    }

    private String generateTokenSubject(String subject, User impersonator) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        var builder = Jwts.builder()
                .subject(subject)
                .issuedAt(now)
                .expiration(expiry);

        if (impersonator != null) {
            builder.claim("impersonatedById", impersonator.getId());
            builder.claim("impersonatedByUsername", impersonator.getUsername());
        }

        return builder.signWith(secretKey).compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);
            return claims.getExpiration().after(new Date());
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
