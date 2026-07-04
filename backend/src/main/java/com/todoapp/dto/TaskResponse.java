package com.todoapp.dto;

import com.todoapp.model.Task;
import com.todoapp.model.TaskComment;
import com.todoapp.model.TaskPriority;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class TaskResponse {

    private Long id;
    private String title;
    private String description;
    private boolean done;
    private Long groupId;
    private int sortOrder;
    private TaskPriority priority;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;
    private List<CommentResponse> comments = new ArrayList<>();

    public static TaskResponse from(Task task) {
        return from(task, List.of());
    }

    public static TaskResponse from(Task task, List<TaskComment> comments) {
        TaskResponse response = new TaskResponse();
        response.setId(task.getId());
        response.setTitle(task.getTitle());
        response.setDescription(task.getDescription());
        response.setDone(task.isDone());
        response.setGroupId(task.getGroupId());
        response.setSortOrder(task.getSortOrder());
        response.setPriority(task.getPriority());
        response.setCreatedAt(task.getCreatedAt());
        response.setUpdatedAt(task.getUpdatedAt());
        response.setDeletedAt(task.getDeletedAt());
        response.setComments(comments.stream().map(CommentResponse::from).toList());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isDone() {
        return done;
    }

    public void setDone(boolean done) {
        this.done = done;
    }

    public Long getGroupId() {
        return groupId;
    }

    public void setGroupId(Long groupId) {
        this.groupId = groupId;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public List<CommentResponse> getComments() {
        return comments;
    }

    public void setComments(List<CommentResponse> comments) {
        this.comments = comments;
    }
}
