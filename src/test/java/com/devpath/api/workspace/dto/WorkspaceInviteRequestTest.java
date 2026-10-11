package com.devpath.api.workspace.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;

class WorkspaceInviteRequestTest {
  @Test
  void acceptsValidEmailAndRejectsBlankInvalidAndOversizedValues() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      assertThat(validator.validate(new WorkspaceInviteRequest("member@example.com"))).isEmpty();
      for (String email : new String[] {"", "not-an-email", "a".repeat(250) + "@example.com"}) {
        assertThat(validator.validate(new WorkspaceInviteRequest(email))).isNotEmpty();
      }
    }
  }
}
