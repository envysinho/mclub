package com.example.gym.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.gym.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
}
