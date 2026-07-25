package net.jojoaddison.abofonsa.domain.enumeration;

/**
 * The AuditAction enumeration (spec §8.2 {@code auditLog}). {@code ENQUIRY_DELETED} is additional
 * to the spec's list — §13.3's erasure right requires hard deletions themselves to be recorded.
 */
public enum AuditAction {
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    CONTENT_CREATED,
    CONTENT_UPDATED,
    CONTENT_PUBLISHED,
    CONTENT_UNPUBLISHED,
    CONTENT_ARCHIVED,
    REVISION_RESTORED,
    TRANSLATION_UPDATED,
    MEDIA_UPLOADED,
    MEDIA_DELETED,
    USER_CREATED,
    USER_DISABLED,
    ENQUIRY_VIEWED,
    ENQUIRY_UPDATED,
    ENQUIRY_DELETED
}
