package net.jojoaddison.abofonsa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class AbofonsaApp {

    public static void main(String[] args) {
        SpringApplication.run(AbofonsaApp.class, args);
    }
}
