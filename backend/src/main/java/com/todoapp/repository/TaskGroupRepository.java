package com.todoapp.repository;

import com.todoapp.model.TaskGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskGroupRepository extends JpaRepository<TaskGroup, Long> {

    List<TaskGroup> findAllByOrderBySortOrderAsc();
}
