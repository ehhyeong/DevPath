package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {"spring.sql.init.mode=always", "spring.jpa.defer-datasource-initialization=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QnaTemplateIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private Long userId;

  @BeforeEach
  void setUp() {
    userId =
        jdbcTemplate.queryForObject(
            "select user_id from users order by user_id asc limit 1", Long.class);
  }

  @Test
  void qnaTemplateTableIncludesExpectedColumns() {
    List<String> columnNames =
        jdbcTemplate.queryForList(
            """
            select column_name
            from information_schema.columns
            where table_name = 'qna_question_templates'
            order by ordinal_position
            """,
            String.class);

    assertThat(columnNames)
        .containsExactlyInAnyOrder(
            "question_template_id",
            "template_type",
            "name",
            "description",
            "guide_example",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at");
  }

  @Test
  void qnaTemplateSeedMatchesActiveTemplateTypesInSortOrder() {
    List<String> templateTypes =
        jdbcTemplate.queryForList(
            """
            select template_type
            from qna_question_templates
            where is_active = true
            order by sort_order asc, question_template_id asc
            """,
            String.class);

    assertThat(templateTypes)
        .containsExactly(
            "DEBUGGING", "IMPLEMENTATION", "CODE_REVIEW", "CAREER", "STUDY", "PROJECT");
  }

  @Test
  void qnaTemplateEndpointReturnsActiveTemplatesInSortOrder() throws Exception {
    mockMvc
        .perform(get("/api/qna/templates").with(authentication(userAuthentication())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.length()").value(6))
        .andExpect(jsonPath("$.data[0].templateType").value("DEBUGGING"))
        .andExpect(jsonPath("$.data[0].name").isNotEmpty())
        .andExpect(jsonPath("$.data[0].description").isNotEmpty())
        .andExpect(jsonPath("$.data[0].guideExample").isNotEmpty())
        .andExpect(jsonPath("$.data[0].sortOrder").value(1))
        .andExpect(jsonPath("$.data[1].templateType").value("IMPLEMENTATION"))
        .andExpect(jsonPath("$.data[2].templateType").value("CODE_REVIEW"))
        .andExpect(jsonPath("$.data[3].templateType").value("CAREER"))
        .andExpect(jsonPath("$.data[4].templateType").value("STUDY"))
        .andExpect(jsonPath("$.data[5].templateType").value("PROJECT"))
        .andExpect(jsonPath("$.data[5].sortOrder").value(6));
  }

  @Test
  void openApiSpecIncludesQnaTemplateEndpoint() throws Exception {
    mockMvc
        .perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/qna/templates'].get").exists())
        .andExpect(jsonPath("$.paths['/api/qna/templates'].get.responses['200']").exists());
  }

  private UsernamePasswordAuthenticationToken userAuthentication() {
    return new UsernamePasswordAuthenticationToken(
        userId, null, AuthorityUtils.createAuthorityList("ROLE_LEARNER"));
  }
}
