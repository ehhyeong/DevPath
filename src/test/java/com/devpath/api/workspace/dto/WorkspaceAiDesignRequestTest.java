package com.devpath.api.workspace.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

class WorkspaceAiDesignRequestTest {

  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  @Test
  void acceptsSupportedOptionsAndOptionalIdea() {
    WorkspaceAiDesignRequest request =
        new WorkspaceAiDesignRequest("mvp", "manual", "React", "Java / Spring Boot", "MySQL", null);

    assertThat(validator.validate(request)).isEmpty();
  }

  @Test
  void rejectsUnsupportedOptionsAndOversizedIdea() {
    WorkspaceAiDesignRequest request =
        new WorkspaceAiDesignRequest("hard", "custom", null, null, null, "아이디어".repeat(501));

    assertThat(validator.validate(request))
        .extracting(violation -> violation.getPropertyPath().toString())
        .containsExactlyInAnyOrder("difficulty", "stackMode", "idea");
  }
}
