package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.domain.workspace.entity.WorkspaceAiDesignJob;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignJobRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class WorkspaceAiDesignJobStoreTest {

  @Test
  void fallsBackToDatabaseWhenRedisIsUnavailable() {
    WorkspaceAiDesignJobRepository repository = mock(WorkspaceAiDesignJobRepository.class);
    StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
    @SuppressWarnings("unchecked")
    ValueOperations<String, String> values = mock(ValueOperations.class);
    WorkspaceAiDesignJob job = new WorkspaceAiDesignJob(7L, "{}");
    String cacheKey = "workspace:ai-design:job:" + job.getId();
    when(redisTemplate.opsForValue()).thenReturn(values);
    when(values.get(cacheKey)).thenThrow(new RedisConnectionFailureException("offline"));
    when(repository.findById(job.getId())).thenReturn(Optional.of(job));
    WorkspaceAiDesignJobStore store =
        new WorkspaceAiDesignJobStore(repository, redisTemplate, new ObjectMapper());

    Optional<WorkspaceAiDesignJob> found = store.find(job.getId());

    assertThat(found).containsSame(job);
    verify(repository).findById(job.getId());
  }
}
