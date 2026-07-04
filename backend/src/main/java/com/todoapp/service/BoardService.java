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
import com.todoapp.repository.TaskCommentRepository;
import com.todoapp.repository.TaskGroupRepository;
import com.todoapp.repository.TaskRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
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

    @PostConstruct
    void initialize() {
        recoverFromBackupIfNeeded();
        weddingDataSeeder.seedIfEmpty();
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void syncBackupOnStartup() {
        writeBackupSnapshot();
    }

    private void recoverFromBackupIfNeeded() {
        if (taskGroupRepository.count() > 0 || taskRepository.count() > 0) {
            return;
        }
        if (!jsonBackupService.backupExists()) {
            return;
        }
        BoardBackup backup = jsonBackupService.loadBoard();
        if (backup.getGroups().isEmpty() && backup.getTasks().isEmpty()) {
            return;
        }
        Map<Long, TaskGroup> groupMap = new HashMap<>();
        for (GroupBackupRecord record : backup.getGroups()) {
            Long oldId = record.getId();
            TaskGroup group = record.toGroup();
            group.setId(null);
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
    }

    @Transactional(readOnly = true)
    public BoardResponse getBoard() {
        List<TaskGroup> groups = taskGroupRepository.findAllByOrderBySortOrderAsc();
        List<Task> tasks = taskRepository.findAllActiveWithGroupOrderBySortOrderAscCreatedAtAsc();
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
    public RecycleBinResponse getRecycleBin() {
        List<Task> tasks = taskRepository.findAllDeletedWithGroupOrderByDeletedAtDesc();
        Map<Long, List<TaskComment>> commentsByTask = loadCommentsByTaskIds(
                tasks.stream().map(Task::getId).toList());

        RecycleBinResponse response = new RecycleBinResponse();
        for (Task task : tasks) {
            response.getTasks().add(TaskResponse.from(task, commentsByTask.getOrDefault(task.getId(), List.of())));
        }
        return response;
    }

    @Transactional(readOnly = true)
    public Task findById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    @Transactional
    public GroupResponse createGroup(GroupCreateRequest request) {
        String name = request.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Project name is required");
        }

        List<TaskGroup> existing = taskGroupRepository.findAllByOrderBySortOrderAsc();
        int nextOrder = existing.stream().mapToInt(TaskGroup::getSortOrder).max().orElse(-1) + 1;

        TaskGroup group = new TaskGroup();
        group.setName(name);
        group.setColor(resolveGroupColor(request.getColor(), nextOrder));
        group.setSortOrder(nextOrder);
        TaskGroup saved = taskGroupRepository.save(group);
        writeBackupSnapshot();
        return GroupResponse.from(saved, 0);
    }

    @Transactional
    public GroupResponse updateGroup(Long id, GroupUpdateRequest request) {
        TaskGroup group = taskGroupRepository.findById(id)
                .orElseThrow(() -> new GroupNotFoundException(id));

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
        writeBackupSnapshot();
        long count = taskRepository.countByGroup_IdAndDeletedAtIsNull(id);
        return GroupResponse.from(saved, count);
    }

    @Transactional
    public void deleteGroup(Long id) {
        TaskGroup group = taskGroupRepository.findById(id)
                .orElseThrow(() -> new GroupNotFoundException(id));

        Instant now = Instant.now();
        for (Task task : taskRepository.findByGroup_IdAndDeletedAtIsNullOrderBySortOrderAsc(id)) {
            task.setDeletedAt(now);
            taskRepository.save(task);
        }

        taskGroupRepository.delete(group);
        writeBackupSnapshot();
    }

    @Transactional
    public BoardResponse reorderGroups(GroupReorderRequest request) {
        List<Long> orderedIds = request.getGroupIds();
        List<TaskGroup> existing = taskGroupRepository.findAllByOrderBySortOrderAsc();

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

        writeBackupSnapshot();
        return getBoard();
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
    public GroupResponse renameGroup(Long id, String name) {
        GroupUpdateRequest request = new GroupUpdateRequest();
        request.setName(name);
        return updateGroup(id, request);
    }

    @Transactional
    public Task create(TaskRequest request) {
        Task task = new Task();
        task.setTitle(request.getTitle().trim());
        task.setDescription(normalizeDescription(request.getDescription()));
        task.setDone(false);
        task.setPriority(TaskPriority.NONE);
        applyGroupAndOrder(task, request.getGroupId(), request.getSortOrder());
        writeBackupBeforePersist(List.of(task));
        Task saved = taskRepository.save(task);
        writeBackupSnapshot();
        return saved;
    }

    @Transactional
    public Task update(Long id, TaskRequest request) {
        Task task = findById(id);
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
            applyGroupAndOrder(task, request.getGroupId(), request.getSortOrder());
        }
        writeBackupSnapshot();
        return taskRepository.save(task);
    }

    @Transactional
    public Task setDone(Long id, boolean done) {
        Task task = findActiveTask(id);
        task.setDone(done);
        Task saved = taskRepository.save(task);
        writeBackupSnapshot();
        return saved;
    }

    @Transactional
    public Task setPriority(Long id, TaskPriority priority) {
        Task task = findActiveTask(id);
        task.setPriority(priority != null ? priority : TaskPriority.NONE);
        Task saved = taskRepository.save(task);
        writeBackupSnapshot();
        return saved;
    }

    @Transactional(readOnly = true)
    public TaskResponse toTaskResponse(Task task) {
        List<TaskComment> comments = taskCommentRepository.findByTask_IdOrderByCreatedAtAsc(task.getId());
        return TaskResponse.from(task, comments);
    }

    @Transactional
    public CommentResponse addComment(Long taskId, CommentRequest request) {
        Task task = findActiveTask(taskId);
        TaskComment comment = new TaskComment();
        comment.setTask(task);
        comment.setText(request.getText().trim());
        TaskComment saved = taskCommentRepository.save(comment);
        writeBackupSnapshot();
        return CommentResponse.from(saved);
    }

    @Transactional
    public void softDelete(Long id) {
        Task task = findActiveTask(id);
        task.setDeletedAt(Instant.now());
        taskRepository.save(task);
        writeBackupSnapshot();
    }

    @Transactional
    public Task restore(Long id) {
        Task task = findById(id);
        if (!task.isDeleted()) {
            throw new IllegalArgumentException("Task is not in recycle bin");
        }
        task.setDeletedAt(null);
        Task saved = taskRepository.save(task);
        writeBackupSnapshot();
        return saved;
    }

    @Transactional
    public BoardResponse reorder(TaskReorderRequest request) {
        Map<Long, TaskGroup> groupsById = new HashMap<>();
        taskGroupRepository.findAll().forEach(group -> groupsById.put(group.getId(), group));

        List<Task> modified = new ArrayList<>();
        for (TaskReorderItem item : request.getItems()) {
            Task task = findActiveTask(item.getTaskId());
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

        List<Task> snapshot = new ArrayList<>(taskRepository.findAllWithGroupOrderBySortOrderAscCreatedAtAsc());
        Map<Long, Task> modifiedById = new HashMap<>();
        modified.forEach(task -> modifiedById.put(task.getId(), task));
        snapshot.replaceAll(task -> modifiedById.getOrDefault(task.getId(), task));
        writeBackupList(snapshot);

        taskRepository.saveAll(modified);
        return getBoard();
    }

    private Task findActiveTask(Long id) {
        Task task = findById(id);
        if (task.isDeleted()) {
            throw new TaskNotFoundException(id);
        }
        return task;
    }

    private Map<Long, List<TaskComment>> loadCommentsByTaskIds(List<Long> taskIds) {
        if (taskIds.isEmpty()) {
            return Map.of();
        }
        return taskCommentRepository.findByTask_IdInOrderByCreatedAtAsc(taskIds).stream()
                .collect(Collectors.groupingBy(TaskComment::getTaskId));
    }

    private void applyGroupAndOrder(Task task, Long groupId, Integer sortOrder) {
        if (groupId != null) {
            TaskGroup group = taskGroupRepository.findById(groupId)
                    .orElseThrow(() -> new GroupNotFoundException(groupId));
            task.setGroup(group);
        }
        if (sortOrder != null) {
            task.setSortOrder(sortOrder);
        } else if (task.getGroup() != null) {
            long existing = taskRepository.countByGroup_IdAndDeletedAtIsNull(task.getGroup().getId());
            task.setSortOrder((int) existing);
        }
    }

    private void writeBackupBeforePersist(List<Task> pending) {
        List<Task> snapshot = new ArrayList<>(taskRepository.findAllWithGroupOrderBySortOrderAscCreatedAtAsc());
        snapshot.addAll(pending);
        writeBackupList(snapshot);
    }

    private void writeBackupSnapshot() {
        writeBackupList(taskRepository.findAllWithGroupOrderBySortOrderAscCreatedAtAsc());
    }

    private void writeBackupList(List<Task> tasks) {
        List<TaskGroup> groups = taskGroupRepository.findAllByOrderBySortOrderAsc();
        List<TaskComment> comments = taskCommentRepository.findAll();
        try {
            jsonBackupService.saveBoard(groups, tasks, comments);
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
