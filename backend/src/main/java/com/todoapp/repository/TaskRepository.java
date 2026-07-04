package com.todoapp.repository;

import com.todoapp.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.group WHERE t.deletedAt IS NULL ORDER BY t.sortOrder ASC, t.createdAt ASC")
    List<Task> findAllActiveWithGroupOrderBySortOrderAscCreatedAtAsc();

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.group WHERE t.deletedAt IS NOT NULL ORDER BY t.deletedAt DESC")
    List<Task> findAllDeletedWithGroupOrderByDeletedAtDesc();

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.group ORDER BY t.sortOrder ASC, t.createdAt ASC")
    List<Task> findAllWithGroupOrderBySortOrderAscCreatedAtAsc();

    List<Task> findByGroup_IdAndDeletedAtIsNullOrderBySortOrderAsc(Long groupId);

    long countByGroup_IdAndDeletedAtIsNull(Long groupId);
}
