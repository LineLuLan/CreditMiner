package com.creditminer.service;

import com.creditminer.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

/** Cached, read-only access to the generated Phase 10 sequence-mining artifact. */
@Service
@RequiredArgsConstructor
public class SequenceService {

    private final ObjectMapper mapper;

    @Value("${creditminer.data.phase10-sequences-json:data/processed/phase10_sequences.json}")
    private String sequencesPath;

    private volatile JsonNode cached;

    public JsonNode get() {
        JsonNode value = cached;
        if (value != null) return value;
        synchronized (this) {
            if (cached != null) return cached;
            File artifact = new File(sequencesPath);
            if (!artifact.isFile()) {
                // BusinessException is mapped by GlobalExceptionHandler; a raw ResponseStatusException
                // would be swallowed by its catch-all handler and surface as HTTP 500.
                throw new BusinessException("NOT_FOUND", HttpStatus.NOT_FOUND,
                        "Sequence mining artifact not found at " + sequencesPath);
            }
            try {
                JsonNode root = mapper.readTree(artifact);
                if (!(root instanceof ObjectNode object)) {
                    throw new IllegalStateException("Sequence mining artifact must be a JSON object");
                }
                cached = new SequenceNarrator().enrich(object);
                return cached;
            } catch (IOException exception) {
                throw new IllegalStateException("Failed to read sequence mining artifact at "
                        + sequencesPath, exception);
            }
        }
    }
}
