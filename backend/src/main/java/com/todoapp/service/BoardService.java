package com.todoapp.service;

import com.todoapp.config.WeddingDataSeeder;
import com.todoapp.dto.BoardResponse;
import com.todoapp.dto.CommentRequest;
import com.todoapp.dto.CommentResponse;
import com.todoapp.dto.GroupCreateRequest;
import com.todoapp.dto.GroupReorderRequest;
import com.todoapp.dto.GroupResponse;
import com.todoapp.dto.GroupUpdateRequest;
import com.todoapp.dto.RecycleBinResponse;
import com.todoapp.dto.TaskReorderItem;
import com.todoapp.dto.TaskReorderRequest;
import com.todoapp.dto.TaskRequest;
import com.todoapp.dto.TaskResponse;
import com.todoapp.exception.CommentNotFoundException;
import com.todoapp.exception.GroupNotFoundException;
import com.todoapp.exception.TaskNotFoundException;
import com.todoapp.model.BoardBackup;
import com.todoapp.model.CommentBackupRecord;
import com.todoapp.model.Task;
import com.todoapp.model.GroupBackupRecord;
import com.todoapp.model.TaskBackupRecord;
import com.todoapp.model.TaskComment;
import com.todoapp.model.TaskGroup;
import com.todoapp.model.TaskPriority;
import com.todoapp.model.User;
import com.todoapp.repository.TaskCommentRepository;
import com.todoapp.repository.TaskGroupRepository;
import com.todoapp.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BoardService {

    private final TaskRepository taskRepository;
    private final TaskGroupRepository taskGroupRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final JsonBackupService jsonBackupService;
    private final WeddingDataSeeder weddingDataSeeder;

    public BoardService(
            TaskRepository taskRepository,
            TaskGroupRepository taskGroupRepository,
            TaskCommentRepository taskCommentRepository,
            JsonBackupService jsonBackupService,
            WeddingDataSeeder weddingDataSeeder) {
        this.taskRepository = taskRepository;
        this.taskGroupRepository = taskGroupRepository;
        this.taskCommentRepository = taskCommentRepository;
        this.jsonBackupService = jsonBackupService;
        this.weddingDataSeeder = weddingDataSeeder;
    }

    @Transactional
    public void ensureUserBoard(User user) {
        if (taskGroupRepository.countByUser_Id(user.getId()) > 0) {
            return;
        }
        try {
            jsonBackupService.migrateLegacyBackupForUser(user.getId());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to migrate legacy backup", e);
        }
        if (recoverFromBackupIfNeeded(user)) {
            return;
        }
        weddingDataSeeder.seedForUser(user);
    }

    @Transactional
    public BoardResponse restoreFromBackup(User user) {
        clearUserBoard(user);
        try {
            jsonBackupService.migrateLegacyBackupForUser(user.getId());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to migrate legacy backup", e);
        }
        if (!recoverFromBackupIfNeeded(user)) {
            weddingDataSeeder.seedForUser(user);
        }
        return getBoard(user);
    }

    private void clearUserBoard(User user) {
        List<Task> tasks = taskRepository.findAllByUserIdWithGroupOrderBySortOrderAscCreatedAtAsc(user.getId());
        for (Task task : tasks) {
            if (task.getId() != null) {
                taskCommentRepository.deleteByTask_Id(task.getId());
            }
        }
        taskRepository.deleteAll(tasks);
        taskGroupRepository.deleteAll(taskGroupRepository.findByUser_IdOrderBySortOrderAsc(user.getId()));
    }

    private boolean recoverFromBackupIfNeeded(User user) {
        if (!jsonBackupService.backupExists(user.getId())) {
            return false;
        }
        BoardBackup backup = jsonBackupService.loadBoard(user.getId());
        if (backup.getGroups().isEmpty() && backup.getTasks().isEmpty()) {
            return false;
        }
        Map<Long, TaskGroup> groupMap = new HashMap<>();
        for (GroupBackupRecord record : backup.getGroups()) {
            Long oldId = record.getId();
            TaskGroup group = record.toGroup();
            group.setId(null);
            group.setUser(user);
            TaskGroup saved = taskGroupRepository.save(group);
            groupMap.put(oldId, saved);
        }
        Map<Long, Task> taskMap = new HashMap<>();
        for (TaskBackupRecord record : backup.getTasks()) {
            TaskGroup group = record.getGroupId() != null ? groupMap.get(record.getGroupId()) : null;
            Task saved = taskRepository.save(record.toTask(group));
            taskMap.put(record.getId(), saved);
        }
        if (backup.getComments() != null) {
            for (CommentBackupRecord record : backup.getComments()) {
                Task task = taskMap.get(record.getTaskId());
                if (task != null) {
                    taskCommentRepository.save(record.toComment(task));
                }
            }
        }
        return true;
    }

    @Transactional(readOnly = true)
    public BoardResponse getBoard(User user) {
        List<TaskGroup> groups = taskGroupRepository.findByUser_IdOrderBySortOrderAsc(user.getId());
        List<Task> tasks = taskRepository.findAllActiveByUserIdOrderBySortOrderAscCreatedAtAsc(user.getId());
        Map<Long, List<TaskComment>> commentsByTask = loadCommentsByTaskIds(
                tasks.stream().map(Task::getId).toList());

        BoardResponse board = new BoardResponse();
        for (TaskGroup group : groups) {
            long count = tasks.stream().filter(task -> group.getId().equals(task.getGroupId())).count();
            board.getGroups().add(GroupResponse.from(group, count));
        }
        for (Task task : tasks) {
            board.getTasks().add(TaskResponse.from(task, commentsByTask.getOrDefault(task.getId(), List.of())));
        }
        return board;
    }

    @Transactional(readOnly = true)
    public RecycleBinResponse getRecycleBin(User user) {
        List<Task> tasks = taskRepository.findAllDeletedByUserIdOrderByDeletedAtDesc(user.getId());
        Map<Long, List<TaskComment>> commentsByTask = loadCommentsByTaskIds(
                tasks.stream().map(Task::getId).toList());

        RecycleBinResponse response = new RecycleBinResponse();
        for (Task task : tasks) {
            response.getTasks().add(TaskResponse.from(task, commentsByTask.getOrDefault(task.getId(), List.of())));
        }
        return response;
    }

    @Transactional(readOnly = true)
    public Task findById(User user, Long id) {
        return taskRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    @Transactional
    public GroupResponse createGroup(User user, GroupCreateRequest request) {
        String name = request.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Project name is required");
        }

        List<TaskGroup> existing = taskGroupRepository.findByUser_IdOrderBySortOrderAsc(user.getId());
        for (TaskGroup existingGroup : existing) {
            existingGroup.setSortOrder(existingGroup.getSortOrder() + 1);
            taskGroupRepository.save(existingGroup);
        }

        TaskGroup group = new TaskGroup();
        group.setUser(user);
        group.setName(name);
        group.setColor(resolveGroupColor(request.getColor(), 0));
        group.setSortOrder(0);
        TaskGroup saved = taskGroupRepository.save(group);
        writeBackupSnapshot(user);
        return GroupResponse.from(saved, 0);
    }

    @Transactional
    public GroupResponse updateGroup(User user, Long id, GroupUpdateRequest request) {
        TaskGroup group = requireGroup(user, id);

        if (request.getName() != null) {
            String name = request.getName().trim();
            if (name.isEmpty()) {
                throw new IllegalArgumentException("Project name is required");
            }
            group.setName(name);
        }
        if (request.getColor() != null && !request.getColor().isBlank()) {
            group.setColor(request.getColor().trim());
        }

        TaskGroup saved = taskGroupRepository.save(group);
        writeBackupSnapshot(user);
        long count = taskRepository.countByGroup_IdAndDeletedAtIsNull(id);
        return GroupResponse.from(saved, count);
    }

    @Transactional
    public void deleteGroup(User user, Long id) {
        TaskGroup group = requireGroup(user, id);

        Instant now = Instant.now();
        for (Task task : taskRepository.findByGroup_IdAndDeletedAtIsNullOrderBySortOrderAsc(id)) {
            task.setDeletedAt(now);
            taskRepository.save(task);
        }

        taskGroupRepository.delete(group);
        writeBackupSnapshot(user);
    }

    @Transactional
    public BoardResponse reorderGroups(User user, GroupReorderRequest request) {
        List<Long> orderedIds = request.getGroupIds();
        List<TaskGroup> existing = taskGroupRepository.findByUser_IdOrderBySortOrderAsc(user.getId());

        if (orderedIds.size() != existing.size()) {
            throw new IllegalArgumentException("Group order must include every project");
        }

        java.util.Set<Long> existingIds = existing.stream()
                .map(TaskGroup::getId)
                .collect(java.util.stream.Collectors.toSet());
        if (!existingIds.equals(new java.util.HashSet<>(orderedIds))) {
            throw new IllegalArgumentException("Invalid project order");
        }

        java.util.Map<Long, TaskGroup> groupsById = existing.stream()
                .collect(java.util.stream.Collectors.toMap(TaskGroup::getId, group -> group));

        for (int index = 0; index < orderedIds.size(); index++) {
            TaskGroup group = groupsById.get(orderedIds.get(index));
            group.setSortOrder(index);
            taskGroupRepository.save(group);
        }

        writeBackupSnapshot(user);
        return getBoard(user);
    }

    private static final String[] DEFAULT_GROUP_COLORS = {
            "#8B5CF6", "#3B82F6", "#EF4444", "#F97316", "#14B8A6",
            "#EC4899", "#22C55E", "#EAB308", "#6366F1", "#6B7280",
    };

    private String resolveGroupColor(String color, int sortOrder) {
        if (color != null && !color.isBlank()) {
            return color.trim();
        }
        return DEFAULT_GROUP_COLORS[Math.floorMod(sortOrder, DEFAULT_GROUP_COLORS.length)];
    }

    @Transactional
    public GroupResponse renameGroup(User user, Long id, String name) {
        GroupUpdateRequest request = new GroupUpdateRequest();
        request.setName(name);
        return updateGroup(user, id, request);
    }

    @Transactional
    public Task create(User user, TaskRequest request) {
        Task task = new Task();
        task.setTitle(request.getTitle().trim());
        task.setDescription(normalizeDescription(request.getDescription()));
        task.setDone(false);
        task.setPriority(TaskPriority.NONE);
        applyGroupAndOrder(user, task, request.getGroupId(), request.getSortOrder());
        writeBackupBeforePersist(user, List.of(task));
        Task saved = taskRepository.save(task);
        writeBackupSnapshot(user);
        return saved;
    }

    @Transactional
    public Task update(User user, Long id, TaskRequest request) {
        Task task = findById(user, id);
        if (task.isDeleted()) {
            throw new TaskNotFoundException(id);
        }
        if (request.getTitle() != null) {
            task.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            task.setDescription(normalizeDescription(request.getDescription()));
        }
        if (request.getDone() != null) {
            task.setDone(request.getDone());
        }
        if (request.getGroupId() != null || request.getSortOrder() != null) {
            applyGroupAndOrder(user, task, request.getGroupId(), request.getSortOrder());
        }
        writeBackupSnapshot(user);
        return taskRepository.save(task);
    }

    @Transactional
    public Task setDone(User user, Long id, boolean done) {
        Task task = findActiveTask(user, id);
        task.setDone(done);
        Task saved = taskRepository.save(task);
        writeBackupSnapshot(user);
        return saved;
    }

    @Transactional
    public Task setPriority(User user, Long id, TaskPriority priority) {
        Task task = findActiveTask(user, id);
        task.setPriority(priority != null ? priority : TaskPriority.NONE);
        Task saved = taskRepository.save(task);
        writeBackupSnapshot(user);
        return saved;
    }

    @Transactional(readOnly = true)
    public TaskResponse toTaskResponse(User user, Task task) {
        requireOwnedTask(user, task);
        List<TaskComment> comments = taskCommentRepository.findByTask_IdOrderByCreatedAtAsc(task.getId());
        return TaskResponse.from(task, comments);
    }

    @Transactional
    public CommentResponse addComment(User user, Long taskId, CommentRequest request) {
        Task task = findActiveTask(user, taskId);
        TaskComment comment = new TaskComment();
        comment.setTask(task);
        comment.setText(request.getText().trim());
        TaskComment saved = taskCommentRepository.save(comment);
        writeBackupSnapshot(user);
        return CommentResponse.from(saved);
    }

    @Transactional
    public CommentResponse updateComment(User user, Long taskId, Long commentId, CommentRequest request) {
        findActiveTask(user, taskId);
        TaskComment comment = taskCommentRepository.findById(commentId)
                .orElseThrow(() -> new CommentNotFoundException(commentId));
        if (!taskId.equals(comment.getTaskId())) {
            throw new CommentNotFoundException(commentId);
        }
        String text = request.getText().trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("Comment text is required");
        }
        comment.setText(text);
        TaskComment saved = taskCommentRepository.save(comment);
        writeBackupSnapshot(user);
        return CommentResponse.from(saved);
    }

    @Transactional
    public void deleteComment(User user, Long taskId, Long commentId) {
        findActiveTask(user, taskId);
        TaskComment comment = taskCommentRepository.findById(commentId)
                .orElseThrow(() -> new CommentNotFoundException(commentId));
        if (!taskId.equals(comment.getTaskId())) {
            throw new CommentNotFoundException(commentId);
        }
        taskCommentRepository.delete(comment);
        writeBackupSnapshot(user);
    }

    @Transactional
    public void softDelete(User user, Long id) {
        Task task = findActiveTask(user, id);
        task.setDeletedAt(Instant.now());
        taskRepository.save(task);
        writeBackupSnapshot(user);
    }

    @Transactional
    public Task restore(User user, Long id) {
        Task task = findById(user, id);
        if (!task.isDeleted()) {
            throw new IllegalArgumentException("Task is not in recycle bin");
        }
        task.setDeletedAt(null);
        Task saved = taskRepository.save(task);
        writeBackupSnapshot(user);
        return saved;
    }

    @Transactional
    public BoardResponse reorder(User user, TaskReorderRequest request) {
        Map<Long, TaskGroup> groupsById = new HashMap<>();
        taskGroupRepository.findByUser_IdOrderBySortOrderAsc(user.getId())
                .forEach(group -> groupsById.put(group.getId(), group));

        List<Task> modified = new ArrayList<>();
        for (TaskReorderItem item : request.getItems()) {
            Task task = findActiveTask(user, item.getTaskId());
            if (item.getGroupId() != null) {
                TaskGroup group = groupsById.get(item.getGroupId());
                if (group == null) {
                    throw new IllegalArgumentException("Group not found with id: " + item.getGroupId());
                }
                task.setGroup(group);
            } else {
                task.setGroup(null);
            }
            task.setSortOrder(item.getSortOrder());
            modified.add(task);
        }

        List<Task> snapshot = new ArrayList<>(
                taskRepository.findAllByUserIdWithGroupOrderBySortOrderAscCreatedAtAsc(user.getId()));
        Map<Long, Task> modifiedById = new HashMap<>();
        modified.forEach(task -> modifiedById.put(task.getId(), task));
        snapshot.replaceAll(task -> modifiedById.getOrDefault(task.getId(), task));
        writeBackupList(user, snapshot);

        taskRepository.saveAll(modified);
        return getBoard(user);
    }

    private Task findActiveTask(User user, Long id) {
        Task task = findById(user, id);
        if (task.isDeleted()) {
            throw new TaskNotFoundException(id);
        }
        return task;
    }

    private TaskGroup requireGroup(User user, Long id) {
        return taskGroupRepository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new GroupNotFoundException(id));
    }

    private void requireOwnedTask(User user, Task task) {
        if (task.getGroup() == null || task.getGroup().getUser() == null
                || !user.getId().equals(task.getGroup().getUser().getId())) {
            throw new TaskNotFoundException(task.getId());
        }
    }

    private Map<Long, List<TaskComment>> loadCommentsByTaskIds(List<Long> taskIds) {
        if (taskIds.isEmpty()) {
            return Map.of();
        }
        return taskCommentRepository.findByTask_IdInOrderByCreatedAtAsc(taskIds).stream()
                .collect(Collectors.groupingBy(TaskComment::getTaskId));
    }

    private void applyGroupAndOrder(User user, Task task, Long groupId, Integer sortOrder) {
        if (groupId != null) {
            TaskGroup group = requireGroup(user, groupId);
            task.setGroup(group);
        }
        if (sortOrder != null) {
            task.setSortOrder(sortOrder);
        } else if (task.getGroup() != null) {
            long existing = taskRepository.countByGroup_IdAndDeletedAtIsNull(task.getGroup().getId());
            task.setSortOrder((int) existing);
        }
    }

    private void writeBackupBeforePersist(User user, List<Task> pending) {
        List<Task> snapshot = new ArrayList<>(
                taskRepository.findAllByUserIdWithGroupOrderBySortOrderAscCreatedAtAsc(user.getId()));
        snapshot.addAll(pending);
        writeBackupList(user, snapshot);
    }

    private void writeBackupSnapshot(User user) {
        writeBackupList(user, taskRepository.findAllByUserIdWithGroupOrderBySortOrderAscCreatedAtAsc(user.getId()));
    }

    private void writeBackupList(User user, List<Task> tasks) {
        List<TaskGroup> groups = taskGroupRepository.findByUser_IdOrderBySortOrderAsc(user.getId());
        List<Long> taskIds = tasks.stream().map(Task::getId).filter(id -> id != null).toList();
        List<TaskComment> comments = taskIds.isEmpty()
                ? List.of()
                : taskCommentRepository.findByTask_IdInOrderByCreatedAtAsc(taskIds);
        try {
            jsonBackupService.saveBoard(user.getId(), groups, tasks, comments);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to write JSON backup", e);
        }
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
