package com.todoapp.repository;

import com.todoapp.model.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TaskCommentRepository extends JpaRepository<TaskComment, Long> {

    List<TaskComment> findByTask_IdOrderByCreatedAtAsc(Long taskId);

    List<TaskComment> findByTask_IdInOrderByCreatedAtAsc(Collection<Long> taskIds);

    void deleteByTask_Id(Long taskId);
}
