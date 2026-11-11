package com.devpath.api.job.service;

import com.devpath.api.job.dto.JobkoreaJobRequest;
import com.devpath.api.job.dto.JobkoreaJobResponse;
import java.net.URI;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobkoreaJobService {

  private final JobkoreaApiClient jobkoreaApiClient;
  private final JobkoreaCompanyLogoClient companyLogoClient;

  public JobkoreaJobResponse.SearchResult search(JobkoreaJobRequest.Search request) {
    return jobkoreaApiClient.search(request);
  }

  public Optional<URI> findCompanyLogo(String companyPath) {
    return companyLogoClient.findLogo(companyPath);
  }
}
