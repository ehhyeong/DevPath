package com.devpath.api.proof.service;

import com.devpath.api.proof.dto.ProofCardResponse;
import com.devpath.api.proof.dto.ProofCardShareRequest;
import com.devpath.api.proof.dto.ProofCardShareResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.entity.proof.ProofCardShare;
import com.devpath.domain.learning.entity.proof.ProofShareLinkStatus;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardShareRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Proof Card Share 서비스
@Service
@RequiredArgsConstructor
public class ProofCardShareService {

    // Proof Card 저장소다.
    private final ProofCardRepository proofCardRepository;

    // Proof Card Share 저장소다.
    private final ProofCardShareRepository proofCardShareRepository;

    // Proof Card Tag 저장소다.
    private final ProofCardTagRepository proofCardTagRepository;

    // 공유 링크를 생성한다.
    @Transactional
    public ProofCardShareResponse.Detail create(Long userId, ProofCardShareRequest.Create request) {
        ProofCard proofCard = proofCardRepository.findByIdAndUserId(request.getProofCardId(), userId)
            .orElseThrow(() -> new CustomException(ErrorCode.PROOF_CARD_NOT_FOUND));

        ProofCardShare existingShare = proofCardShareRepository
            .findTopByProofCardIdAndStatusOrderByIdDesc(proofCard.getId(), ProofShareLinkStatus.ACTIVE)
            .orElse(null);

        if (existingShare != null && !existingShare.isExpired()) {
            return toDetail(existingShare);
        }

        if (existingShare != null && existingShare.isExpired()) {
            existingShare.expire();
        }

        ProofCardShare savedShare = proofCardShareRepository.save(
            ProofCardShare.builder()
                .proofCard(proofCard)
                .shareToken(generateShareToken())
                .expiresAt(request.getExpiresAt())
                .build()
        );

        return toDetail(savedShare);
    }

    // 공유 토큰으로 Proof Card를 조회한다.
    @Transactional
    public ProofCardShareResponse.PublicDetail getSharedProofCard(String shareToken) {
        ProofCardShare proofCardShare = proofCardShareRepository
            .findByShareTokenAndStatus(shareToken, ProofShareLinkStatus.ACTIVE)
            .orElseThrow(() -> new CustomException(ErrorCode.SHARE_LINK_NOT_FOUND));

        if (proofCardShare.isExpired()) {
            proofCardShare.expire();
            throw new CustomException(ErrorCode.SHARE_LINK_NOT_FOUND);
        }

        proofCardShare.increaseAccessCount();

        return ProofCardShareResponse.PublicDetail.builder()
            .shareToken(proofCardShare.getShareToken())
            .title(proofCardShare.getProofCard().getTitle())
            .nodeTitle(proofCardShare.getProofCard().getNode().getTitle())
            .status(proofCardShare.getStatus().name())
            .accessCount(proofCardShare.getAccessCount())
            .issuedAt(proofCardShare.getProofCard().getIssuedAt())
            .tags(loadTagItems(proofCardShare.getProofCard().getId()))
            .build();
    }

    // 공유 링크 응답으로 변환한다.
    private ProofCardShareResponse.Detail toDetail(ProofCardShare proofCardShare) {
        return ProofCardShareResponse.Detail.builder()
            .shareId(proofCardShare.getId())
            .proofCardId(proofCardShare.getProofCard().getId())
            .shareToken(proofCardShare.getShareToken())
            .shareUrl("/api/proof-card-shares/" + proofCardShare.getShareToken())
            .status(proofCardShare.getStatus().name())
            .expiresAt(proofCardShare.getExpiresAt())
            .accessCount(proofCardShare.getAccessCount())
            .build();
    }

    // Proof Card 태그 응답 목록을 로드한다.
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

    // 공유 토큰을 생성한다.
    private String generateShareToken() {
        String shareToken = UUID.randomUUID().toString().replace("-", "");

        while (proofCardShareRepository.existsByShareToken(shareToken)) {
            shareToken = UUID.randomUUID().toString().replace("-", "");
        }

        return shareToken;
    }
}
