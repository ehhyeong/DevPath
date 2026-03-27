package com.devpath.api.instructor.dto.marketing;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ConversionResponse {

    private long totalVisitors;
    private long totalSignups;
    private long totalPurchases;
    private double signupRate;
    private double purchaseRate;
}