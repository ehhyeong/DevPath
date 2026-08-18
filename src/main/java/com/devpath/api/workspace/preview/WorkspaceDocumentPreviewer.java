package com.devpath.api.workspace.preview;

import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.dto.WorkspacePresentationElementResponse;
import com.devpath.api.workspace.dto.WorkspacePresentationSlideResponse;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

@Component
@RequiredArgsConstructor
public class WorkspaceDocumentPreviewer {

  private static final int MAX_DOCUMENT_PREVIEW_CHARS = 60000;
  private static final int MAX_PRESENTATION_IMAGE_BYTES = 3 * 1024 * 1024;
  private static final int MAX_RENDERED_DOCUMENT_BYTES = 12 * 1024 * 1024;
  private static final String DRAWING_NAMESPACE = "drawingml";
  private static final String PPTX_RELATIONSHIP_NAMESPACE =
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  private static final long DEFAULT_PRESENTATION_WIDTH = 12192000;
  private static final long DEFAULT_PRESENTATION_HEIGHT = 6858000;
  private final WorkspaceFileStorage workspaceFileStorage;
  private final WorkspaceOfficeRenderer officeRenderer;
  private final WorkspaceDocxPreviewer docxPreviewer;
  private final WorkspaceHwpxPreviewer hwpxPreviewer;

  public WorkspaceDocumentPreviewResponse getDocumentPreview(WorkspaceFile file) {
    if (file.isFolder()) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    String extension = fileExtension(file.getOriginalFileName());

    try {
      if ("docx".equals(extension)) {
        return docxPreviewer.preview(file);
      }

      if ("pptx".equals(extension)) {
        return readPptxPreview(file);
      }

      if ("hwpx".equals(extension)) {
        return hwpxPreviewer.preview(file);
      }
    } catch (IOException
        | XMLStreamException
        | ParserConfigurationException
        | SAXException
        | IllegalArgumentException e) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    throw new CustomException(ErrorCode.INVALID_INPUT);
  }

  private WorkspaceDocumentPreviewResponse readPptxPreview(WorkspaceFile file)
      throws IOException, XMLStreamException, ParserConfigurationException, SAXException {
    TextPreviewCollector collector = new TextPreviewCollector(MAX_DOCUMENT_PREVIEW_CHARS);
    TreeMap<Integer, byte[]> slides = new TreeMap<>();
    Map<String, byte[]> packageEntries = new HashMap<>();

    try (ZipInputStream zipInputStream =
        new ZipInputStream(
            new BufferedInputStream(workspaceFileStorage.load(file).getInputStream()),
            StandardCharsets.UTF_8)) {
      ZipEntry entry;

      while ((entry = zipInputStream.getNextEntry()) != null) {
        String entryName = entry.getName();
        Integer slideNumber = pptxSlideNumber(entryName);
        if (slideNumber != null
            || "ppt/presentation.xml".equals(entryName)
            || entryName.startsWith("ppt/slides/_rels/")
            || entryName.startsWith("ppt/media/")) {
          packageEntries.put(entryName, zipInputStream.readAllBytes());
        }

        if (slideNumber != null) {
          slides.put(slideNumber, packageEntries.get(entryName));
        }
        zipInputStream.closeEntry();
      }
    }

    PresentationSize presentationSize =
        readPptxPresentationSize(packageEntries.get("ppt/presentation.xml"));
    List<WorkspacePresentationSlideResponse> renderedSlides =
        officeRenderer.renderPptx(file, presentationSize.width(), presentationSize.height());
    List<WorkspacePresentationSlideResponse> slidePreviews = new ArrayList<>();

    for (Map.Entry<Integer, byte[]> slide : slides.entrySet()) {
      if (collector.isTruncated()) {
        break;
      }

      collector.appendLine("Slide " + slide.getKey());
      collectOfficeXmlText(
          new ByteArrayInputStream(slide.getValue()), collector, DRAWING_NAMESPACE, true);
      collector.appendLineBreak();
      if (renderedSlides.isEmpty()) {
        slidePreviews.add(
            readPptxSlidePreview(
                slide.getKey(), slide.getValue(), presentationSize, packageEntries));
      }
    }

    return WorkspaceDocumentPreviewResponse.builder()
        .documentType("pptx")
        .text(collector.previewText())
        .truncated(collector.isTruncated())
        .slides(renderedSlides.isEmpty() ? slidePreviews : renderedSlides)
        .build();
  }

