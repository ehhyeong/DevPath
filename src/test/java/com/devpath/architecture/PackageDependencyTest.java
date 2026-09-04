package com.devpath.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.devpath", importOptions = ImportOption.DoNotIncludeTests.class)
class PackageDependencyTest {

  @ArchTest
  static final ArchRule DOMAIN_MUST_NOT_DEPEND_ON_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.domain..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api..")
          .because("domain code must remain independent of API representations and adapters");

  @ArchTest
  static final ArchRule COMMON_MUST_NOT_DEPEND_ON_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.common..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api..")
          .because("shared code must not depend on feature-specific API code");

  @ArchTest
  static final ArchRule COURSE_MUST_NOT_DEPEND_ON_ACTOR_API_PACKAGES =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.course..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.admin..", "com.devpath.api.learner..")
          .because("course owns public, learner, and admin course use cases");

  @ArchTest
  static final ArchRule ROADMAP_MUST_NOT_DEPEND_ON_ADMIN =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.roadmap..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.admin..")
          .because("roadmap feature code must remain reusable without the admin API");

  @ArchTest
  static final ArchRule ROADMAP_MUST_NOT_DEPEND_ON_LEARNING_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.roadmap..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.learning..")
          .because("roadmap and learning share course completion state through domain services");

  @ArchTest
  static final ArchRule BUILDER_AND_DASHBOARD_MUST_NOT_DEPEND_ON_ROADMAP_API =
      noClasses()
          .that()
          .resideInAnyPackage("com.devpath.api.builder..", "com.devpath.api.dashboard..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.roadmap..")
          .because("shared roadmap graph rules belong to the roadmap domain");

  @ArchTest
  static final ArchRule JOB_MUST_NOT_DEPEND_ON_LEARNING_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.job..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.learning..")
          .because("shared learning score collection belongs to the learning domain");

  @ArchTest
  static final ArchRule INSTRUCTOR_MUST_NOT_DEPEND_ON_ANALYTICS_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.instructor..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.analytics..")
          .because("shared analytics calculations belong to the analytics domain");

  @ArchTest
  static final ArchRule FEATURES_MUST_NOT_USE_INSTRUCTOR_NOTIFICATION_API_FOR_PUBLISHING =
      noClasses()
          .that()
          .resideInAnyPackage(
              "com.devpath.api.course..",
              "com.devpath.api.instructor..",
              "com.devpath.api.mentoring..",
              "com.devpath.api.qna..",
              "com.devpath.api.review..")
          .should()
          .dependOnClassesThat()
          .haveFullyQualifiedName(
              "com.devpath.api.notification.service.InstructorNotificationService")
          .because("cross-feature notification publishing belongs to the notification domain");

  @ArchTest
  static final ArchRule RECOMMENDATION_MUST_NOT_DEPEND_ON_LEARNER_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.recommendation..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.learner..")
          .because("the recommendation feature owns diagnosis without depending on learner APIs");

  @ArchTest
  static final ArchRule RECOMMENDATION_MUST_NOT_DEPEND_ON_LEARNING_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.recommendation..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.learning..")
          .because("recommendation changes consume learning signals through domain services");

  @ArchTest
  static final ArchRule LEARNER_MUST_NOT_DEPEND_ON_RECOMMENDATION_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.learner..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.recommendation..")
          .because("diagnosis and its recommendation flow belong to the recommendation feature");

  @ArchTest
  static final ArchRule SETTLEMENT_MUST_NOT_DEPEND_ON_ACTOR_API_PACKAGES =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.settlement..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.admin..", "com.devpath.api.instructor..")
          .because("settlement owns both admin operations and instructor revenue views");

  @ArchTest
  static final ArchRule REFUND_MUST_NOT_DEPEND_ON_ADMIN_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.refund..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.admin..")
          .because("refund owns both learner requests and admin review operations");

  @ArchTest
  static final ArchRule QNA_MUST_NOT_DEPEND_ON_INSTRUCTOR =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.qna..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.instructor..")
          .because("qna feature code must remain independent of the instructor API");

  @ArchTest
  static final ArchRule WORKSPACE_MUST_NOT_DEPEND_ON_QNA_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.workspace..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.qna..")
          .because("workspace-scoped Q&A belongs under the qna feature");

  @ArchTest
  static final ArchRule MENTORING_MUST_NOT_DEPEND_ON_QNA_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.mentoring..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.qna..")
          .because("mentoring-scoped Q&A belongs under the qna feature");

  @ArchTest
  static final ArchRule VOICE_MUST_NOT_DEPEND_ON_WORKSPACE_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.voice..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.workspace..")
          .because("voice owns its API responses while reusing workspace domain models");

  @ArchTest
  static final ArchRule AMBIGUOUS_API_COMMON_PACKAGE_MUST_REMAIN_EMPTY =
      noClasses()
          .should()
          .resideInAPackage("com.devpath.api.common..")
          .because("API contracts and components must belong to a concrete feature");

  @ArchTest
  static final ArchRule WORKSPACE_AI_API_DEPENDENCY_MUST_STAY_IN_REVIEWER =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.workspace..")
          .and()
          .doNotHaveFullyQualifiedName(
              "com.devpath.api.workspace.service.WorkspaceCodeReviewAiReviewer")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.ai..")
          .because("workspace AI integration must stay behind its dedicated reviewer component");

  @ArchTest
  static final ArchRule JOB_MUST_NOT_DEPEND_ON_ROADMAP_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.job..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.roadmap..")
          .because("job roadmap integration uses roadmap domain services instead of roadmap APIs");

  @ArchTest
  static final ArchRule RECOMMENDATION_MUST_NOT_DEPEND_ON_ROADMAP_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.recommendation..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.roadmap..")
          .because("recommendation changes use roadmap domain commands instead of roadmap APIs");

  @ArchTest
  static final ArchRule AMBIGUOUS_API_KANBAN_PACKAGE_MUST_REMAIN_EMPTY =
      noClasses()
          .should()
          .resideInAPackage("com.devpath.api.kanban..")
          .because("kanban task endpoints belong to the workspace feature");

  @ArchTest
  static final ArchRule TOP_LEVEL_API_PROOF_PACKAGE_MUST_REMAIN_EMPTY =
      noClasses()
          .should()
          .resideInAPackage("com.devpath.api.proof..")
          .because("proof APIs belong to the learning feature");

  @ArchTest
  static final ArchRule INSTRUCTOR_MUST_NOT_DEPEND_ON_EVALUATION_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.instructor..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.evaluation..")
          .because("instructor quiz generation uses a domain contract instead of evaluation APIs");

  @ArchTest
  static final ArchRule WORKSPACE_MUST_NOT_DEPEND_ON_AI_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.workspace..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.ai..")
          .because("workspace code reviews use the shared AI domain contract instead of AI APIs");

  @ArchTest
  static final ArchRule INSTRUCTOR_MUST_NOT_DEPEND_ON_QNA_OR_NOTIFICATION_API =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.instructor..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.qna..", "com.devpath.api.notification..")
          .because("instructor QnA uses domain publishing contracts instead of protocol APIs");
}
