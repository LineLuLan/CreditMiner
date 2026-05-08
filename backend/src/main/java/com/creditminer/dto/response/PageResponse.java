package com.creditminer.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Generic paginated response envelope.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private long total;
    private int page;
    private int size;
    private List<T> items;

    public static <S, T> PageResponse<T> from(Page<S> page, Function<S, T> mapper) {
        return PageResponse.<T>builder()
                .total(page.getTotalElements())
                .page(page.getNumber() + 1)
                .size(page.getSize())
                .items(page.getContent().stream().map(mapper).toList())
                .build();
    }
}
