package com.example.gym.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.Client;

public interface ClientRepository extends JpaRepository<Client, Long> {
}
