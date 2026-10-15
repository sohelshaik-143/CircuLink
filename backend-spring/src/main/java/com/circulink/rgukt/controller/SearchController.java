package com.circulink.rgukt.controller;

import com.circulink.rgukt.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/api/search")
    public ResponseEntity<Map<String, Object>> search(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(searchService.globalSearch(q));
    }
}
