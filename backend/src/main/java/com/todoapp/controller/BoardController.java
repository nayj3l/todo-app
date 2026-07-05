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
import com.todoapp.model.User;
import com.todoapp.security.CurrentUserService;
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
    private final CurrentUserService currentUserService;

    public BoardController(BoardService boardService, CurrentUserService currentUserService) {
        this.boardService = boardService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/board")
    public BoardResponse getBoard() {
        User user = currentUserService.requireUser();
        boardService.ensureUserBoard(user);
        return boardService.getBoard(user);
    }

    @PostMapping("/board/restore-from-backup")
    public BoardResponse restoreFromBackup() {
        User user = currentUserService.requireUser();
        return boardService.restoreFromBackup(user);
    }

    @GetMapping("/recycle-bin")
    public RecycleBinResponse getRecycleBin() {
        User user = currentUserService.requireUser();
        return boardService.getRecycleBin(user);
    }

    @PostMapping("/board/reorder")
    public BoardResponse reorder(@Valid @RequestBody TaskReorderRequest request) {
        User user = currentUserService.requireUser();
        return boardService.reorder(user, request);
    }

    @PostMapping("/groups")
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse createGroup(@Valid @RequestBody GroupCreateRequest request) {
        User user = currentUserService.requireUser();
        return boardService.createGroup(user, request);
    }

    @PatchMapping("/groups/{id}")
    public GroupResponse updateGroup(@PathVariable Long id, @RequestBody GroupUpdateRequest request) {
        User user = currentUserService.requireUser();
        return boardService.updateGroup(user, id, request);
    }

    @PostMapping("/groups/reorder")
    public BoardResponse reorderGroups(@Valid @RequestBody GroupReorderRequest request) {
        User user = currentUserService.requireUser();
        return boardService.reorderGroups(user, request);
    }

    @DeleteMapping("/groups/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(@PathVariable Long id) {
        User user = currentUserService.requireUser();
        boardService.deleteGroup(user, id);
    }

    @GetMapping("/tasks/{id}")
    public TaskResponse getTask(@PathVariable Long id) {
        User user = currentUserService.requireUser();
        return boardService.toTaskResponse(user, boardService.findById(user, id));
    }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createTask(@Valid @RequestBody TaskRequest request) {
        User user = currentUserService.requireUser();
        return boardService.toTaskResponse(user, boardService.create(user, request));
    }

    @PutMapping("/tasks/{id}")
    public TaskResponse updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequest request) {
        User user = currentUserService.requireUser();
        return boardService.toTaskResponse(user, boardService.update(user, id, request));
    }

    @PatchMapping("/tasks/{id}/done")
    public TaskResponse setDone(@PathVariable Long id, @Valid @RequestBody DoneRequest request) {
        User user = currentUserService.requireUser();
        return boardService.toTaskResponse(user, boardService.setDone(user, id, request.isDone()));
    }

    @PatchMapping("/tasks/{id}/priority")
    public TaskResponse setPriority(@PathVariable Long id, @Valid @RequestBody PriorityRequest request) {
        User user = currentUserService.requireUser();
        return boardService.toTaskResponse(user, boardService.setPriority(user, id, request.getPriority()));
    }

    @PostMapping("/tasks/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@PathVariable Long id, @Valid @RequestBody CommentRequest request) {
        User user = currentUserService.requireUser();
        return boardService.addComment(user, id, request);
    }

    @PatchMapping("/tasks/{taskId}/comments/{commentId}")
    public CommentResponse updateComment(
            @PathVariable Long taskId,
            @PathVariable Long commentId,
            @Valid @RequestBody CommentRequest request) {
        User user = currentUserService.requireUser();
        return boardService.updateComment(user, taskId, commentId, request);
    }

    @DeleteMapping("/tasks/{taskId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long taskId, @PathVariable Long commentId) {
        User user = currentUserService.requireUser();
        boardService.deleteComment(user, taskId, commentId);
    }

    @DeleteMapping("/recycle-bin")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearRecycleBin() {
        User user = currentUserService.requireUser();
        boardService.clearRecycleBin(user);
    }

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable Long id) {
        User user = currentUserService.requireUser();
        boardService.softDelete(user, id);
    }

    @PostMapping("/tasks/{id}/restore")
    public TaskResponse restoreTask(@PathVariable Long id) {
        User user = currentUserService.requireUser();
        return boardService.toTaskResponse(user, boardService.restore(user, id));
    }
}
