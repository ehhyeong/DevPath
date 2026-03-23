package com.devpath;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(
        properties = {
                "spring.sql.init.mode=always",
                "spring.jpa.defer-datasource-initialization=true"
        })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LearningApiSemanticsIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Long learnerId;
    private Long lessonIdWithoutProgress;
    private Long taggedLessonId;
    private Long anotherLessonId;

    @BeforeEach
    void setUp() {
        learnerId = jdbcTemplate.queryForObject(
                "select user_id from users where email = ?",
                Long.class,
                "learner@devpath.com"
        );

        lessonIdWithoutProgress = jdbcTemplate.queryForObject(
                """
                select min(l.lesson_id)
                from lessons l
                where not exists (
                  select 1
                  from lesson_progress lp
                  where lp.user_id = ? and lp.lesson_id = l.lesson_id
                )
                """,
                Long.class,
                learnerId
        );

        taggedLessonId = jdbcTemplate.queryForObject(
                """
                select min(l.lesson_id)
                from lessons l
                join course_sections cs on cs.section_id = l.section_id
                where exists (
                  select 1
                  from course_tag_maps ctm
                  where ctm.course_id = cs.course_id
                )
                """,
                Long.class
        );

        anotherLessonId = jdbcTemplate.queryForObject(
                """
                select min(lesson_id)
                from lessons
                where lesson_id <> ?
                """,
                Long.class,
                taggedLessonId
        );
    }

    @Test
    void getProgressAndPlayerConfigDoNotCreateRows() throws Exception {
        Integer beforeCount = jdbcTemplate.queryForObject(
                "select count(*) from lesson_progress where user_id = ? and lesson_id = ?",
                Integer.class,
                learnerId,
                lessonIdWithoutProgress
        );

        JsonNode progress = getAsLearner("/api/learning/sessions/{lessonId}/progress", lessonIdWithoutProgress);
        JsonNode playerConfig = getAsLearner("/api/learning/player/{lessonId}/config", lessonIdWithoutProgress);

        Integer afterCount = jdbcTemplate.queryForObject(
                "select count(*) from lesson_progress where user_id = ? and lesson_id = ?",
                Integer.class,
                learnerId,
                lessonIdWithoutProgress
        );

        assertThat(beforeCount).isZero();
        assertThat(afterCount).isZero();
        assertThat(progress.get("progressPercent").asInt()).isZero();
        assertThat(progress.get("progressSeconds").asInt()).isZero();
        assertThat(playerConfig.get("defaultPlaybackRate").asDouble()).isEqualTo(1.0D);
        assertThat(playerConfig.get("pipEnabled").asBoolean()).isFalse();
    }

    @Test
    void deleteNoteRejectsMismatchedLessonPath() throws Exception {
        JsonNode createdNote = postAsLearner(
                "/api/learning/lessons/{lessonId}/notes",
                Map.of("timestampSecond", 90, "content", "delete scope test"),
                HttpStatus.CREATED,
                taggedLessonId
        );

        mockMvc.perform(
                        delete("/api/learning/lessons/{lessonId}/notes/{noteId}", anotherLessonId, createdNote.get("noteId").asLong())
                                .with(authentication(learnerAuthentication())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void supplementRecommendationCanAutoGenerateWithoutNodeId() throws Exception {
        postAsLearner("/api/learning/sessions/{lessonId}/start", null, taggedLessonId);
        putAsLearner(
                "/api/learning/sessions/{lessonId}/progress",
                Map.of("progressPercent", 28, "progressSeconds", 420),
                taggedLessonId
        );
        postAsLearner(
                "/api/learning/lessons/{lessonId}/notes",
                Map.of("timestampSecond", 110, "content", "auto recommendation signal"),
                HttpStatus.CREATED,
                taggedLessonId
        );

        JsonNode autoRecommendation =
                postAsLearner("/api/learning/supplement-recommendations", null, HttpStatus.CREATED);

        assertThat(autoRecommendation.get("recommendationId").asLong()).isPositive();
        assertThat(autoRecommendation.get("nodeId").asLong()).isPositive();
        assertThat(autoRecommendation.get("priority").asInt()).isBetween(1, 3);
        assertThat(autoRecommendation.get("reason").asText()).isNotBlank().contains("OCR");
    }

    private JsonNode postAsLearner(String url, Object body, Object... uriVariables) throws Exception {
        return performAndReadData(post(url, uriVariables), body, HttpStatus.OK);
    }

    private JsonNode postAsLearner(String url, Object body, HttpStatus expectedStatus, Object... uriVariables)
            throws Exception {
        return performAndReadData(post(url, uriVariables), body, expectedStatus);
    }

    private JsonNode putAsLearner(String url, Object body, Object... uriVariables) throws Exception {
        return performAndReadData(put(url, uriVariables), body, HttpStatus.OK);
    }

    private JsonNode getAsLearner(String url, Object... uriVariables) throws Exception {
        return performAndReadData(get(url, uriVariables), null, HttpStatus.OK);
    }

    private JsonNode performAndReadData(
            MockHttpServletRequestBuilder builder,
            Object body,
            HttpStatus expectedStatus
    ) throws Exception {
        builder = builder.with(authentication(learnerAuthentication()));

        if (body != null) {
            builder = builder
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(body));
        }

        MvcResult result = mockMvc.perform(builder)
                .andExpect(status().is(expectedStatus.value()))
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    private UsernamePasswordAuthenticationToken learnerAuthentication() {
        return new UsernamePasswordAuthenticationToken(
                learnerId,
                null,
                AuthorityUtils.createAuthorityList("ROLE_LEARNER")
        );
    }
}
