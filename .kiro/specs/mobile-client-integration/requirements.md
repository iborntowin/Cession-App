# Requirements Document

## Introduction

This feature extends the existing Cession Management App by creating a mobile React Native client that provides read-only access to client and cession data. The mobile app will sync data from the main application through automated JSON exports to Supabase Storage, allowing field workers and managers to view client information and cession status on mobile devices without requiring direct database access.

## Requirements

### Requirement 1

**User Story:** As a field worker, I want to view client and cession data on my mobile device, so that I can access important information while away from the office.

#### Acceptance Criteria

1. WHEN the mobile app launches THEN the system SHALL display a list of all clients with their basic information
2. WHEN I tap on a client THEN the system SHALL show detailed client information including active cessions
3. WHEN viewing cession details THEN the system SHALL display payment status, remaining balance, and progress information
4. WHEN data is outdated THEN the system SHALL show the last sync timestamp and allow manual refresh

### Requirement 2

**User Story:** As a system administrator, I want the backend to automatically export data to Supabase Storage, so that mobile clients can access current information without direct database connections.

#### Acceptance Criteria

1. WHEN any database write operation completes successfully THEN the system SHALL generate a minified JSON export containing all client and cession data
2. WHEN the JSON export is generated THEN the system SHALL upload it to Supabase Storage with a timestamped filename
3. WHEN the upload completes THEN the system SHALL generate a public URL for the exported data
4. IF the export or upload fails THEN the system SHALL log the error and continue normal operations without disrupting the main application

### Requirement 3

**User Story:** As a system administrator, I want to monitor data export status through the web interface, so that I can ensure mobile clients have access to current data.

#### Acceptance Criteria

1. WHEN I visit the settings page THEN the system SHALL display the last successful export timestamp
2. WHEN I view export status THEN the system SHALL show the current Supabase sync status (success/failure)
3. WHEN export data is available THEN the system SHALL display a clickable public URL to the JSON file
4. WHEN I click "Force Manual Export" THEN the system SHALL immediately trigger a new export and upload process
5. WHEN manual export completes THEN the system SHALL update the status display with new information

### Requirement 4

**User Story:** As a mobile app user, I want the app to work offline with cached data, so that I can access information even without internet connectivity.

#### Acceptance Criteria

1. WHEN the app successfully downloads data THEN the system SHALL cache it locally on the device
2. WHEN the device is offline THEN the system SHALL display cached data with a clear offline indicator
3. WHEN the device comes back online THEN the system SHALL automatically attempt to sync new data
4. WHEN cached data is older than 24 hours THEN the system SHALL display a warning about data freshness

### Requirement 5

**User Story:** As a mobile app user, I want to search and filter client information, so that I can quickly find specific clients or cessions.

#### Acceptance Criteria

1. WHEN I enter text in the search field THEN the system SHALL filter clients by name, CIN, or worker number
2. WHEN I apply status filters THEN the system SHALL show only cessions matching the selected status
3. WHEN I sort by different criteria THEN the system SHALL reorder the list accordingly
4. WHEN search results are empty THEN the system SHALL display a helpful "no results" message

### Requirement 6

**User Story:** As a developer, I want the mobile app to be built with React Native and Expo, so that it can be easily deployed to both iOS and Android platforms.

#### Acceptance Criteria

1. WHEN the mobile app is built THEN it SHALL use React Native with Expo framework
2. WHEN the app is compiled THEN it SHALL run on both iOS and Android devices
3. WHEN using HTTP requests THEN the system SHALL use appropriate libraries for API communication
4. WHEN managing state THEN the system SHALL use React hooks and context for data management
5. WHEN displaying data THEN the system SHALL use modern UI components with responsive design

### Requirement 7

**User Story:** As a system administrator, I want the Supabase integration to be secure and configurable, so that data access is controlled and the system can be easily maintained.

#### Acceptance Criteria

1. WHEN configuring Supabase access THEN the system SHALL use environment variables for all credentials
2. WHEN uploading files THEN the system SHALL use appropriate authentication methods
3. WHEN generating public URLs THEN the system SHALL ensure they are accessible without authentication for mobile clients
4. WHEN the mobile app accesses data THEN it SHALL not require user authentication (read-only public access)
5. IF Supabase credentials are invalid THEN the system SHALL log appropriate error messages and continue operating