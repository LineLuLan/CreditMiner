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

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Credit-card client lookup")
public class CustomerController {
    private final CustomerRepository repo;

    @GetMapping
    @Operation(summary = "Paginated list of clients with optional target or cluster filter")
    public PageResponse<CustomerSummaryResponse> list(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "defaultFlag", required = false) String defaultFlag,
            @RequestParam(value = "clusterId", required = false) Integer clusterId,
            @RequestParam(value = "sort", defaultValue = "clientId,asc") String sort) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(100, size), parseSort(sort));
        Page<Customer> result = defaultFlag != null
                ? repo.findByDefaultFlag(defaultFlag, pageable)
                : clusterId != null ? repo.findByClusterId(clusterId, pageable) : repo.findAll(pageable);
        return PageResponse.from(result, CustomerController::toSummary);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Single client detail")
    public Customer detail(@PathVariable("id") Long clientId) {
        return repo.findById(clientId)
                .orElseThrow(() -> BusinessException.notFound("Customer", clientId));
    }

    public static CustomerSummaryResponse toSummary(Customer customer) {
        return CustomerSummaryResponse.builder()
                .clientId(customer.getClientId())
                .defaultFlag(customer.getDefaultFlag())
                .age(customer.getAge())
                .sex(customer.getSex())
                .education(customer.getEducation())
                .riskTier(customer.getRiskTier())
                .payRatio(customer.getPayRatio() == null ? null : customer.getPayRatio().doubleValue())
                .clusterId(customer.getClusterId())
                .isOutlier(customer.getIsOutlier())
                .isAnomaly(customer.getIsAnomaly())
                .build();
    }

    private static Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        if (parts.length != 2) return Sort.unsorted();
        Sort.Direction direction = "desc".equalsIgnoreCase(parts[1])
                ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(direction, parts[0].trim());
    }
}
