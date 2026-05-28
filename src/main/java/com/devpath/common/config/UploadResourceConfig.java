package com.devpath.common.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {

  @Value("${app.upload.dir:./uploads}")
  private String uploadBaseDir;

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    Path uploadPath = Paths.get(uploadBaseDir).toAbsolutePath().normalize();
    String location = uploadPath.toUri().toString();

    registry.addResourceHandler("/uploads/**").addResourceLocations(location);
  }
}
