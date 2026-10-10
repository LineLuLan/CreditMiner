package com.creditminer.repository;

import com.creditminer.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Page<Customer> findByDefaultFlag(String defaultFlag, Pageable pageable);
    Page<Customer> findByClusterId(Integer clusterId, Pageable pageable);
    long countByDefaultFlag(String defaultFlag);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.isOutlier = true")
    long countOutliers();

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.isAnomaly = true")
    long countAnomalies();

    @Query("SELECT AVG(c.payRatio) FROM Customer c")
    Double avgPayRatio();

    @Query("SELECT AVG(c.avgUtilization) FROM Customer c")
    Double avgUtilization();

    @Query("SELECT c.riskTier, COUNT(c) FROM Customer c GROUP BY c.riskTier")
    List<Object[]> riskTierBreakdown();

    @Query(value = """
            SELECT * FROM customers
            WHERE is_anomaly = true
            ORDER BY centroid_distance DESC NULLS LAST, client_id ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<Customer> findTopAnomalies(@Param("limit") int limit);
}
