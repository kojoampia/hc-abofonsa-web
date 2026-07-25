package net.jojoaddison.abofonsa.repository;

import java.util.Optional;
import net.jojoaddison.abofonsa.domain.AdminUser;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AdminUserRepository extends MongoRepository<AdminUser, String> {

    Optional<AdminUser> findByUsername(String username);

    Optional<AdminUser> findByEmail(String email);
}
