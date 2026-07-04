package com.todoapp.dto;

import java.util.ArrayList;
import java.util.List;

public class RecycleBinResponse {

    private List<TaskResponse> tasks = new ArrayList<>();

    public List<TaskResponse> getTasks() {
        return tasks;
    }

    public void setTasks(List<TaskResponse> tasks) {
        this.tasks = tasks;
    }
}
