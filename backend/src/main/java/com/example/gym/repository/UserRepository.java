package com.example.gym.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.User;
import com.example.gym.model.Role;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    long countByRole(Role role);
}
