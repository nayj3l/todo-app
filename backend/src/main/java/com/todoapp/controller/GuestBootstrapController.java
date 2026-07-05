package com.todoapp.controller;

import com.todoapp.dto.GuestBootstrapResponse;
import com.todoapp.service.GuestBootstrapService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/guest")
public class GuestBootstrapController {

    private final GuestBootstrapService guestBootstrapService;

    public GuestBootstrapController(GuestBootstrapService guestBootstrapService) {
        this.guestBootstrapService = guestBootstrapService;
    }

    @GetMapping("/bootstrap")
    public GuestBootstrapResponse bootstrap() {
        return guestBootstrapService.getBootstrapSnapshot();
    }
}
