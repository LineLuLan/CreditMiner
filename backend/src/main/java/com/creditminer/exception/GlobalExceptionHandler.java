package com.creditminer.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Translates exceptions into the JSON error envelope documented in
 * {@code docs/BE_Handoff.md §2}.
 *
 * <p>Shape:
 * <pre>{@code
 * { "error": { "code": "VALIDATION_ERROR", "message": "...",
 *              "details": {...}, "timestamp": "...", "path": "/api/..." } }
 * }</pre>
 * </p>
 */
@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusiness(BusinessException ex,
                                                              HttpServletRequest req) {
        log.warn("Business error [{}] at {}: {}", ex.getCode(), req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
                .body(envelope(ex.getCode(), ex.getMessage(), null, req));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex,
                                                                HttpServletRequest req) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> fe.getDefaultMessage() == null ? "invalid" : fe.getDefaultMessage(),
                        (a, b) -> a));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(envelope("VALIDATION_ERROR", "Request validation failed",
                        Map.of("fields", fieldErrors), req));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleMalformedJson(HttpMessageNotReadableException ex,
                                                                   HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(envelope("VALIDATION_ERROR", "Malformed JSON request body",
                        Map.of("reason", ex.getMostSpecificCause().getMessage()), req));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex,
                                                                         HttpServletRequest req) {
        Map<String, String> violations = ex.getConstraintViolations().stream()
                .collect(Collectors.toMap(
                        v -> v.getPropertyPath().toString(),
                        v -> v.getMessage() == null ? "invalid" : v.getMessage(),
                        (a, b) -> a));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(envelope("VALIDATION_ERROR", "Request parameter validation failed",
                        Map.of("violations", violations), req));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                                  HttpServletRequest req) {
        String requiredType = ex.getRequiredType() == null ? "unknown" : ex.getRequiredType().getSimpleName();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(envelope("VALIDATION_ERROR",
                        String.format("Parameter '%s' has invalid value '%s' (expected %s)",
                                ex.getName(), ex.getValue(), requiredType),
                        null, req));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex,
                                                                        HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(envelope("METHOD_NOT_ALLOWED",
                        String.format("Method %s not supported for this endpoint", ex.getMethod()),
                        Map.of("supported", ex.getSupportedHttpMethods() == null
                                ? java.util.List.of()
                                : ex.getSupportedHttpMethods()),
                        req));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex,
                                                                HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(envelope("NOT_FOUND",
                        String.format("No endpoint at %s", req.getRequestURI()),
                        null, req));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception ex, HttpServletRequest req) {
        log.error("Unhandled error at {}", req.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(envelope("INTERNAL_ERROR", "Unexpected server error", null, req));
    }

    private static Map<String, Object> envelope(String code, String message,
                                                Map<String, ?> details, HttpServletRequest req) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code);
        error.put("message", message);
        if (details != null) error.put("details", details);
        error.put("timestamp", Instant.now().toString());
        error.put("path", req.getRequestURI());
        return Map.of("error", error);
    }
}
