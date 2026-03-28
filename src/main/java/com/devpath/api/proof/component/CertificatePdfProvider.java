package com.devpath.api.proof.component;

import com.devpath.domain.learning.entity.proof.Certificate;
import com.devpath.domain.learning.entity.proof.ProofCardTag;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

// 증명서 PDF 바이트를 생성한다.
@Component
public class CertificatePdfProvider {

    // 증명서 PDF를 생성한다.
    public byte[] generate(Certificate certificate, List<ProofCardTag> proofCardTags) {
        List<String> lines = new ArrayList<>();

        lines.add("DevPath Certificate");
        lines.add("Certificate No: " + certificate.getCertificateNumber());
        lines.add("Proof Card: " + certificate.getProofCard().getTitle());
        lines.add("Node: " + certificate.getProofCard().getNode().getTitle());
        lines.add("Issued At: " + certificate.getIssuedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        lines.add("Skills:");

        for (ProofCardTag proofCardTag : proofCardTags) {
            lines.add("- " + proofCardTag.getTag().getName() + " [" + proofCardTag.getEvidenceType().name() + "]");
        }

        return buildMinimalPdf(lines);
    }

    // 최소 PDF 포맷 바이트를 구성한다.
    private byte[] buildMinimalPdf(List<String> lines) {
        StringBuilder content = new StringBuilder();
        content.append("BT\n");
        content.append("/F1 18 Tf\n");
        content.append("50 790 Td\n");

        boolean firstLine = true;

        for (String line : lines) {
            if (!firstLine) {
                content.append("0 -24 Td\n");
            }

            content.append("(").append(escape(line)).append(") Tj\n");
            firstLine = false;
        }

        content.append("ET\n");

        String contentStream = content.toString();

        List<String> objects = new ArrayList<>();
        objects.add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
        objects.add("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");
        objects.add("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n");
        objects.add("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
        objects.add("5 0 obj\n<< /Length " + contentStream.getBytes(StandardCharsets.US_ASCII).length + " >>\nstream\n" + contentStream + "endstream\nendobj\n");

        StringBuilder pdf = new StringBuilder();
        pdf.append("%PDF-1.4\n");

        List<Integer> offsets = new ArrayList<>();
        offsets.add(0);

        for (String object : objects) {
            offsets.add(pdf.toString().getBytes(StandardCharsets.US_ASCII).length);
            pdf.append(object);
        }

        int xrefOffset = pdf.toString().getBytes(StandardCharsets.US_ASCII).length;

        pdf.append("xref\n");
        pdf.append("0 ").append(objects.size() + 1).append("\n");
        pdf.append(String.format("%010d %05d f \n", 0, 65535));

        for (int i = 1; i < offsets.size(); i++) {
            pdf.append(String.format("%010d %05d n \n", offsets.get(i), 0));
        }

        pdf.append("trailer\n");
        pdf.append("<< /Size ").append(objects.size() + 1).append(" /Root 1 0 R >>\n");
        pdf.append("startxref\n");
        pdf.append(xrefOffset).append("\n");
        pdf.append("%%EOF");

        return pdf.toString().getBytes(StandardCharsets.US_ASCII);
    }

    // PDF 문자열 특수문자를 이스케이프한다.
    private String escape(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)");
    }
}
