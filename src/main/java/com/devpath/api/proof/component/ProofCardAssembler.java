package com.devpath.api.proof.component;

import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.learning.entity.proof.SkillEvidenceType;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

// Proof Card 제목과 태그를 조립한다.
@Component
@RequiredArgsConstructor
public class ProofCardAssembler {

    // 노드 필수 태그 저장소다.
    private final NodeRequiredTagRepository nodeRequiredTagRepository;

    // 유저 기술 스택 저장소다.
    private final UserTechStackRepository userTechStackRepository;

    // 태그 저장소다.
    private final TagRepository tagRepository;

    // Proof Card 발급용 데이터를 조립한다.
    public AssembledProofCard assemble(NodeClearance nodeClearance) {
        List<String> requiredTagNames = nodeRequiredTagRepository.findTagNamesByNodeId(nodeClearance.getNode().getNodeId());
        List<String> userTagNames = userTechStackRepository.findTagNamesByUserId(nodeClearance.getUser().getId());

        String title = buildTitle(nodeClearance.getNode().getTitle());
        String description = buildDescription(nodeClearance.getNode().getTitle());

        List<AssembledTag> tags = new ArrayList<>();
        Set<String> requiredTagSet = normalizeSet(requiredTagNames);
        Set<String> userTagSet = normalizeSet(userTagNames);

        for (String requiredTagName : requiredTagNames) {
            if (userTagSet.contains(normalize(requiredTagName))) {
                tagRepository.findByName(requiredTagName)
                    .ifPresent(tag -> tags.add(
                        AssembledTag.builder()
                            .tag(tag)
                            .evidenceType(SkillEvidenceType.VERIFIED)
                            .build()
                    ));
            }
        }

        int heldTagLimit = 5;

        for (String userTagName : userTagNames) {
            if (tags.stream().filter(tag -> SkillEvidenceType.HELD.equals(tag.getEvidenceType())).count() >= heldTagLimit) {
                break;
            }

            if (requiredTagSet.contains(normalize(userTagName))) {
                continue;
            }

            tagRepository.findByName(userTagName)
                .ifPresent(tag -> tags.add(
                    AssembledTag.builder()
                        .tag(tag)
                        .evidenceType(SkillEvidenceType.HELD)
                        .build()
                ));
        }

        return AssembledProofCard.builder()
            .title(title)
            .description(description)
            .tags(tags)
            .build();
    }

    // 카드 제목을 만든다.
    private String buildTitle(String nodeTitle) {
        return nodeTitle + " Proof Card";
    }

    // 카드 설명을 만든다.
    private String buildDescription(String nodeTitle) {
        return nodeTitle + " 노드의 학습 완료 및 검증 조건 충족 결과를 증명합니다.";
    }

    // 문자열 목록을 정규화된 Set으로 변환한다.
    private Set<String> normalizeSet(List<String> values) {
        Set<String> normalizedSet = new LinkedHashSet<>();

        for (String value : values) {
            normalizedSet.add(normalize(value));
        }

        return normalizedSet;
    }

    // 문자열을 비교 가능한 형태로 정규화한다.
    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    // 조립된 Proof Card 데이터다.
    @Getter
    @Builder
    public static class AssembledProofCard {

        // 카드 제목이다.
        private String title;

        // 카드 설명이다.
        private String description;

        // 카드 태그 목록이다.
        private List<AssembledTag> tags;
    }

    // 조립된 태그 데이터다.
    @Getter
    @Builder
    public static class AssembledTag {

        // 태그 엔티티다.
        private Tag tag;

        // 태그 증빙 유형이다.
        private SkillEvidenceType evidenceType;
    }
}
