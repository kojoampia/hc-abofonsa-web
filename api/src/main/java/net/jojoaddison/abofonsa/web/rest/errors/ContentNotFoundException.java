package net.jojoaddison.abofonsa.web.rest.errors;

public class ContentNotFoundException extends RuntimeException {

    public ContentNotFoundException(String message) {
        super(message);
    }

    public static ContentNotFoundException forId(String type, String id) {
        return new ContentNotFoundException("%s %s not found".formatted(type, id));
    }
}
