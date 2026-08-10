package com.devpath.config;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;
import org.springframework.util.FileCopyUtils;

@Component
@Profile({"local", "dev"})
@RequiredArgsConstructor
public class LocalSeedSqlExecutor {

  private final JdbcTemplate jdbcTemplate;

  public void execute(String resourceName) {
    jdbcTemplate.execute(read(resourceName));
  }

  public void executeSeparated(String resourceName, String separator) {
    ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
    populator.setSqlScriptEncoding(StandardCharsets.UTF_8.name());
    populator.setSeparator(separator);
    populator.addScript(new ClassPathResource(resourceName));

    jdbcTemplate.execute(
        (ConnectionCallback<Void>)
            connection -> {
              populator.populate(connection);
              return null;
            });
  }

  public <T> List<T> query(String resourceName, RowMapper<T> rowMapper) {
    return jdbcTemplate.query(read(resourceName), rowMapper);
  }

  private String read(String resourceName) {
    ClassPathResource resource = new ClassPathResource(resourceName);

    try (InputStreamReader reader =
        new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
      return FileCopyUtils.copyToString(reader);
    } catch (IOException ex) {
      // A missing seed script must stop startup instead of leaving partially restored demo data.
      throw new IllegalStateException("Failed to read local seed SQL: " + resourceName, ex);
    }
  }
}
