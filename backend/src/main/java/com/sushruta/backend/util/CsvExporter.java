package com.sushruta.backend.util;

import com.sushruta.backend.models.PainChartEntry;
import com.sushruta.backend.models.BodyRegionData;

import java.io.FileWriter;
import java.io.IOException;
import java.util.*;

public class CsvExporter {

    public static void export(List<PainChartEntry> charts, String outputPath) throws IOException {
        Set<String> allRegions = new TreeSet<>();

        // Collect all unique region names
        for (PainChartEntry chart : charts) {
            if (chart.getRegions() != null) {
                allRegions.addAll(chart.getRegions().keySet());
            }
        }

        try (FileWriter writer = new FileWriter(outputPath)) {
            // Write header
            writer.append("userId,chartName,disease");
            for (String region : allRegions) {
                writer.append(",").append(region).append("_pain");
                writer.append(",").append(region).append("_scar");
                writer.append(",").append(region).append("_bruise");
                writer.append(",").append(region).append("_burn");
                writer.append(",").append(region).append("_discoloration");
                writer.append(",").append(region).append("_note");
            }
            writer.append("\n");

            // Write data rows
            for (PainChartEntry chart : charts) {
                writer.append(escape(chart.getUserId())).append(",")
                      .append(escape(chart.getChartName())).append(",")
                      .append(escape(chart.getDisease()));

                Map<String, BodyRegionData> regions = chart.getRegions();
                for (String region : allRegions) {
                    int pain = 0, scar = 0, bruise = 0, burn = 0, discoloration = 0;
                    String note = "";

                    if (regions != null && regions.containsKey(region)) {
                        BodyRegionData data = regions.get(region);
                        pain = data.getPain();
                        scar = data.getScar();
                        bruise = data.getBruise();
                        burn = data.getBurn();
                        discoloration = data.getDiscoloration();
                        note = data.getNote() != null ? data.getNote() : "";
                    }

                    writer.append(",").append(String.valueOf(pain));
                    writer.append(",").append(String.valueOf(scar));
                    writer.append(",").append(String.valueOf(bruise));
                    writer.append(",").append(String.valueOf(burn));
                    writer.append(",").append(String.valueOf(discoloration));
                    writer.append(",").append(escape(note));
                }

                writer.append("\n");
            }
        }
    }

    private static String escape(String value) {
        if (value == null) return "";
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}