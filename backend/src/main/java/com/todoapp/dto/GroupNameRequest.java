package com.todoapp.dto;

import jakarta.validation.constraints.NotBlank;

public class GroupNameRequest {

    @NotBlank
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
