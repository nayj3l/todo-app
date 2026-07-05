package com.todoapp.config;

import com.todoapp.model.User;
import com.todoapp.repository.TaskGroupRepository;
import com.todoapp.repository.UserRepository;
import org.springframework.stereotype.Component;

@Component
public class TemplateUserInitializer {

    public static final String TEMPLATE_FIREBASE_UID = "__guest_template__";

    private final UserRepository userRepository;
    private final TaskGroupRepository taskGroupRepository;
    private final WeddingDataSeeder weddingDataSeeder;

    public TemplateUserInitializer(
            UserRepository userRepository,
            TaskGroupRepository taskGroupRepository,
            WeddingDataSeeder weddingDataSeeder) {
        this.userRepository = userRepository;
        this.taskGroupRepository = taskGroupRepository;
        this.weddingDataSeeder = weddingDataSeeder;
    }

    public User ensureTemplateUser() {
        return userRepository.findByFirebaseUid(TEMPLATE_FIREBASE_UID)
                .orElseGet(this::createTemplateUser);
    }

    private User createTemplateUser() {
        User user = new User();
        user.setFirebaseUid(TEMPLATE_FIREBASE_UID);
        user.setName("Guest Template");
        user.setEmail(null);
        user.setPictureUrl(null);
        User saved = userRepository.save(user);
        if (taskGroupRepository.countByUser_Id(saved.getId()) == 0) {
            weddingDataSeeder.seedForUser(saved);
        }
        return saved;
    }
}
