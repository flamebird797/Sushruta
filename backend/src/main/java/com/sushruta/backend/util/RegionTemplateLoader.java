package com.sushruta.backend.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sushruta.backend.models.BodyRegionData;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
public class RegionTemplateLoader {
    public Map<String, BodyRegionData> loadStandardTemplate() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        return mapper.readValue(
            new ClassPathResource("standard-regions.json").getInputStream(),
            new TypeReference<>() {}
        );
    }
}