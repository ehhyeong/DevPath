package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.AssignmentPrecheckRequest;
import com.devpath.api.evaluation.dto.request.CreateSubmissionFileRequest;
import com.devpath.api.evaluation.dto.response.AssignmentPrecheckResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.SubmissionType;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssignmentPrecheckService {

    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;

    // 과제 제출 전 README, 테스트, 린트, 파일 형식 기준으로 precheck를 수행한다.
    public AssignmentPrecheckResponse precheck(Long userId, Long assignmentId, AssignmentPrecheckRequest request) {
        getLearner(userId);
        Assignment assignment = getAvailableAssignment(assignmentId);

        boolean readmePassed = !Boolean.TRUE.equals(assignment.getReadmeRequired()) || Boolean.TRUE.equals(request.getHasReadme());
        boolean testPassed = !Boolean.TRUE.equals(assignment.getTestRequired()) || Boolean.TRUE.equals(request.getTestPassed());
        boolean lintPassed = !Boolean.TRUE.equals(assignment.getLintRequired()) || Boolean.TRUE.equals(request.getLintPassed());
        boolean fileFormatPassed = validateFileFormats(assignment, request.getFiles());

        int qualityScore = calculateQualityScore(readmePassed, testPassed, lintPassed, fileFormatPassed);
        boolean passed = readmePassed && testPassed && lintPassed && fileFormatPassed;

        return AssignmentPrecheckResponse.builder()
                .passed(passed)
                .readmePassed(readmePassed)
                .testPassed(testPassed)
                .lintPassed(lintPassed)
                .fileFormatPassed(fileFormatPassed)
                .qualityScore(qualityScore)
                .message(passed ? "precheck를 통과했습니다." : "precheck에서 실패한 항목이 있습니다.")
                .build();
    }

    // 학습자 역할인지 검증한다.
    private User getLearner(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getRole() != UserRole.ROLE_LEARNER) {
            throw new CustomException(ErrorCode.FORBIDDEN, "학습자만 과제 precheck를 수행할 수 있습니다.");
        }

        return user;
    }

    // 현재 제출 가능한 공개 과제인지 검증한다.
    private Assignment getAvailableAssignment(Long assignmentId) {
        Assignment assignment = assignmentRepository.findByIdAndIsDeletedFalse(assignmentId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "과제를 찾을 수 없습니다."));

        if (!Boolean.TRUE.equals(assignment.getIsActive()) || !Boolean.TRUE.equals(assignment.getIsPublished())) {
            throw new CustomException(ErrorCode.FORBIDDEN, "제출 가능한 과제가 아닙니다.");
        }

        return assignment;
    }

    // 허용 파일 형식 규칙을 검증한다.
    private boolean validateFileFormats(Assignment assignment, List<CreateSubmissionFileRequest> files) {
        SubmissionType submissionType = assignment.getSubmissionType();

        // TEXT나 URL 전용 과제는 파일이 없어도 통과 처리한다.
        if (submissionType == SubmissionType.TEXT || submissionType == SubmissionType.URL) {
            return true;
        }

        // FILE 또는 MULTIPLE 제출 과제는 최소 한 개 이상의 파일이 있어야 한다.
        if (files == null || files.isEmpty()) {
            return false;
        }

        // 허용 형식이 비어 있으면 파일 존재만으로 통과 처리한다.
        if (assignment.getAllowedFileFormats() == null || assignment.getAllowedFileFormats().isBlank()) {
            return true;
        }

        Set<String> allowedFormats = Arrays.stream(assignment.getAllowedFileFormats().split(","))
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());

        return files.stream().allMatch(file -> {
            String extension = extractExtension(file.getFileName(), file.getFileType());
            return allowedFormats.contains(extension);
        });
    }

    // 파일명이나 fileType에서 확장자를 추출해 소문자로 반환한다.
    private String extractExtension(String fileName, String fileType) {
        if (fileType != null && !fileType.isBlank()) {
            return fileType.trim().toLowerCase(Locale.ROOT).replace(".", "");
        }

        if (fileName == null || !fileName.contains(".")) {
            return "";
        }

        return fileName.substring(fileName.lastIndexOf('.') + 1).trim().toLowerCase(Locale.ROOT);
    }

    // README, 테스트, 린트, 파일 형식 각각 25점씩 부여하는 단순 품질 점수 계산식이다.
    private int calculateQualityScore(
            boolean readmePassed,
            boolean testPassed,
            boolean lintPassed,
            boolean fileFormatPassed
    ) {
        int score = 0;
        score += readmePassed ? 25 : 0;
        score += testPassed ? 25 : 0;
        score += lintPassed ? 25 : 0;
        score += fileFormatPassed ? 25 : 0;
        return score;
    }
}
