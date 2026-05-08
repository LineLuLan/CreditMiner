package com.creditminer.repository;

import com.creditminer.entity.PredictionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PredictionLogRepository extends JpaRepository<PredictionLog, Long> {
}
