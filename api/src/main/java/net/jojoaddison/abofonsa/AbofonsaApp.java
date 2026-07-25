package net.jojoaddison.abofonsa;

import net.jojoaddison.abofonsa.config.ApplicationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
@org.springframework.scheduling.annotation.EnableScheduling
@EnableConfigurationProperties(ApplicationProperties.class)
public class AbofonsaApp {

    public static void main(String[] args) {
        SpringApplication.run(AbofonsaApp.class, args);
    }
}
