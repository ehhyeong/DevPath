package com.devpath.api.workspace.preview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import com.devpath.domain.workspace.entity.WorkspaceFileType;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;

@ExtendWith(MockitoExtension.class)
class WorkspacePptxPreviewerTest {

  @Mock private WorkspaceFileStorage workspaceFileStorage;
  @Mock private WorkspaceOfficeRenderer officeRenderer;

  @Test
  void previewExtractsSlideTextAndShapeLayout() throws Exception {
    WorkspaceFile file = presentationFile();
    when(workspaceFileStorage.load(file)).thenReturn(new ByteArrayResource(presentationArchive()));
    when(officeRenderer.renderPptx(file, 1_000, 600)).thenReturn(List.of());

    WorkspaceDocumentPreviewResponse response =
        new WorkspacePptxPreviewer(workspaceFileStorage, officeRenderer).preview(file);

    assertThat(response.getDocumentType()).isEqualTo("pptx");
    assertThat(response.getText()).contains("Slide 1", "발표 내용");
    assertThat(response.isTruncated()).isFalse();
    assertThat(response.getSlides())
        .singleElement()
        .satisfies(
            slide -> {
              assertThat(slide.getSlideNumber()).isEqualTo(1);
              assertThat(slide.getWidth()).isEqualTo(1_000);
              assertThat(slide.getHeight()).isEqualTo(600);
              assertThat(slide.getElements())
                  .singleElement()
                  .satisfies(
                      element -> {
                        assertThat(element.getType()).isEqualTo("text");
                        assertThat(element.getText()).isEqualTo("발표 내용");
                        assertThat(element.getX()).isEqualTo(10);
                        assertThat(element.getY()).isEqualTo(20);
                        assertThat(element.getWidth()).isEqualTo(300);
                        assertThat(element.getHeight()).isEqualTo(400);
                        assertThat(element.getFillColor()).isEqualTo("#ABCDEF");
                        assertThat(element.getFontSize()).isEqualTo(18.0);
                        assertThat(element.isBold()).isTrue();
                      });
            });
  }

  private WorkspaceFile presentationFile() {
    return WorkspaceFile.builder()
        .id(1L)
        .workspaceId(2L)
        .originalFileName("발표자료.pptx")
        .storedFileName("presentation.pptx")
        .filePath("presentation.pptx")
        .fileSize(512)
        .contentType("application/vnd.openxmlformats-officedocument.presentationml.presentation")
        .itemType(WorkspaceFileType.FILE)
        .uploadedById(3L)
        .build();
  }

  private byte[] presentationArchive() throws IOException {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
      writeEntry(
          zip,
          "ppt/presentation.xml",
          """
          <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
            <p:sldSz cx="1000" cy="600"/>
          </p:presentation>
          """);
      writeEntry(
          zip,
          "ppt/slides/slide1.xml",
          """
          <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <p:cSld>
              <p:spTree>
                <p:sp>
                  <p:spPr>
                    <a:xfrm><a:off x="10" y="20"/><a:ext cx="300" cy="400"/></a:xfrm>
                    <a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill>
                  </p:spPr>
                  <p:txBody>
                    <a:p><a:r><a:rPr sz="1800" b="1"/><a:t>발표 내용</a:t></a:r></a:p>
                  </p:txBody>
                </p:sp>
              </p:spTree>
            </p:cSld>
          </p:sld>
          """);
    }
    return output.toByteArray();
  }

  private void writeEntry(ZipOutputStream zip, String name, String content) throws IOException {
    zip.putNextEntry(new ZipEntry(name));
    zip.write(content.getBytes(StandardCharsets.UTF_8));
    zip.closeEntry();
  }
}