  private PresentationSize readPptxPresentationSize(byte[] presentationXml)
      throws ParserConfigurationException, IOException, SAXException {
    if (presentationXml == null) {
      return new PresentationSize(DEFAULT_PRESENTATION_WIDTH, DEFAULT_PRESENTATION_HEIGHT);
    }

    Document document = parseXml(presentationXml);
    Element slideSize = firstDescendant(document.getDocumentElement(), "sldSz");
    if (slideSize == null) {
      return new PresentationSize(DEFAULT_PRESENTATION_WIDTH, DEFAULT_PRESENTATION_HEIGHT);
    }

    return new PresentationSize(
        readLongAttribute(slideSize, "cx", DEFAULT_PRESENTATION_WIDTH),
        readLongAttribute(slideSize, "cy", DEFAULT_PRESENTATION_HEIGHT));
  }

  private WorkspacePresentationSlideResponse readPptxSlidePreview(
      int slideNumber,
      byte[] slideXml,
      PresentationSize presentationSize,
      Map<String, byte[]> packageEntries)
      throws ParserConfigurationException, IOException, SAXException {
    Document document = parseXml(slideXml);
    Element root = document.getDocumentElement();
    List<WorkspacePresentationElementResponse> elements = new ArrayList<>();
    Map<String, String> imageRelationships =
        readPptxImageRelationships(
            packageEntries.get("ppt/slides/_rels/slide" + slideNumber + ".xml.rels"));

    Element shapeTree = firstDescendant(root, "spTree");
    if (shapeTree != null) {
      collectPptxSlideElements(shapeTree, imageRelationships, packageEntries, elements);
    }

    return WorkspacePresentationSlideResponse.builder()
        .slideNumber(slideNumber)
        .width(presentationSize.width())
        .height(presentationSize.height())
        .backgroundColor(readPptxBackgroundColor(root))
        .elements(elements)
        .build();
  }

  private void collectPptxSlideElements(
      Element owner,
      Map<String, String> imageRelationships,
      Map<String, byte[]> packageEntries,
      List<WorkspacePresentationElementResponse> elements) {
    for (Element child : childElements(owner)) {
      WorkspacePresentationElementResponse element = null;
      String localName = localName(child);

      if ("sp".equals(localName)) {
        element = readPptxShape(child);
      } else if ("pic".equals(localName)) {
        element = readPptxPicture(child, imageRelationships, packageEntries);
      } else if ("grpSp".equals(localName)) {
        collectPptxSlideElements(child, imageRelationships, packageEntries, elements);
      }

      if (element != null) {
        elements.add(element);
      }
    }
  }

  private WorkspacePresentationElementResponse readPptxShape(Element shape) {
    PptxBounds bounds = readPptxBounds(shape);
    if (bounds == null) {
      return null;
    }

    String text = collectPptxText(shape);
    String fillColor = readPptxShapeFill(shape);
    if (!StringUtils.hasText(text) && !StringUtils.hasText(fillColor)) {
      return null;
    }

    return WorkspacePresentationElementResponse.builder()
        .type(StringUtils.hasText(text) ? "text" : "shape")
        .x(bounds.x())
        .y(bounds.y())
        .width(bounds.width())
        .height(bounds.height())
        .text(text)
        .fillColor(fillColor)
        .textColor(readPptxTextColor(shape))
        .fontSize(readPptxFontSize(shape))
        .bold(readPptxTextFlag(shape, "b"))
        .italic(readPptxTextFlag(shape, "i"))
        .build();
  }

