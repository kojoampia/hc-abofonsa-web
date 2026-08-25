package net.jojoaddison.abofonsa.config.dbmigrations;

import static org.assertj.core.api.Assertions.assertThat;

import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * The migration that takes {@code professionalInvitationUrl} out of an existing database.
 *
 * <p>A freshly seeded database never has the field — V002 stopped writing it — so these tests put it
 * back first, in the shape production was actually found in: set to the registration URL, which is
 * what put a "Request an invitation" button on the live careers page for a flow that does not exist.
 */
class V017DropProfessionalInvitationUrlTest extends AbstractIntegrationTest {

    @Autowired
    private V017DropProfessionalInvitationUrl changelog;

    private Document settings() {
        return mongoTemplate.getCollection("siteSettings").find().first();
    }

    private void setInvitationUrl(String value) {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(new Document(), new Document("$set", new Document("professionalInvitationUrl", value)));
    }

    /**
     * One Mongo container is shared by every integration test class and nothing resets it, so a class
     * that leaves a field behind decides what a later class sees.
     */
    @AfterEach
    void leaveTheFieldRemoved() {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(new Document(), new Document("$unset", new Document("professionalInvitationUrl", "")));
    }

    @Test
    void theFieldIsRemovedFromADatabaseThatStillCarriesIt() {
        setInvitationUrl("https://professional.abofonsa.com/register");
        assertThat(settings().containsKey("professionalInvitationUrl"))
                .as("precondition: the shape production was in")
                .isTrue();

        changelog.execute(mongoTemplate);

        assertThat(settings().containsKey("professionalInvitationUrl"))
                .as("unset, not set to null - a null key is still a key the settings editor round-trips")
                .isFalse();
    }

    @Test
    void aDatabaseThatNeverHadItIsUntouched() {
        var before = settings();

        changelog.execute(mongoTemplate);

        assertThat(settings()).isEqualTo(before);
    }

    @Test
    void runningItTwiceChangesNothingTheSecondTime() {
        setInvitationUrl("https://professional.abofonsa.com/register");

        changelog.execute(mongoTemplate);
        var afterFirst = settings();
        changelog.execute(mongoTemplate);

        assertThat(settings()).isEqualTo(afterFirst);
    }
}
