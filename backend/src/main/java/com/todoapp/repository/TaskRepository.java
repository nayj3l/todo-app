package com.todoapp.repository;

import com.todoapp.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.group g WHERE g.user.id = :userId AND t.deletedAt IS NULL ORDER BY t.sortOrder ASC, t.createdAt ASC")
    List<Task> findAllActiveByUserIdOrderBySortOrderAscCreatedAtAsc(@Param("userId") Long userId);

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.group g WHERE g.user.id = :userId AND t.deletedAt IS NOT NULL ORDER BY t.deletedAt DESC")
    List<Task> findAllDeletedByUserIdOrderByDeletedAtDesc(@Param("userId") Long userId);

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.group g WHERE g.user.id = :userId ORDER BY t.sortOrder ASC, t.createdAt ASC")
    List<Task> findAllByUserIdWithGroupOrderBySortOrderAscCreatedAtAsc(@Param("userId") Long userId);

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.group g WHERE t.id = :id AND g.user.id = :userId")
    Optional<Task> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    List<Task> findByGroup_IdAndDeletedAtIsNullOrderBySortOrderAsc(Long groupId);

    long countByGroup_IdAndDeletedAtIsNull(Long groupId);
}
