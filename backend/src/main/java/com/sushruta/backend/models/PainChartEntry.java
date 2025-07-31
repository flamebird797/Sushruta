package com.sushruta.backend.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "painCharts")
public class PainChartEntry {

    @Id
    private String id;

    private String userId;
    private LocalDateTime timestamp = LocalDateTime.now();
    private Map<String, BodyRegionData> regions;
    private String chartName;
    private String disease;
    private String svgFront = "";
private String svgBack = "";
    private String notes;
    private boolean is3D = false;

    public PainChartEntry() {}

    public PainChartEntry(String userId, String chartName, Map<String, BodyRegionData> regions, String disease) {
        this.userId = userId;
        this.chartName = chartName;
        this.timestamp = LocalDateTime.now();
        this.regions = regions;
        this.disease = disease;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getChartName() {
    return chartName;
}
public void setChartName(String chartName) {
    this.chartName = chartName;
}

    public Map<String, BodyRegionData> getRegions() {
        return regions;
    }

    public void setRegions(Map<String, BodyRegionData> regions) {
        this.regions = regions;
    }

    public String getDisease() {
    return disease;
}

public void setDisease(String disease) {
    this.disease = disease;
}

// Getters and setters
public String getSvgFront() {
    return svgFront;
}

public void setSvgFront(String svgFront) {
    this.svgFront = svgFront;
}

public String getSvgBack() {
    return svgBack;
}

public void setSvgBack(String svgBack) {
    this.svgBack = svgBack;
}
public String getNotes() {
    return notes;
}

public void setNotes(String notes) {
    this.notes = notes;
}

public boolean isIs3D() {
    return is3D;
}

public void setIs3D(boolean is3D) {
    this.is3D = is3D;
}
}
