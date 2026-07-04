package com.todoapp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.ArrayList;
import java.util.List;

public class TaskReorderRequest {

    @NotEmpty
    @Valid
    private List<TaskReorderItem> items = new ArrayList<>();

    public List<TaskReorderItem> getItems() {
        return items;
    }

    public void setItems(List<TaskReorderItem> items) {
        this.items = items;
    }
}
