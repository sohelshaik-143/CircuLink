package com.circulink.rgukt.repository;

import com.circulink.rgukt.entity.Circular;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CircularRepository extends JpaRepository<Circular, Long>, JpaSpecificationExecutor<Circular> {

    Optional<Circular> findByCircularNumber(String circularNumber);

    long countByStatus(Circular.Status status);

    long countByStatusIn(Collection<Circular.Status> statuses);

    long countByStatusAndIsActiveTrue(Circular.Status status);

    @Query("SELECT c FROM Circular c WHERE c.status = 'PUBLISHED' AND c.isActive = TRUE " +
           "AND (LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(c.content) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Circular> searchCirculars(@Param("q") String q, Pageable pageable);
}
