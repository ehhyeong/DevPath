package com.devpath.api.job.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.job.dto.JobkoreaJobRequest;
import com.devpath.common.config.JobkoreaProperties;
import com.devpath.common.exception.CustomException;
import org.junit.jupiter.api.Test;

class JobkoreaApiClientTest {

  @Test
  void missingEndpointFailsBeforeReturningACollectionResult() {
    JobkoreaProperties properties = new JobkoreaProperties();
    JobkoreaApiClient client = new JobkoreaApiClient(properties);

    assertThatThrownBy(
            () ->
                client.search(
                    new JobkoreaJobRequest.Search(20, 1, 1, "Spring", null, null, null, false)))
        .isInstanceOf(CustomException.class);
  }
}
