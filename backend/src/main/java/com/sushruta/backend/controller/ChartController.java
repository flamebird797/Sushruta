package com.sushruta.backend.controller;

import com.sushruta.backend.models.*;
import com.sushruta.backend.service.ChartService;
import com.sushruta.backend.util.RegionTemplateLoader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.sushruta.backend.util.CsvExporter;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chart")
@CrossOrigin(origins = "http://localhost:4200")
public class ChartController {

    @Autowired private ChartService chartService;
    @Autowired private RegionTemplateLoader regionTemplateLoader;

    

    @PostMapping("/save")
    public String saveChart(@RequestBody PainChartEntry entry) {
        chartService.saveEntry(entry);
        try {
        CsvExporter.export(chartService.getAllCharts(), "charts.csv");
        System.out.println("✅ CSV updated after chart save");
    } catch (IOException e) {
        System.err.println("❌ Failed to export CSV: " + e.getMessage());
    }
        return "Chart saved for user " + entry.getUserId();
        
    }

    
    @PostMapping("/summarize")
    public String summarize(@RequestBody Map<String, Object> chartData) {
        System.out.println("[AI Summary] Received chart data: " + chartData);
        return ChartService.generateSummary(chartData);
    }
    

    @GetMapping("/{userId}/latest")
    public PainChartEntry getLatest(@PathVariable String userId) {
        return chartService.getLatest(userId);
    }

    @GetMapping("/{userId}/history")
    public List<PainChartEntry> getHistory(@PathVariable String userId) {
        return chartService.getHistory(userId);
    }

    @GetMapping("/template")
    public Map<String, BodyRegionData> getRegionTemplate() throws IOException {
        return regionTemplateLoader.loadStandardTemplate();
    }
    
    @GetMapping("/export")
public ResponseEntity<Resource> exportChartsToCsv() {
    try {
        String path = "charts.csv";
        CsvExporter.export(chartService.getAllCharts(), path);

        FileSystemResource file = new FileSystemResource(path);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=charts.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(file);

    } catch (IOException e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
}
