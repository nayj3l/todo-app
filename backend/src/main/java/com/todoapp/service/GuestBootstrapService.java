package com.todoapp.service;

import com.todoapp.config.TemplateUserInitializer;
import com.todoapp.dto.BoardResponse;
import com.todoapp.dto.GuestBootstrapResponse;
import com.todoapp.dto.RecycleBinResponse;
import com.todoapp.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GuestBootstrapService {

    private final TemplateUserInitializer templateUserInitializer;
    private final BoardService boardService;

    public GuestBootstrapService(TemplateUserInitializer templateUserInitializer, BoardService boardService) {
        this.templateUserInitializer = templateUserInitializer;
        this.boardService = boardService;
    }

    @Transactional
    public GuestBootstrapResponse getBootstrapSnapshot() {
        User templateUser = templateUserInitializer.ensureTemplateUser();
        BoardResponse board = boardService.getBoard(templateUser);
        RecycleBinResponse recycleBin = boardService.getRecycleBin(templateUser);
        return new GuestBootstrapResponse(board, recycleBin);
    }
}
