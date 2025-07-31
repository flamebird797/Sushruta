package com.sushruta.backend.service;

import com.sushruta.backend.models.PainChartEntry;
import com.sushruta.backend.repository.PainChartRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ChartService {

    private final PainChartRepository repository;

    public ChartService(PainChartRepository repository) {
        this.repository = repository;
    }

    public void saveEntry(PainChartEntry entry) {
        entry.setTimestamp(LocalDateTime.now());
        repository.save(entry);
    }

    public PainChartEntry getLatest(String userId) {
        List<PainChartEntry> entries = repository.findByUserIdOrderByTimestampDesc(userId);
        return entries.isEmpty() ? null : entries.get(0);
    }

    public List<PainChartEntry> getHistory(String userId) {
        return repository.findByUserIdOrderByTimestampDesc(userId);
    }

    public List<PainChartEntry> getAllCharts() {
        return repository.findAll();
    }

    public static String generateSummary(Map<String, Object> chartData) {
        try {
            String apiKey = System.getenv("OPENAI_API_KEY");
            if (apiKey == null || apiKey.isEmpty()) {
                return "❌ OPENAI_API_KEY is not set.";
            }

            ObjectMapper mapper = new ObjectMapper();
            String chartJson = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(chartData);
            String prompt = "Summarize this pain chart in 2–3 concise clinical sentences:\n" + chartJson;

            Map<String, Object> requestMap = Map.of(
                "model", "gpt-3.5-turbo",
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "temperature", 0.4
            );
            String requestBody = mapper.writeValueAsString(requestMap);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            String rawJson = response.body();

            System.out.println("🔁 RAW OpenAI response:\n" + rawJson);

            Map<String, Object> fullResponse = mapper.readValue(rawJson, Map.class);
            if (fullResponse.containsKey("error")) {
                Map<String, Object> error = (Map<String, Object>) fullResponse.get("error");
                return "❌ OpenAI error: " + error.get("message");
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) fullResponse.get("choices");
            if (choices == null || choices.isEmpty()) return "⚠️ No choices returned.";

            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");

        } catch (Exception e) {
            e.printStackTrace();
            return "❌ Exception in summary generation: " + e.getMessage();
        }
    }
}