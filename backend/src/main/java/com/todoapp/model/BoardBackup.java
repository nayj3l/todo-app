package com.todoapp.model;

import java.util.ArrayList;
import java.util.List;

public class BoardBackup {

    private List<GroupBackupRecord> groups = new ArrayList<>();
    private List<TaskBackupRecord> tasks = new ArrayList<>();
    private List<CommentBackupRecord> comments = new ArrayList<>();

    public List<GroupBackupRecord> getGroups() {
        return groups;
    }

    public void setGroups(List<GroupBackupRecord> groups) {
        this.groups = groups;
    }

    public List<TaskBackupRecord> getTasks() {
        return tasks;
    }

    public void setTasks(List<TaskBackupRecord> tasks) {
        this.tasks = tasks;
    }

    public List<CommentBackupRecord> getComments() {
        return comments;
    }

    public void setComments(List<CommentBackupRecord> comments) {
        this.comments = comments;
    }
}
