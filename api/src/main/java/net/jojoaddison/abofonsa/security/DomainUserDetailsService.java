package net.jojoaddison.abofonsa.security;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.AdminUser;
import net.jojoaddison.abofonsa.repository.AdminUserRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

/** Authenticate a user from the database (hc-admin-gw shape, servlet variant). */
@Component("userDetailsService")
public class DomainUserDetailsService implements UserDetailsService {

    private final AdminUserRepository adminUserRepository;

    public DomainUserDetailsService(AdminUserRepository adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        return adminUserRepository
                .findByUsername(username.toLowerCase())
                .map(this::createSpringSecurityUser)
                .orElseThrow(() -> new UsernameNotFoundException("User " + username + " was not found"));
    }

    private UserDetails createSpringSecurityUser(AdminUser user) {
        if (!user.active()) {
            throw new UserNotActivatedException("User " + user.username() + " is not activated");
        }
        List<GrantedAuthority> authorities = user.roles().stream()
                .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role.name()))
                .toList();
        boolean locked = user.lockedUntil() != null && user.lockedUntil().isAfter(Instant.now());
        return User.withUsername(user.username())
                .password(user.passwordHash())
                .authorities(authorities)
                .accountLocked(locked)
                .build();
    }
}
