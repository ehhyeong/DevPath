package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.common.config.GeminiProperties;
import com.devpath.common.config.JobkoreaProperties;
import java.sql.Connection;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class AdminSystemHealthServiceTest {

  @Test
  void reportsExternalFeatureLossInsteadOfConfiguredSuccess() throws Exception {
    DataSource dataSource = mock(DataSource.class);
    Connection connection = mock(Connection.class);
    when(dataSource.getConnection()).thenReturn(connection);
    when(connection.isValid(2)).thenReturn(true);
    AdminSystemHealthService service =
        new AdminSystemHealthService(dataSource, new JobkoreaProperties(), new GeminiProperties());
    ReflectionTestUtils.setField(service, "ffmpegExecutable", "missing-devpath-ffmpeg");

    var health = service.checkHealth();

    assertThat(health.status()).isEqualTo("NORMAL");
    assertThat(health.jobkorea().status()).isEqualTo("UNCONFIGURED");
    assertThat(health.gemini().status()).isEqualTo("FALLBACK_ONLY");
    assertThat(health.ffmpeg().status()).isEqualTo("FALLBACK_ONLY");
  }
}
