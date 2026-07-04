package com.todoapp.model;

import java.time.Instant;

public class TaskBackupRecord {

    private Long id;
    private Long groupId;
    private String title;
    private String description;
    private boolean done;
    private int sortOrder;
    private TaskPriority priority = TaskPriority.NONE;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;

    public static TaskBackupRecord from(Task task) {
        TaskBackupRecord record = new TaskBackupRecord();
        record.setId(task.getId());
        record.setGroupId(task.getGroupId());
        record.setTitle(task.getTitle());
        record.setDescription(task.getDescription());
        record.setDone(task.isDone());
        record.setSortOrder(task.getSortOrder());
        record.setPriority(task.getPriority());
        record.setCreatedAt(task.getCreatedAt());
        record.setUpdatedAt(task.getUpdatedAt());
        record.setDeletedAt(task.getDeletedAt());
        return record;
    }

    public Task toTask(TaskGroup group) {
        Task task = new Task();
        task.setId(id);
        task.setTitle(title);
        task.setDescription(description);
        task.setDone(done);
        task.setSortOrder(sortOrder);
        task.setPriority(priority != null ? priority : TaskPriority.NONE);
        task.setCreatedAt(createdAt);
        task.setUpdatedAt(updatedAt);
        task.setDeletedAt(deletedAt);
        task.setGroup(group);
        return task;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getGroupId() {
        return groupId;
    }

    public void setGroupId(Long groupId) {
        this.groupId = groupId;
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
}
