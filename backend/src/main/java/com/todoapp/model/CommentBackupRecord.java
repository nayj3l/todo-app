package com.todoapp.model;

import java.time.Instant;

public class CommentBackupRecord {

    private Long id;
    private Long taskId;
    private String text;
    private Instant createdAt;

    public static CommentBackupRecord from(TaskComment comment) {
        CommentBackupRecord record = new CommentBackupRecord();
        record.setId(comment.getId());
        record.setTaskId(comment.getTaskId());
        record.setText(comment.getText());
        record.setCreatedAt(comment.getCreatedAt());
        return record;
    }

    public TaskComment toComment(Task task) {
        TaskComment comment = new TaskComment();
        comment.setId(id);
        comment.setTask(task);
        comment.setText(text);
        comment.setCreatedAt(createdAt);
        return comment;
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