  private WorkspacePresentationElementResponse readPptxPicture(
      Element picture, Map<String, String> imageRelationships, Map<String, byte[]> packageEntries) {
    PptxBounds bounds = readPptxBounds(picture);
    Element blip = firstDescendant(picture, "blip");
    if (bounds == null || blip == null) {
      return null;
    }

    String relationshipId = blip.getAttributeNS(PPTX_RELATIONSHIP_NAMESPACE, "embed");
    if (!StringUtils.hasText(relationshipId)) {
      relationshipId = blip.getAttribute("r:embed");
    }

    String imagePath = imageRelationships.get(relationshipId);
    byte[] image = imagePath == null ? null : packageEntries.get(imagePath);
    if (image == null || image.length > MAX_PRESENTATION_IMAGE_BYTES) {
      return null;
    }

    return WorkspacePresentationElementResponse.builder()
        .type("image")
        .x(bounds.x())
        .y(bounds.y())
        .width(bounds.width())
        .height(bounds.height())
        .imageDataUri(toDataUri(imagePath, image))
        .build();
  }

  private Map<String, String> readPptxImageRelationships(byte[] relationshipsXml)
      throws ParserConfigurationException, IOException, SAXException {
    Map<String, String> relationships = new HashMap<>();
    if (relationshipsXml == null) {
      return relationships;
    }

    Document document = parseXml(relationshipsXml);
    for (Element relationship : descendantElements(document.getDocumentElement(), "Relationship")) {
      String type = relationship.getAttribute("Type");
      String id = relationship.getAttribute("Id");
      String target = relationship.getAttribute("Target");
      if (type.contains("/image") && StringUtils.hasText(id) && StringUtils.hasText(target)) {
        relationships.put(id, resolvePptxTarget("ppt/slides/", target));
      }
    }

    return relationships;
  }

  private String readPptxBackgroundColor(Element slideRoot) {
    Element background = firstDescendant(slideRoot, "bg");
    String color = background == null ? null : readSolidColor(background);
    return StringUtils.hasText(color) ? color : "#ffffff";
  }

  private String readPptxShapeFill(Element shape) {
    Element shapeProperties = firstDescendant(shape, "spPr");
    return shapeProperties == null ? null : readSolidColor(shapeProperties);
  }

  private String readPptxTextColor(Element shape) {
    Element runProperties = firstDescendant(shape, "rPr");
    return runProperties == null ? null : readSolidColor(runProperties);
  }

