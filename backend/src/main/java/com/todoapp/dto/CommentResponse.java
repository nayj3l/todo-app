package com.todoapp.dto;

import com.todoapp.model.TaskComment;

import java.time.Instant;

public class CommentResponse {

    private Long id;
    private Long taskId;
    private String text;
    private Instant createdAt;

    public static CommentResponse from(TaskComment comment) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setTaskId(comment.getTaskId());
        response.setText(comment.getText());
        response.setCreatedAt(comment.getCreatedAt());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTaskId() {
        return taskId;
    }

    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
