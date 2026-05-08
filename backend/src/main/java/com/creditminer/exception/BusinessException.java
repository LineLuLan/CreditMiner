package com.creditminer.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Domain-level exception thrown by services to signal expected failure modes.
 *
 * <p>Carries a stable error code that maps to {@link HttpStatus} via
 * {@link GlobalExceptionHandler}. The error code becomes the
 * {@code error.code} field in the JSON envelope returned to clients.</p>
 *
 * <p>Standard codes (see docs/BE_Handoff.md §2):
 * {@code VALIDATION_ERROR}, {@code NOT_FOUND}, {@code MODEL_NOT_LOADED},
 * {@code INFERENCE_ERROR}, {@code DB_ERROR}.</p>
 */
@Getter
public class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public BusinessException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static BusinessException notFound(String entity, Object id) {
        return new BusinessException("NOT_FOUND", HttpStatus.NOT_FOUND,
                String.format("%s with id %s not found", entity, id));
    }

    public static BusinessException modelNotLoaded() {
        return new BusinessException("MODEL_NOT_LOADED", HttpStatus.SERVICE_UNAVAILABLE,
                "Models are still warming up. Please retry in a few seconds.");
    }

    public static BusinessException inferenceError(String detail) {
        return new BusinessException("INFERENCE_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, detail);
    }
}
