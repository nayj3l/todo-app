package com.todoapp.dto;

import java.util.ArrayList;
import java.util.List;

public class BoardResponse {

    private List<GroupResponse> groups = new ArrayList<>();
    private List<TaskResponse> tasks = new ArrayList<>();

    public List<GroupResponse> getGroups() {
        return groups;
    }

    public void setGroups(List<GroupResponse> groups) {
        this.groups = groups;
    }

    public List<TaskResponse> getTasks() {
        return tasks;
    }

    public void setTasks(List<TaskResponse> tasks) {
        this.tasks = tasks;
    }
}
