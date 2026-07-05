package com.todoapp.dto;

import com.todoapp.model.User;

public class UserResponse {

    private Long id;
    private String name;
    private String email;
    private String pictureUrl;

    public static UserResponse from(User user) {
        UserResponse response = new UserResponse();
        response.id = user.getId();
        response.name = user.getName();
        response.email = user.getEmail();
        response.pictureUrl = user.getPictureUrl();
        return response;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPictureUrl() {
        return pictureUrl;
    }
}
