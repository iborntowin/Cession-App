FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

# Install Maven manually
RUN apk add --no-cache maven

COPY pom.xml .

RUN mvn --version
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8089

ENTRYPOINT ["java", "-jar", "app.jar"]
