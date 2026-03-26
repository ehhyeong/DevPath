package com.devpath.api.proof.controller;

import com.devpath.api.proof.service.CertificateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Certificate API 컨트롤러
@Tag(name = "Learner - Certificate", description = "학습자 증명서 API")
@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

    // Certificate 서비스
    private final CertificateService certificateService;
}
