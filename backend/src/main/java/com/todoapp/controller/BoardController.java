package com.todoapp.controller;

import com.todoapp.dto.BoardResponse;
import com.todoapp.dto.CommentRequest;
import com.todoapp.dto.CommentResponse;
import com.todoapp.dto.DoneRequest;
import com.todoapp.dto.GroupCreateRequest;
import com.todoapp.dto.GroupReorderRequest;
import com.todoapp.dto.GroupResponse;
import com.todoapp.dto.GroupUpdateRequest;
import com.todoapp.dto.PriorityRequest;
import com.todoapp.dto.RecycleBinResponse;
import com.todoapp.dto.TaskReorderRequest;
import com.todoapp.dto.TaskRequest;
import com.todoapp.dto.TaskResponse;
import com.todoapp.service.BoardService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping("/board")
    public BoardResponse getBoard() {
        return boardService.getBoard();
    }

    @GetMapping("/recycle-bin")
    public RecycleBinResponse getRecycleBin() {
        return boardService.getRecycleBin();
    }

    @PostMapping("/board/reorder")
    public BoardResponse reorder(@Valid @RequestBody TaskReorderRequest request) {
        return boardService.reorder(request);
    }

    @PostMapping("/groups")
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse createGroup(@Valid @RequestBody GroupCreateRequest request) {
        return boardService.createGroup(request);
    }

    @PatchMapping("/groups/{id}")
    public GroupResponse updateGroup(@PathVariable Long id, @RequestBody GroupUpdateRequest request) {
        return boardService.updateGroup(id, request);
    }

    @PostMapping("/groups/reorder")
    public BoardResponse reorderGroups(@Valid @RequestBody GroupReorderRequest request) {
        return boardService.reorderGroups(request);
    }

    @DeleteMapping("/groups/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(@PathVariable Long id) {
        boardService.deleteGroup(id);
    }

    @GetMapping("/tasks/{id}")
    public TaskResponse getTask(@PathVariable Long id) {
        return boardService.toTaskResponse(boardService.findById(id));
    }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createTask(@Valid @RequestBody TaskRequest request) {
        return boardService.toTaskResponse(boardService.create(request));
    }

    @PutMapping("/tasks/{id}")
    public TaskResponse updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequest request) {
        return boardService.toTaskResponse(boardService.update(id, request));
    }

    @PatchMapping("/tasks/{id}/done")
    public TaskResponse setDone(@PathVariable Long id, @Valid @RequestBody DoneRequest request) {
        return boardService.toTaskResponse(boardService.setDone(id, request.isDone()));
    }

    @PatchMapping("/tasks/{id}/priority")
    public TaskResponse setPriority(@PathVariable Long id, @Valid @RequestBody PriorityRequest request) {
        return boardService.toTaskResponse(boardService.setPriority(id, request.getPriority()));
    }

    @PostMapping("/tasks/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@PathVariable Long id, @Valid @RequestBody CommentRequest request) {
        return boardService.addComment(id, request);
    }

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable Long id) {
        boardService.softDelete(id);
    }

    @PostMapping("/tasks/{id}/restore")
    public TaskResponse restoreTask(@PathVariable Long id) {
        return boardService.toTaskResponse(boardService.restore(id));
    }
}
