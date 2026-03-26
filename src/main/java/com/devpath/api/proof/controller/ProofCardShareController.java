package com.devpath.api.proof.controller;

import com.devpath.api.proof.service.ProofCardShareService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Proof Card Share API 컨트롤러
@Tag(name = "Learner - Proof Card Share", description = "Proof Card 공유 API")
@RestController
@RequestMapping("/api/proof-card-shares")
@RequiredArgsConstructor
public class ProofCardShareController {

    // Proof Card Share 서비스
    private final ProofCardShareService proofCardShareService;
}
