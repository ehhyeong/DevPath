package com.devpath.domain.builder.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Collections;
import java.util.List;

@Converter
public class TopicsConverter implements AttributeConverter<List<String>, String> {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Override
  public String convertToDatabaseColumn(List<String> topics) {
    if (topics == null || topics.isEmpty()) return "[]";
    try {
      return MAPPER.writeValueAsString(topics);
    } catch (JsonProcessingException e) {
      return "[]";
    }
  }

  @Override
  public List<String> convertToEntityAttribute(String json) {
    if (json == null || json.isBlank()) return Collections.emptyList();
    try {
      return MAPPER.readValue(json, new TypeReference<>() {});
    } catch (JsonProcessingException e) {
      return Collections.emptyList();
    }
  }
}
