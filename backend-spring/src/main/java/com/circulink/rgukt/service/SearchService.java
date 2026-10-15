package com.circulink.rgukt.service;

import com.circulink.rgukt.entity.Circular;
import com.circulink.rgukt.entity.Post;
import com.circulink.rgukt.repository.CircularRepository;
import com.circulink.rgukt.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final PostRepository postRepository;
    private final CircularRepository circularRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> globalSearch(String query) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);

        if (query == null || query.trim().length() < 2) {
            res.put("results", List.of());
            return res;
        }

        String q = query.trim();
        List<Post> posts = postRepository.searchPosts(q, PageRequest.of(0, 5));
        List<Circular> circulars = circularRepository.searchCirculars(q, PageRequest.of(0, 5));

        List<Map<String, Object>> results = new ArrayList<>();

        for (Post p : posts) {
            Map<String, Object> m = new HashMap<>();
            m.put("_id", p.getId());
            m.put("title", p.getTitle());
            m.put("type", p.getType().name());
            m.put("branch", p.getBranch().name());
            m.put("_type", "post");
            results.add(m);
        }

        for (Circular c : circulars) {
            Map<String, Object> m = new HashMap<>();
            m.put("_id", c.getId());
            m.put("title", c.getTitle());
            m.put("category", c.getCategory().name());
            m.put("priority", c.getPriority().name());
            m.put("_type", "circular");
            results.add(m);
        }

        res.put("results", results);
        return res;
    }
}
