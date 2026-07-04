package com.todoapp.model;

public class GroupBackupRecord {

    private Long id;
    private String name;
    private String color;
    private int sortOrder;

    public static GroupBackupRecord from(TaskGroup group) {
        GroupBackupRecord record = new GroupBackupRecord();
        record.setId(group.getId());
        record.setName(group.getName());
        record.setColor(group.getColor());
        record.setSortOrder(group.getSortOrder());
        return record;
    }

    public TaskGroup toGroup() {
        TaskGroup group = new TaskGroup();
        group.setId(id);
        group.setName(name);
        group.setColor(color);
        group.setSortOrder(sortOrder);
        return group;
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
}
