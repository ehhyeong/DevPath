package com.devpath.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        // 보안 스키마의 이름 (스웨거 내부적으로 쓰이는 식별자)
        String jwtSchemeName = "jwtAuth";

        // 1. API 요청 헤더에 인증 정보(토큰)를 포함하도록 요구하는 설정
        SecurityRequirement securityRequirement = new SecurityRequirement().addList(jwtSchemeName);

        Components components = new Components()
                .addSecuritySchemes(jwtSchemeName, new SecurityScheme()
                        .name(jwtSchemeName)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT"));

        // 3. 위에서 만든 보안 설정과 기본 정보를 OpenAPI 객체에 담아서 반환
        return new OpenAPI()
                .info(new Info().title("DevPath API")
                        .description("DevPath 백엔드 API 명세서")
                        .version("v1.0.0"))
                .addSecurityItem(securityRequirement)
                .components(components);
    }
}