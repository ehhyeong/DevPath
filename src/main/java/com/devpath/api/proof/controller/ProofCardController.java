package com.devpath.api.proof.controller;

import com.devpath.api.proof.service.ProofCardService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Proof Card API 컨트롤러
@Tag(name = "Learner - Proof Card", description = "학습자 Proof Card API")
@RestController
@RequestMapping("/api/me/proof-cards")
@RequiredArgsConstructor
public class ProofCardController {

    // Proof Card 서비스
    private final ProofCardService proofCardService;
}
