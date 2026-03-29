package com.devpath;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:application-context-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE"
    })
@ActiveProfiles("test")
class DevPathApplicationTests {

  @Test
  void contextLoads() {}
}
