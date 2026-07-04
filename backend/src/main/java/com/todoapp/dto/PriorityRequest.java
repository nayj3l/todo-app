package com.todoapp.dto;

import com.todoapp.model.TaskPriority;
import jakarta.validation.constraints.NotNull;

public class PriorityRequest {

    @NotNull(message = "Priority is required")
    private TaskPriority priority;

    public TaskPriority getPriority() {
        return priority;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }
}
