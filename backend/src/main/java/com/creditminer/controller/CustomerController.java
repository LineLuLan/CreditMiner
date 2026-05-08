package com.creditminer.controller;

import com.creditminer.dto.response.CustomerSummaryResponse;
import com.creditminer.dto.response.PageResponse;
import com.creditminer.entity.Customer;
import com.creditminer.exception.BusinessException;
import com.creditminer.repository.CustomerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/customers} — paginated list and detail.
 *
 * <p>See {@code docs/BE_Handoff.md §3.5 - §3.6}.</p>
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Customer lookup")
public class CustomerController {

    private final CustomerRepository repo;

    @GetMapping
    @Operation(summary = "Paginated list of customers (with optional filter/sort)")
    public PageResponse<CustomerSummaryResponse> list(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "attritionFlag", required = false) String attritionFlag,
            @RequestParam(value = "clusterId", required = false) Integer clusterId,
            @RequestParam(value = "sort", defaultValue = "clientNum,asc") String sort) {

        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(100, size), parseSort(sort));
        Page<Customer> result;
        if (attritionFlag != null) {
            result = repo.findByAttritionFlag(attritionFlag, pageable);
        } else if (clusterId != null) {
            result = repo.findByClusterId(clusterId, pageable);
        } else {
            result = repo.findAll(pageable);
        }
        return PageResponse.from(result, this::toSummary);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Single customer detail")
    public Customer detail(@PathVariable("id") Long clientNum) {
        return repo.findById(clientNum)
                .orElseThrow(() -> BusinessException.notFound("Customer", clientNum));
    }

    private CustomerSummaryResponse toSummary(Customer c) {
        return CustomerSummaryResponse.builder()
                .clientNum(c.getClientNum())
                .attritionFlag(c.getAttritionFlag())
                .customerAge(c.getCustomerAge())
                .gender(c.getGender())
                .cardCategory(c.getCardCategory())
                .customerTier(c.getCustomerTier())
                .riskScore(c.getRiskScore() == null ? null : c.getRiskScore().doubleValue())
                .clusterId(c.getClusterId())
                .isOutlier(c.getIsOutlier())
                .isAnomaly(c.getIsAnomaly())
                .build();
    }

    private Sort parseSort(String sort) {
        // Format "field,asc|desc"
        String[] parts = sort.split(",");
        if (parts.length != 2) return Sort.unsorted();
        Sort.Direction dir = "desc".equalsIgnoreCase(parts[1]) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(dir, parts[0].trim());
    }
}
