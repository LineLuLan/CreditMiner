package com.creditminer.repository;

import com.creditminer.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * JPA access for {@link Customer}.
 *
 * <p>Heavy filtering uses Specification or {@code @Query} — not Querydsl —
 * to keep dep count low.</p>
 */
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Page<Customer> findByAttritionFlag(String attritionFlag, Pageable pageable);

    Page<Customer> findByClusterId(Integer clusterId, Pageable pageable);

    long countByAttritionFlag(String attritionFlag);

    @Query("SELECT AVG(c.riskScore) FROM Customer c")
    Double avgRiskScore();

    @Query("SELECT AVG(c.avgUtilizationRatio) FROM Customer c")
    Double avgUtilization();

    @Query("SELECT c.customerTier, COUNT(c) FROM Customer c GROUP BY c.customerTier")
    List<Object[]> tierBreakdown();

    @Query(value = """
            SELECT * FROM customers
            WHERE is_anomaly = true
            ORDER BY risk_score DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Customer> findTopAnomalies(@Param("limit") int limit);
}
