package com.devpath.api.job.service;

import com.devpath.api.job.dto.JobkoreaJobRequest;
import com.devpath.api.job.dto.JobkoreaJobResponse;
import com.devpath.common.config.JobkoreaProperties;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.xml.sax.SAXException;

@Component
@RequiredArgsConstructor
public class JobkoreaApiClient {

  private static final Charset JOBKOREA_CHARSET = Charset.forName("EUC-KR");
  private static final DateTimeFormatter JOBKOREA_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;
  private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

  private final JobkoreaProperties properties;
  private final HttpClient httpClient =
      HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();

  public JobkoreaJobResponse.SearchResult search(JobkoreaJobRequest.Search request) {
    int size = request.size() == null ? 20 : request.size();
    int page = request.page() == null ? 1 : request.page();
    boolean starter = Boolean.TRUE.equals(request.starter());
    String endpoint = endpoint(starter);
    String requestUrl = buildUrl(endpoint, request, size, page);
    Document document = requestXml(requestUrl);

    Integer pageCount = parseInteger(text(document.getDocumentElement(), "TotalCnt"));
    Integer totalCount = parseInteger(text(document.getDocumentElement(), "TotalSumCnt"));
    if (totalCount == null) {
      totalCount = pageCount;
    }

    return new JobkoreaJobResponse.SearchResult(
        totalCount,
        pageCount,
        page,
        size,
        starter,
        JobkoreaJobResponse.Attribution.jobkorea(),
        parseItems(document));
  }

  private String endpoint(boolean starter) {
    String endpoint = starter ? properties.getStarterListUrl() : properties.getJobListUrl();

    if (!isNotBlank(endpoint)) {
      throw new CustomException(
          ErrorCode.JOB_COLLECT_FAILED,
          starter ? "잡코리아 신입공채 XML URL이 설정되지 않았습니다." : "잡코리아 채용정보 XML URL이 설정되지 않았습니다.");
    }

    return endpoint;
  }

  private String buildUrl(String endpoint, JobkoreaJobRequest.Search request, int size, int page) {
    StringBuilder url = new StringBuilder(endpoint);
    appendParam(url, "Size", String.valueOf(size));
    appendParam(url, "Page", String.valueOf(page));
    appendParam(url, "Ob", request.order() == null ? null : String.valueOf(request.order()));
    appendParam(url, "Keyword", request.keyword());
    appendParam(url, "rbcd", request.industryCode());
    appendParam(url, "rpcd", request.jobCode());
    appendParam(url, "area", request.areaCode());
    appendParam(url, "Oem_Code", properties.getOemCode());

    if (isNotBlank(properties.getApiKey())) {
      appendParam(url, properties.getApiParamName(), properties.getApiKey());
    }

    return url.toString();
  }

  private void appendParam(StringBuilder url, String name, String value) {
    if (!isNotBlank(name) || !isNotBlank(value)) {
      return;
    }

    url.append(url.indexOf("?") >= 0 ? "&" : "?")
        .append(encode(name))
        .append("=")
        .append(encode(value));
  }

  private String encode(String value) {
    return URLEncoder.encode(value, JOBKOREA_CHARSET);
  }

  private Document requestXml(String requestUrl) {
    HttpRequest httpRequest =
        HttpRequest.newBuilder(URI.create(requestUrl))
            .timeout(REQUEST_TIMEOUT)
            .header("Accept", "application/xml")
            .GET()
            .build();

    try {
      HttpResponse<byte[]> response =
          httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new CustomException(ErrorCode.JOB_COLLECT_FAILED, "잡코리아 API 응답 상태가 올바르지 않습니다.");
      }

      return parseXml(response.body());
    } catch (IOException exception) {
      throw new CustomException(ErrorCode.JOB_COLLECT_FAILED, "잡코리아 API 호출에 실패했습니다.");
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new CustomException(ErrorCode.JOB_COLLECT_FAILED, "잡코리아 API 호출이 중단되었습니다.");
    }
  }

  private Document parseXml(byte[] body) {
    try {
      DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
      factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
      factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
      factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
      factory.setXIncludeAware(false);
      factory.setExpandEntityReferences(false);
      return factory.newDocumentBuilder().parse(new ByteArrayInputStream(body));
    } catch (ParserConfigurationException | SAXException | IOException exception) {
      throw new CustomException(ErrorCode.JOB_COLLECT_FAILED, "잡코리아 XML 응답을 해석하지 못했습니다.");
    }
  }

  private List<JobkoreaJobResponse.Posting> parseItems(Document document) {
    var nodes = document.getElementsByTagName("Items");
    List<JobkoreaJobResponse.Posting> items = new ArrayList<>();

    for (int index = 0; index < nodes.getLength(); index++) {
      Element item = (Element) nodes.item(index);
      items.add(
          new JobkoreaJobResponse.Posting(
              text(item, "GI_No"),
              text(item, "C_Name"),
              text(item, "C_URL"),
              text(item, "GI_Subject"),
              text(item, "GI_Part_No"),
              text(item, "GI_Career"),
              text(item, "GI_Career_Year_Cnt"),
              text(item, "GI_Pay"),
              text(item, "GI_Pay_Term"),
              text(item, "GI_EDU_CutLine"),
              splitCsv(text(item, "GI_Keyword")),
              text(item, "GI_Pass_Type"),
              text(item, "GI_Job_Type"),
              text(item, "Staff"),
              text(item, "Jikgub"),
              text(item, "AreaCode"),
              parseDate(text(item, "GI_End_Date")),
              parseDate(text(item, "GI_W_Date")),
              parseDate(text(item, "GI_E_Date")),
              text(item, "JK_URL")));
    }

    return items;
  }

  private List<String> splitCsv(String value) {
    if (!isNotBlank(value)) {
      return List.of();
    }

    return List.of(value.split(",")).stream().map(String::trim).filter(this::isNotBlank).toList();
  }

  private LocalDate parseDate(String value) {
    if (!isNotBlank(value)) {
      return null;
    }

    try {
      return LocalDate.parse(value.trim(), JOBKOREA_DATE_FORMAT);
    } catch (DateTimeParseException exception) {
      return null;
    }
  }

  private Integer parseInteger(String value) {
    if (!isNotBlank(value)) {
      return null;
    }

    try {
      return Integer.parseInt(value.trim());
    } catch (NumberFormatException exception) {
      return null;
    }
  }

  private String text(Element parent, String tagName) {
    var nodes = parent.getElementsByTagName(tagName);
    if (nodes.getLength() == 0 || nodes.item(0) == null) {
      return null;
    }

    String value = nodes.item(0).getTextContent();
    return isNotBlank(value) ? value.trim() : null;
  }

  private boolean isNotBlank(String value) {
    return value != null && !value.trim().isEmpty();
  }
}
