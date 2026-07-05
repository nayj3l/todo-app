package com.todoapp.repository;

import com.todoapp.model.TaskGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskGroupRepository extends JpaRepository<TaskGroup, Long> {

    List<TaskGroup> findByUser_IdOrderBySortOrderAsc(Long userId);

    Optional<TaskGroup> findByIdAndUser_Id(Long id, Long userId);

    long countByUser_Id(Long userId);
}
