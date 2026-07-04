package com.todoapp.dto;

import com.todoapp.model.TaskGroup;

public class GroupResponse {

    private Long id;
    private String name;
    private String color;
    private int sortOrder;
    private long taskCount;

    public static GroupResponse from(TaskGroup group, long taskCount) {
        GroupResponse response = new GroupResponse();
        response.setId(group.getId());
        response.setName(group.getName());
        response.setColor(group.getColor());
        response.setSortOrder(group.getSortOrder());
        response.setTaskCount(taskCount);
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public long getTaskCount() {
        return taskCount;
    }

    public void setTaskCount(long taskCount) {
        this.taskCount = taskCount;
    }
}
