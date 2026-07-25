package net.jojoaddison.abofonsa;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.AdminUser;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared base for every Testcontainers-backed integration test (spec §11.1/plan.md task 11). One
 * MongoDB 8.3 replica-set container is started per JVM and reused across all subclasses — plan.md
 * task 11's verification is that two independent test classes extending this run together in one
 * {@code mvn verify} without port conflicts, which a static, once-started container guarantees.
 *
 * <p>Deliberately <b>not</b> annotated {@code @Testcontainers}/{@code @Container}: that JUnit5
 * extension stops a container after the last test method of the {@code ExtensionContext} it was
 * registered against — which, for a static field declared on this shared base class, is each
 * individual subclass, not the JVM. In a multi-class run that stops the container after the
 * first test class finishes and every subsequent class fails with connection-refused. Managing
 * the lifecycle by hand (start once, never stop — Testcontainers' Ryuk reaper cleans up on JVM
 * exit) avoids that.
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    static final MongoDBContainer MONGO =
            new MongoDBContainer(DockerImageName.parse("mongo:8.3")).withCommand("--replSet", "rs0", "--bind_ip_all");

    static {
        MONGO.start();
    }

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        // spring.mongodb.uri, not spring.data.mongodb.uri - see application.yml's comment on the
        // Boot 4.1 property split.
        registry.add("spring.mongodb.uri", MONGO::getReplicaSetUrl);
    }

    @LocalServerPort
    private int port;

    /**
     * A real-HTTP {@link RestTestClient} bound to the random port this test's server started on
     * — Spring Boot 4 / Spring Framework 7 replaced the old {@code TestRestTemplate} with this
     * fluent, WebTestClient-style API (spec §11.1 predates this rename; adjusted here to match
     * what actually ships in Boot 4.1.0).
     */
    protected RestTestClient restClient;

    @Autowired
    protected MongoTemplate mongoTemplate;

    /** BCrypt cost 4 for test fixtures — strength 12 (the production setting, exercised through
     * the real login path) would make every user-creating test take ~a second of hashing. The
     * login path verifies with whatever cost the stored hash declares, so this stays realistic. */
    private static final BCryptPasswordEncoder TEST_ENCODER = new BCryptPasswordEncoder(4);

    @BeforeEach
    void initRestClient() {
        restClient = RestTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build();
    }

    /** Creates (or replaces) an active admin user with {@code mustChangePassword=false}. */
    protected void givenUser(String username, String rawPassword, AdminRole... roles) {
        mongoTemplate.remove(Query.query(Criteria.where("username").is(username)), AdminUser.class);
        mongoTemplate.insert(new AdminUser(
                null,
                1,
                username,
                username + "@abofonsa.com",
                username,
                TEST_ENCODER.encode(rawPassword),
                List.of(roles),
                List.of(),
                true,
                0,
                null,
                null,
                false,
                Instant.now(),
                "test"));
    }

    /** Logs in over real HTTP and returns the token response body (accessToken/refreshToken/...). */
    @SuppressWarnings("unchecked")
    protected Map<String, Object> login(String username, String password) {
        return restClient
                .post()
                .uri("/api/v1/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("username", username, "password", password))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
    }

    protected String accessTokenFor(String username, String password, AdminRole... roles) {
        givenUser(username, password, roles);
        return (String) login(username, password).get("accessToken");
    }
}