  private Double readPptxFontSize(Element shape) {
    Element runProperties = firstDescendant(shape, "rPr");
    if (runProperties == null || !StringUtils.hasText(runProperties.getAttribute("sz"))) {
      return null;
    }

    try {
      return Double.parseDouble(runProperties.getAttribute("sz")) / 100;
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private boolean readPptxTextFlag(Element shape, String attribute) {
    Element runProperties = firstDescendant(shape, "rPr");
    if (runProperties == null) {
      return false;
    }

    String value = runProperties.getAttribute(attribute);
    return "1".equals(value) || "true".equalsIgnoreCase(value);
  }

  private PptxBounds readPptxBounds(Element owner) {
    Element transform = firstDescendant(owner, "xfrm");
    if (transform == null) {
      return null;
    }

    Element offset = firstDescendant(transform, "off");
    Element extent = firstDescendant(transform, "ext");
    if (offset == null || extent == null) {
      return null;
    }

    long width = readLongAttribute(extent, "cx", 0);
    long height = readLongAttribute(extent, "cy", 0);
    if (width <= 0 || height <= 0) {
      return null;
    }

    return new PptxBounds(
        readLongAttribute(offset, "x", 0), readLongAttribute(offset, "y", 0), width, height);
  }

  private String collectPptxText(Element shape) {
    Element textBody = firstDescendant(shape, "txBody");
    if (textBody == null) {
      return "";
    }

    List<String> paragraphs = new ArrayList<>();
    for (Element paragraph : childElements(textBody, "p")) {
      StringBuilder paragraphText = new StringBuilder();
      for (Element textRun : descendantElements(paragraph, "t")) {
        paragraphText.append(textRun.getTextContent());
      }
      if (StringUtils.hasText(paragraphText)) {
        paragraphs.add(paragraphText.toString());
      }
    }

    return String.join("\n", paragraphs).trim();
  }

  private String readSolidColor(Element owner) {
    for (Element solidFill : descendantElements(owner, "solidFill")) {
      Element srgbColor = firstDescendant(solidFill, "srgbClr");
      if (srgbColor != null && StringUtils.hasText(srgbColor.getAttribute("val"))) {
        return "#" + srgbColor.getAttribute("val");
      }
    }

    return null;
  }

  private String toDataUri(String imagePath, byte[] image) {
    return "data:"
        + imageContentType(imagePath)
        + ";base64,"
        + Base64.getEncoder().encodeToString(image);
  }

  private String imageContentType(String imagePath) {
    String extension = fileExtension(imagePath);
    return switch (extension) {
      case "pdf" -> "application/pdf";
      case "jpg", "jpeg" -> "image/jpeg";
      case "gif" -> "image/gif";
      case "svg" -> "image/svg+xml";
      case "webp" -> "image/webp";
      default -> "image/png";
    };
  }

  private String resolvePptxTarget(String baseDirectory, String target) {
    if (target.startsWith("/")) {
      return target.substring(1);
    }

    Deque<String> segments = new ArrayDeque<>();
    for (String segment : (baseDirectory + target).split("/")) {
      if (segment.isBlank() || ".".equals(segment)) {
        continue;
      }

      if ("..".equals(segment)) {
        if (!segments.isEmpty()) {
          segments.removeLast();
        }
      } else {
        segments.addLast(segment);
      }
    }

    return String.join("/", segments);
  }

  private Document parseXml(byte[] xml)
      throws ParserConfigurationException, IOException, SAXException {
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);
    factory.setExpandEntityReferences(false);
    setDocumentFeature(factory, "http://apache.org/xml/features/disallow-doctype-decl", true);
    setDocumentFeature(factory, "http://xml.org/sax/features/external-general-entities", false);
    setDocumentFeature(factory, "http://xml.org/sax/features/external-parameter-entities", false);
    return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
  }

  private void setDocumentFeature(DocumentBuilderFactory factory, String feature, boolean enabled) {
    try {
      factory.setFeature(feature, enabled);
    } catch (ParserConfigurationException ignored) {
      // Some XML parsers do not expose every hardening flag.
    }
  }

  private Element firstDescendant(Node node, String localName) {
    if (node == null) {
      return null;
    }

    if (node.getNodeType() == Node.ELEMENT_NODE && localName.equals(localName(node))) {
      return (Element) node;
    }

    Node child = node.getFirstChild();
    while (child != null) {
      Element match = firstDescendant(child, localName);
      if (match != null) {
        return match;
      }
      child = child.getNextSibling();
    }

    return null;
  }

  private List<Element> descendantElements(Node node, String localName) {
    List<Element> elements = new ArrayList<>();
    collectDescendantElements(node, localName, elements);
    return elements;
  }

  private void collectDescendantElements(Node node, String localName, List<Element> elements) {
    if (node == null) {
      return;
    }

    if (node.getNodeType() == Node.ELEMENT_NODE && localName.equals(localName(node))) {
      elements.add((Element) node);
    }

    Node child = node.getFirstChild();
    while (child != null) {
      collectDescendantElements(child, localName, elements);
      child = child.getNextSibling();
    }
  }

  private List<Element> childElements(Node node) {
    List<Element> elements = new ArrayList<>();
    if (node == null) {
      return elements;
    }

    Node child = node.getFirstChild();
    while (child != null) {
      if (child.getNodeType() == Node.ELEMENT_NODE) {
        elements.add((Element) child);
      }
      child = child.getNextSibling();
    }

    return elements;
  }

  private List<Element> childElements(Node node, String localName) {
    return childElements(node).stream()
        .filter(element -> localName.equals(localName(element)))
        .toList();
  }

  private String localName(Node node) {
    String localName = node.getLocalName();
    if (localName != null) {
      return localName;
    }

    String nodeName = node.getNodeName();
    int prefixIndex = nodeName.indexOf(':');
    return prefixIndex >= 0 ? nodeName.substring(prefixIndex + 1) : nodeName;
  }

  private long readLongAttribute(Element element, String attribute, long fallback) {
    if (element == null || !StringUtils.hasText(element.getAttribute(attribute))) {
      return fallback;
    }

    try {
      return Long.parseLong(element.getAttribute(attribute));
    } catch (NumberFormatException e) {
      return fallback;
    }
  }

  private void collectOfficeXmlText(
      java.io.InputStream inputStream,
      TextPreviewCollector collector,
      String namespaceMarker,
      boolean separateRuns)
      throws XMLStreamException {
    XMLStreamReader reader = xmlInputFactory().createXMLStreamReader(inputStream);
    boolean inTextElement = false;

    try {
      while (reader.hasNext() && !collector.isTruncated()) {
        int event = reader.next();

        if (event == XMLStreamConstants.START_ELEMENT) {
          inTextElement =
              "t".equals(reader.getLocalName())
                  && isOfficeNamespace(reader.getNamespaceURI(), namespaceMarker);
        } else if (event == XMLStreamConstants.CHARACTERS && inTextElement) {
          collector.append(reader.getText());
          if (separateRuns) {
            collector.append(" ");
          }
        } else if (event == XMLStreamConstants.END_ELEMENT
            && isOfficeNamespace(reader.getNamespaceURI(), namespaceMarker)) {
          if ("t".equals(reader.getLocalName())) {
            inTextElement = false;
          } else if ("p".equals(reader.getLocalName())
              || "br".equals(reader.getLocalName())
              || "lineBreak".equals(reader.getLocalName())) {
            collector.appendLineBreak();
          }
        }
      }
    } finally {
      reader.close();
    }
  }

  private boolean isOfficeNamespace(String namespaceUri, String namespaceMarker) {
    return namespaceUri != null && namespaceUri.contains(namespaceMarker);
  }

  private XMLInputFactory xmlInputFactory() {
    XMLInputFactory factory = XMLInputFactory.newFactory();
    disableXmlInputFeature(factory, XMLInputFactory.SUPPORT_DTD);
    disableXmlInputFeature(factory, "javax.xml.stream.isSupportingExternalEntities");
    return factory;
  }

  private void disableXmlInputFeature(XMLInputFactory factory, String feature) {
    try {
      factory.setProperty(feature, false);
    } catch (IllegalArgumentException ignored) {
      // Some StAX implementations do not expose every hardening flag.
    }
  }

  private String fileExtension(String fileName) {
    if (!StringUtils.hasText(fileName)) {
      return "";
    }

    int dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.substring(dotIndex + 1).toLowerCase() : "";
  }

  private Integer pptxSlideNumber(String entryName) {
    if (entryName == null
        || !entryName.startsWith("ppt/slides/slide")
        || !entryName.endsWith(".xml")) {
      return null;
    }

    String number = entryName.substring("ppt/slides/slide".length(), entryName.length() - 4);
    try {
      return Integer.parseInt(number);
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private record PresentationSize(long width, long height) {}

  private record PptxBounds(long x, long y, long width, long height) {}

  private static final class TextPreviewCollector {
    private final StringBuilder text = new StringBuilder();
    private final int maxChars;
    private boolean truncated;

    private TextPreviewCollector(int maxChars) {
      this.maxChars = maxChars;
    }

    private void append(String value) {
      if (value == null || value.isEmpty() || truncated) {
        return;
      }

      int remaining = maxChars - text.length();
      if (remaining <= 0) {
        truncated = true;
        return;
      }

      if (value.length() > remaining) {
        text.append(value, 0, remaining);
        truncated = true;
        return;
      }

      text.append(value);
    }

    private void appendLine(String value) {
      append(value);
      appendLineBreak();
    }

    private void appendLineBreak() {
      if (truncated || text.isEmpty() || text.charAt(text.length() - 1) == '\n') {
        return;
      }

      append("\n");
    }

    private boolean isTruncated() {
      return truncated;
    }

    private boolean hasText() {
      return StringUtils.hasText(text);
    }

    private String previewText() {
      String normalized = text.toString().replaceAll("\\n{3,}", "\n\n").trim();
      return StringUtils.hasText(normalized) ? normalized : "미리보기할 텍스트가 없습니다.";
    }
  }
}
