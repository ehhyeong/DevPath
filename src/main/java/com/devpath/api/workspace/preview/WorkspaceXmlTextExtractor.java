package com.devpath.api.workspace.preview;

import java.io.InputStream;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

final class WorkspaceXmlTextExtractor {

  private WorkspaceXmlTextExtractor() {}

  static void collect(
      InputStream inputStream,
      TextCollector collector,
      String namespaceMarker,
      boolean separateRuns)
      throws XMLStreamException {
    XMLInputFactory factory = XMLInputFactory.newFactory();
    disableFeature(factory, XMLInputFactory.SUPPORT_DTD);
    disableFeature(factory, "javax.xml.stream.isSupportingExternalEntities");
    XMLStreamReader reader = factory.createXMLStreamReader(inputStream);
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

  private static boolean isOfficeNamespace(String namespaceUri, String namespaceMarker) {
    return namespaceUri != null && namespaceUri.contains(namespaceMarker);
  }

  private static void disableFeature(XMLInputFactory factory, String feature) {
    try {
      factory.setProperty(feature, false);
    } catch (IllegalArgumentException ignored) {
      // Some StAX implementations do not expose every hardening flag.
    }
  }

  static final class TextCollector {
    private final StringBuilder text = new StringBuilder();
    private final int maxChars;
    private boolean truncated;

    TextCollector(int maxChars) {
      this.maxChars = maxChars;
    }

    void append(String value) {
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
      } else {
        text.append(value);
      }
    }

    void appendLineBreak() {
      if (!text.isEmpty() && text.charAt(text.length() - 1) != '\n') {
        append("\n");
      }
    }

    boolean hasText() {
      return !text.isEmpty();
    }

    boolean isTruncated() {
      return truncated;
    }

    String previewText() {
      return text.toString().trim();
    }
  }
}
