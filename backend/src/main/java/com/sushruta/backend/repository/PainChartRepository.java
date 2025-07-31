package com.sushruta.backend.repository;

import com.sushruta.backend.models.PainChartEntry;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PainChartRepository extends MongoRepository<PainChartEntry, String> {
    List<PainChartEntry> findByUserIdOrderByTimestampDesc(String userId);
}