package com.devpath.api.job.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.devpath.api.job.service.JobkoreaJobService;
import java.net.URI;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class JobCompanyLogoControllerTest {
  @Test
  void redirectsToRegisteredLogoWithCacheHeaders() throws Exception {
    var service = mock(JobkoreaJobService.class);
    when(service.findCompanyLogo("/Company/1/Info"))
        .thenReturn(Optional.of(URI.create("https://imgs.jobkorea.co.kr/Co_Logo/logo.png")));
    MockMvcBuilders.standaloneSetup(new JobkoreaJobController(service))
        .build()
        .perform(get("/api/jobs/company-logo").param("companyPath", "/Company/1/Info"))
        .andExpect(status().isFound())
        .andExpect(header().string("Location", "https://imgs.jobkorea.co.kr/Co_Logo/logo.png"))
        .andExpect(header().string("Cache-Control", "max-age=3600, public"));
  }

  @Test
  void returnsCacheableNotFoundForMissingLogo() throws Exception {
    var service = mock(JobkoreaJobService.class);
    when(service.findCompanyLogo("/Company/1/Info")).thenReturn(Optional.empty());
    MockMvcBuilders.standaloneSetup(new JobkoreaJobController(service))
        .build()
        .perform(get("/api/jobs/company-logo").param("companyPath", "/Company/1/Info"))
        .andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control", "max-age=300, public"));
  }
}
