package com.todoapp.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.todoapp.model.User;
import com.todoapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FirebaseAuthService {

    private final UserRepository userRepository;
    private final BoardService boardService;

    public FirebaseAuthService(UserRepository userRepository, BoardService boardService) {
        this.userRepository = userRepository;
        this.boardService = boardService;
    }

    public FirebaseToken verifyIdToken(String idToken) throws FirebaseAuthException {
        if (FirebaseApp.getApps().isEmpty()) {
            throw new IllegalStateException("Firebase is not configured on the server");
        }
        return FirebaseAuth.getInstance().verifyIdToken(idToken);
    }

    @Transactional
    public User resolveUser(FirebaseToken token) {
        String uid = token.getUid();
        String name = token.getName() != null ? token.getName() : "Google User";
        String email = token.getEmail();
        String picture = token.getPicture();

        User user = userRepository.findByFirebaseUid(uid)
                .map(existing -> updateProfile(existing, name, email, picture))
                .orElseGet(() -> createUser(uid, name, email, picture));

        boardService.ensureUserBoard(user);

        return user;
    }

    private User createUser(String firebaseUid, String name, String email, String pictureUrl) {
        User user = new User();
        user.setFirebaseUid(firebaseUid);
        user.setName(name);
        user.setEmail(email);
        user.setPictureUrl(pictureUrl);
        return userRepository.save(user);
    }

    private User updateProfile(User user, String name, String email, String pictureUrl) {
        user.setName(name);
        if (email != null) {
            user.setEmail(email);
        }
        if (pictureUrl != null) {
            user.setPictureUrl(pictureUrl);
        }
        return userRepository.save(user);
    }
}
