package com.example.gym.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.gym.security.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final String allowedOrigins;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            @Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/users", "/api/users/**")
                        .hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/users").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/users/*/impersonate").hasRole("SUDO")
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("SUDO")
                        .requestMatchers(HttpMethod.GET, "/api/dashboard").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/movements").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/movements/product-sale")
                        .hasAnyRole("SUDO", "ADMIN", "USER")
                        .requestMatchers(HttpMethod.DELETE, "/api/movements/**").hasRole("SUDO")
                        .requestMatchers(HttpMethod.GET, "/api/inventory/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/inventory/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/reports/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/cash-register", "/api/cash-register/**")
                        .authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/cash-register", "/api/cash-register/**")
                        .hasAnyRole("SUDO", "ADMIN", "USER")
                        .requestMatchers(HttpMethod.GET, "/api/expenses", "/api/expenses/**")
                        .authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/expenses", "/api/expenses/**")
                        .hasAnyRole("SUDO", "ADMIN", "USER")
                        .requestMatchers(HttpMethod.GET, "/api/clients/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/clients")
                        .hasAnyRole("SUDO", "ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/api/clients/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/clients/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/membership-plans/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/membership-qr/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/memberships")
                        .hasAnyRole("SUDO", "ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/api/memberships/*/qr-download-links")
                        .hasAnyRole("SUDO", "ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/api/membership-plans").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/membership-plans/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/membership-plans/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/products/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/products").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/products/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasAnyRole("SUDO", "ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
