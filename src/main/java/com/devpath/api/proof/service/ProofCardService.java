package com.devpath.api.proof.service;

import com.devpath.api.proof.component.ProofCardAssembler;
import com.devpath.api.proof.dto.ProofCardRequest;
import com.devpath.api.proof.dto.ProofCardResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.entity.proof.ProofCardStatus;
import com.devpath.domain.learning.entity.proof.ProofCardTag;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Proof Card 서비스
@Service
@RequiredArgsConstructor
public class ProofCardService {

    // Proof Card 저장소다.
    private final ProofCardRepository proofCardRepository;

    // Proof Card Tag 저장소다.
    private final ProofCardTagRepository proofCardTagRepository;

    // Node Clearance 저장소다.
    private final NodeClearanceRepository nodeClearanceRepository;

    // Proof Card 조립기다.
    private final ProofCardAssembler proofCardAssembler;

    // Proof Card를 발급한다.
    @Transactional
    public ProofCardResponse.Detail issue(Long userId, ProofCardRequest.Issue request) {
        return issueIfEligible(userId, request.getNodeId());
    }

    // 조건을 만족하면 Proof Card를 발급한다.
    @Transactional
    public ProofCardResponse.Detail issueIfEligible(Long userId, Long nodeId) {
        NodeClearance nodeClearance = nodeClearanceRepository.findByUserIdAndNodeNodeId(userId, nodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.PROOF_CONDITION_NOT_MET));

        if (!Boolean.TRUE.equals(nodeClearance.getProofEligible())) {
            throw new CustomException(ErrorCode.PROOF_CONDITION_NOT_MET);
        }

        return proofCardRepository.findByNodeClearanceId(nodeClearance.getId())
            .map(this::toDetail)
            .orElseGet(() -> createProofCard(nodeClearance));
    }

    // Proof Card 목록을 조회한다.
    @Transactional(readOnly = true)
    public List<ProofCardResponse.Summary> getProofCards(Long userId) {
        List<ProofCard> proofCards = proofCardRepository.findAllByUserIdAndStatusOrderByIssuedAtDesc(
            userId,
            ProofCardStatus.ISSUED
        );

        return proofCards.stream()
            .map(this::toSummary)
            .toList();
    }

    // Proof Card 상세를 조회한다.
    @Transactional(readOnly = true)
    public ProofCardResponse.Detail getProofCard(Long userId, Long proofCardId) {
        ProofCard proofCard = proofCardRepository.findByIdAndUserId(proofCardId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.PROOF_CARD_NOT_FOUND));

        return toDetail(proofCard);
    }

    // Proof Card 갤러리를 조회한다.
    @Transactional(readOnly = true)
    public List<ProofCardResponse.GalleryItem> getGallery(Long userId) {
        List<ProofCard> proofCards = proofCardRepository.findAllByUserIdAndStatusOrderByIssuedAtDesc(
            userId,
            ProofCardStatus.ISSUED
        );

        Map<Long, List<ProofCardResponse.TagItem>> tagItemMap = loadTagItemMap(proofCards);

        return proofCards.stream()
            .map(proofCard -> ProofCardResponse.GalleryItem.builder()
                .proofCardId(proofCard.getId())
                .title(proofCard.getTitle())
                .nodeTitle(proofCard.getNode().getTitle())
                .issuedAt(proofCard.getIssuedAt())
                .tags(tagItemMap.getOrDefault(proofCard.getId(), List.of()))
                .build())
            .toList();
    }

    // Proof Card를 생성하고 태그를 저장한다.
    private ProofCardResponse.Detail createProofCard(NodeClearance nodeClearance) {
        ProofCardAssembler.AssembledProofCard assembledProofCard = proofCardAssembler.assemble(nodeClearance);

        ProofCard savedProofCard = proofCardRepository.save(
            ProofCard.builder()
                .user(nodeClearance.getUser())
                .node(nodeClearance.getNode())
                .nodeClearance(nodeClearance)
                .title(assembledProofCard.getTitle())
                .description(assembledProofCard.getDescription())
                .build()
        );

        proofCardTagRepository.saveAll(
            assembledProofCard.getTags().stream()
                .map(tag -> ProofCardTag.builder()
                    .proofCard(savedProofCard)
                    .tag(tag.getTag())
                    .evidenceType(tag.getEvidenceType())
                    .build())
                .toList()
        );

        return toDetail(savedProofCard);
    }

    // Proof Card 목록 응답으로 변환한다.
    private ProofCardResponse.Summary toSummary(ProofCard proofCard) {
        return ProofCardResponse.Summary.builder()
            .proofCardId(proofCard.getId())
            .nodeId(proofCard.getNode().getNodeId())
            .nodeTitle(proofCard.getNode().getTitle())
            .title(proofCard.getTitle())
            .status(proofCard.getStatus().name())
            .issuedAt(proofCard.getIssuedAt())
            .build();
    }

    // Proof Card 상세 응답으로 변환한다.
    private ProofCardResponse.Detail toDetail(ProofCard proofCard) {
        return ProofCardResponse.Detail.builder()
            .proofCardId(proofCard.getId())
            .nodeId(proofCard.getNode().getNodeId())
            .nodeTitle(proofCard.getNode().getTitle())
            .title(proofCard.getTitle())
            .description(proofCard.getDescription())
            .status(proofCard.getStatus().name())
            .issuedAt(proofCard.getIssuedAt())
            .tags(loadTagItems(proofCard.getId()))
            .build();
    }

    // 단건 Proof Card 태그 응답을 조회한다.
    private List<ProofCardResponse.TagItem> loadTagItems(Long proofCardId) {
        return proofCardTagRepository.findAllByProofCardIdOrderByIdAsc(proofCardId)
            .stream()
            .map(proofCardTag -> ProofCardResponse.TagItem.builder()
                .tagId(proofCardTag.getTag().getTagId())
                .tagName(proofCardTag.getTag().getName())
                .evidenceType(proofCardTag.getEvidenceType())
                .build())
            .toList();
    }

    // 여러 Proof Card의 태그 응답 맵을 조회한다.
    private Map<Long, List<ProofCardResponse.TagItem>> loadTagItemMap(List<ProofCard> proofCards) {
        List<Long> proofCardIds = proofCards.stream()
            .map(ProofCard::getId)
            .toList();

        Map<Long, List<ProofCardResponse.TagItem>> tagItemMap = new HashMap<>();

        for (ProofCardTag proofCardTag : proofCardTagRepository.findAllByProofCardIdInOrderByProofCardIdAscIdAsc(proofCardIds)) {
            tagItemMap.computeIfAbsent(proofCardTag.getProofCard().getId(), key -> new java.util.ArrayList<>())
                .add(
                    ProofCardResponse.TagItem.builder()
                        .tagId(proofCardTag.getTag().getTagId())
                        .tagName(proofCardTag.getTag().getName())
                        .evidenceType(proofCardTag.getEvidenceType())
                        .build()
                );
        }

        return tagItemMap;
    }
}
