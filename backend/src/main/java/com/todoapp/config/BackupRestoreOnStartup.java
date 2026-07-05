package com.todoapp.config;

import com.todoapp.repository.TaskGroupRepository;
import com.todoapp.repository.UserRepository;
import com.todoapp.service.BoardService;
import com.todoapp.service.JsonBackupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class BackupRestoreOnStartup {

    private static final Logger log = LoggerFactory.getLogger(BackupRestoreOnStartup.class);

    private final UserRepository userRepository;
    private final TaskGroupRepository taskGroupRepository;
    private final JsonBackupService jsonBackupService;
    private final BoardService boardService;

    public BackupRestoreOnStartup(
            UserRepository userRepository,
            TaskGroupRepository taskGroupRepository,
            JsonBackupService jsonBackupService,
            BoardService boardService) {
        this.userRepository = userRepository;
        this.taskGroupRepository = taskGroupRepository;
        this.jsonBackupService = jsonBackupService;
        this.boardService = boardService;
    }

    @EventListener(ApplicationReadyEvent.class)
    void restoreEmptyBoardsFromBackup() {
        userRepository.findAll().forEach(user -> {
            if (taskGroupRepository.countByUser_Id(user.getId()) > 0) {
                return;
            }
            if (!jsonBackupService.backupExists(user.getId())) {
                return;
            }
            log.info("Restoring board for user {} from JSON backup", user.getId());
            boardService.restoreFromBackup(user);
        });
    }
}
