package com.todoapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.todoapp.model.BoardBackup;
import com.todoapp.model.CommentBackupRecord;
import com.todoapp.model.GroupBackupRecord;
import com.todoapp.model.Task;
import com.todoapp.model.TaskBackupRecord;
import com.todoapp.model.TaskComment;
import com.todoapp.model.TaskGroup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

@Service
public class JsonBackupService {

    private final ObjectMapper objectMapper;
    private final Path backupPath;

    public JsonBackupService(@Value("${app.backup.path}") String backupPath) {
        this.backupPath = Paths.get(backupPath).toAbsolutePath().normalize();
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .enable(SerializationFeature.INDENT_OUTPUT);
    }

    public void saveBoard(List<TaskGroup> groups, List<Task> tasks, List<TaskComment> comments) throws IOException {
        Files.createDirectories(backupPath.getParent());
        BoardBackup backup = new BoardBackup();
        backup.setGroups(groups.stream().map(GroupBackupRecord::from).toList());
        backup.setTasks(tasks.stream().map(TaskBackupRecord::from).toList());
        backup.setComments(comments.stream().map(CommentBackupRecord::from).toList());

        Path tempPath = backupPath.resolveSibling(backupPath.getFileName() + ".tmp");
        objectMapper.writeValue(tempPath.toFile(), backup);
        try {
            Files.move(tempPath, backupPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException atomicMoveFailed) {
            Files.move(tempPath, backupPath, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    public BoardBackup loadBoard() {
        if (!Files.exists(backupPath)) {
            return new BoardBackup();
        }
        try {
            return objectMapper.readValue(backupPath.toFile(), BoardBackup.class);
        } catch (IOException legacyError) {
            return new BoardBackup();
        }
    }

    public boolean backupExists() {
        return Files.exists(backupPath);
    }
}
