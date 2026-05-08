package com.creditminer.repository;

import com.creditminer.entity.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface RuleRepository extends JpaRepository<Rule, Long> {

    @Query("SELECT r FROM Rule r WHERE r.lift >= :minLift ORDER BY r.lift DESC")
    List<Rule> findByMinLift(@Param("minLift") BigDecimal minLift);

    @Query("SELECT r FROM Rule r WHERE r.lift >= :minLift AND r.category = :category ORDER BY r.lift DESC")
    List<Rule> findByMinLiftAndCategory(@Param("minLift") BigDecimal minLift,
                                        @Param("category") String category);
}
