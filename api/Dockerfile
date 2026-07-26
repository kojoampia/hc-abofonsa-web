# Built from the REPOSITORY ROOT, not api/ — the i18n coverage report (spec §9.4 T-7) needs the
# shipped bundles that live in web/public/i18n, which the maven-resources-plugin copies onto the
# classpath (see api/pom.xml). Build with:
#   docker build -f api/Dockerfile -t abofonsa-api .
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /src
COPY api/pom.xml .
RUN mvn -B dependency:go-offline
COPY web/public/i18n /web/public/i18n
COPY api/src ./src
RUN mvn -B clean package -DskipTests -Dabofonsa.i18n.dir=/web/public/i18n

# Java 25 as the runtime target too (spec §3.1). No --enable-preview anywhere: structured
# concurrency is still preview in 25 and must not ship (spec §7.9).
FROM eclipse-temurin:25-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /src/target/*.jar app.jar

# OpenTelemetry Java agent, pinned to the same release hc-crowdfund-app runs on this host — a
# shared collector is easier to reason about when every service instruments identically. The agent
# is inert unless JAVA_TOOL_OPTIONS names it, which only infra/prod-server/compose.yml does, so
# local compose and CI are unaffected by its presence.
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.9.0/opentelemetry-javaagent.jar otel-javaagent.jar
# Media binaries live on the filesystem behind nginx (spec §8.2/§14.2 #6); this is a volume mount
# point in compose/production so uploads survive container replacement.
RUN mkdir -p /app/media-storage && chown -R app:app /app
USER app
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseZGC" \
    MEDIA_STORAGE_PATH=/app/media-storage
HEALTHCHECK --interval=30s --timeout=3s --start-period=90s \
  CMD wget -qO- http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
