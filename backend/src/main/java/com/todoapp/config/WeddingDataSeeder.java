package com.todoapp.config;

import com.todoapp.model.Task;
import com.todoapp.model.TaskGroup;
import com.todoapp.model.TaskPriority;
import com.todoapp.repository.TaskGroupRepository;
import com.todoapp.repository.TaskRepository;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class WeddingDataSeeder {

    private final TaskGroupRepository taskGroupRepository;
    private final TaskRepository taskRepository;

    public WeddingDataSeeder(TaskGroupRepository taskGroupRepository, TaskRepository taskRepository) {
        this.taskGroupRepository = taskGroupRepository;
        this.taskRepository = taskRepository;
    }

    public void seedIfEmpty() {
        if (taskGroupRepository.count() > 0) {
            return;
        }

        Map<String, GroupSeed> groups = new LinkedHashMap<>();
        groups.put("Planning & Timeline", new GroupSeed("#8B5CF6", List.of(
                "Schedule of prenup shoot",
                "Budget setting",
                "Prepare a checklist of priorities",
                "Brainstorming - concepts, organizers and suppliers comparison"
        )));
        groups.put("Invitations & Guests", new GroupSeed("#3B82F6", List.of(
                "Book an invitation supplier",
                "Distribute invitation",
                "Confirm wedding attendance – rsvp"
        )));
        groups.put("Ceremony & Entourage", new GroupSeed("#EF4444", List.of(
                "List down final entourage line up",
                "Complete principal sponsor lists",
                "Complete church requirements",
                "Complete government requirements",
                "Write your vows",
                "Complete your wedding essentials, bible, aras, cord, candle 3 – 5 pcs, 13 coins, 2 pillows, veil 1 & 2, flower basket"
        )));
        groups.put("Coordination", new GroupSeed("#F97316", List.of(
                "Book an OTD coordinator (important)"
        )));
        groups.put("Venue & Reception", new GroupSeed("#14B8A6", List.of(
                "Book a host and spinner",
                "Book a picapica, cocktail, or grazing table supplier",
                "Book a photobooth supplier",
                "Book an effects supplier – confetti blaster, smoke machine, bubbles, cold fire, etc",
                "Book a mobile coffee/bar"
        )));
        groups.put("Beauty & Attire", new GroupSeed("#EC4899", List.of(
                "Book a hair & make up artist",
                "Grooming (hair, nails, facial, spa)",
                "Buy wedding rings"
        )));
        groups.put("Florals & Decor", new GroupSeed("#22C55E", List.of(
                "Book a florist",
                "Shop for wedding accessories"
        )));
        groups.put("Favors & Gifts", new GroupSeed("#EAB308", List.of(
                "Shop for wedding souvenirs",
                "Shop for wedding gift for your partner or for your parents"
        )));
        groups.put("Music & Entertainment", new GroupSeed("#6366F1", List.of(
                "Choose wedding songs"
        )));
        groups.put("Final Pickups", new GroupSeed("#6B7280", List.of(
                "Pick up items from suppliers"
        )));

        int groupOrder = 0;
        for (Map.Entry<String, GroupSeed> entry : groups.entrySet()) {
            TaskGroup group = new TaskGroup();
            group.setName(entry.getKey());
            group.setColor(entry.getValue().color());
            group.setSortOrder(groupOrder++);
            TaskGroup savedGroup = taskGroupRepository.save(group);

            int taskOrder = 0;
            for (String title : entry.getValue().tasks()) {
                Task task = new Task();
                task.setTitle(title);
                task.setGroup(savedGroup);
                task.setSortOrder(taskOrder++);
                task.setDone(false);
                task.setPriority(TaskPriority.NONE);
                taskRepository.save(task);
            }
        }
    }

    private record GroupSeed(String color, List<String> tasks) {
    }
}
