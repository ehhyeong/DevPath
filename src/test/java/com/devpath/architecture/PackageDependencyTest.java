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
  static final ArchRule ROADMAP_MUST_NOT_DEPEND_ON_ADMIN =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.roadmap..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.admin..")
          .because("roadmap feature code must remain reusable without the admin API");

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
  static final ArchRule JOB_ROADMAP_API_DEPENDENCY_MUST_STAY_IN_WRITER =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.job..")
          .and()
          .doNotHaveFullyQualifiedName("com.devpath.api.job.service.JobSkillRoadmapWriter")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.roadmap..")
          .because("job roadmap integration must stay behind its dedicated writer component");

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
  static final ArchRule INSTRUCTOR_EVALUATION_API_DEPENDENCY_MUST_STAY_IN_QUIZ_EDITOR =
      noClasses()
          .that()
          .resideInAPackage("com.devpath.api.instructor..")
          .and()
          .doNotHaveFullyQualifiedName("com.devpath.api.instructor.service.InstructorQuizEditor")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.devpath.api.evaluation..")
          .because("instructor evaluation integration must stay in its quiz editor component");
}
