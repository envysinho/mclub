package com.example.gym.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "cash_register_days",
        uniqueConstraints = @UniqueConstraint(columnNames = "business_date"))
public class CashRegisterDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_date", nullable = false)
    private LocalDate date;

    @Column(name = "opening_cash_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal openingCashAmount = BigDecimal.ZERO;

    @Column(name = "opening_yape_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal openingYapeAmount = BigDecimal.ZERO;

    @Column(name = "closing_cash_amount", precision = 10, scale = 2)
    private BigDecimal closingCashAmount;

    @Column(name = "closing_yape_amount", precision = 10, scale = 2)
    private BigDecimal closingYapeAmount;

    @Column(length = 500)
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public BigDecimal getOpeningCashAmount() {
        return openingCashAmount;
    }

    public void setOpeningCashAmount(BigDecimal openingCashAmount) {
        this.openingCashAmount = openingCashAmount;
    }

    public BigDecimal getOpeningYapeAmount() {
        return openingYapeAmount;
    }

    public void setOpeningYapeAmount(BigDecimal openingYapeAmount) {
        this.openingYapeAmount = openingYapeAmount;
    }

    public BigDecimal getClosingCashAmount() {
        return closingCashAmount;
    }

    public void setClosingCashAmount(BigDecimal closingCashAmount) {
        this.closingCashAmount = closingCashAmount;
    }

    public BigDecimal getClosingYapeAmount() {
        return closingYapeAmount;
    }

    public void setClosingYapeAmount(BigDecimal closingYapeAmount) {
        this.closingYapeAmount = closingYapeAmount;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
