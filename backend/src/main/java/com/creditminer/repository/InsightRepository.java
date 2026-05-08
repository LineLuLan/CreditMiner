package com.creditminer.repository;

import com.creditminer.entity.Insight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InsightRepository extends JpaRepository<Insight, Long> {

    List<Insight> findAllByOrderByPriorityAsc();

    List<Insight> findByCategoryOrderByPriorityAsc(String category);
}
