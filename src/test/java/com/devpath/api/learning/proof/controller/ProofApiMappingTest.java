package com.devpath.api.learning.proof.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RequestMapping;

class ProofApiMappingTest {

  @Test
  void keepsExistingProofApiRootPaths() {
    assertRootPath(ProofCardController.class, "/api/me/proof-cards");
    assertRootPath(ProofCardShareController.class, "/api/proof-card-shares");
    assertRootPath(CertificateController.class, "/api/certificates");
  }

  private void assertRootPath(Class<?> controllerType, String expectedPath) {
    RequestMapping mapping = controllerType.getAnnotation(RequestMapping.class);
    assertThat(mapping.value()).containsExactly(expectedPath);
  }
}
