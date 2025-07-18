# Backend Export Integration Documentation

## Overview

This document describes the integration of backend export triggers with database operations for the mobile client integration feature. The system automatically generates and uploads data exports to Supabase Storage whenever client or cession data changes.

## Architecture

### Event-Driven Export System

The system uses Spring's event publishing mechanism to trigger exports asynchronously after successful database transactions:

1. **Data Change Events**: Published by service classes when data is modified
2. **Event Listener**: Processes events and triggers export generation
3. **Export Service**: Generates JSON exports of client and cession data
4. **Supabase Integration**: Uploads exports to cloud storage for mobile access

### Components

#### 1. DataChangeEvent
- **Location**: `com.example.cessionappbackend.events.DataChangeEvent`
- **Purpose**: Represents a data change operation
- **Properties**:
  - `entityType`: Type of entity (Client, Cession, Payment, etc.)
  - `operation`: Operation type (CREATE, UPDATE, DELETE)
  - `entityId`: ID of the affected entity

#### 2. DataChangeEventListener
- **Location**: `com.example.cessionappbackend.events.DataChangeEventListener`
- **Purpose**: Handles data change events and triggers exports
- **Features**:
  - Asynchronous processing with `@Async`
  - Transaction-aware with `@TransactionalEventListener`
  - Automatic retry and error handling
  - Supabase Storage integration

#### 3. Services with Event Publishing

The following services publish data change events:

##### ClientService
- **Events**: Client CREATE, UPDATE, DELETE
- **Impact**: Affects mobile client data synchronization

##### CessionService
- **Events**: Cession CREATE, UPDATE, DELETE
- **Impact**: Affects loan and payment data for mobile clients

##### PaymentService
- **Events**: Payment CREATE
- **Impact**: Updates cession calculations and mobile data

##### DocumentService
- **Events**: Document CREATE, DELETE
- **Impact**: Affects client document availability

##### WorkplaceService
- **Events**: Workplace CREATE, DELETE
- **Impact**: Affects client workplace associations

##### JobService
- **Events**: Job CREATE, UPDATE, DELETE
- **Impact**: Affects client job associations

## Event Flow

```
Database Operation → Service Method → Event Publishing → Transaction Commit → Event Listener → Export Generation → Supabase Upload
```

### Detailed Flow

1. **Database Operation**: User performs CRUD operation via API
2. **Service Method**: Service class processes the operation
3. **Event Publishing**: Service publishes `DataChangeEvent`
4. **Transaction Commit**: Database transaction completes successfully
5. **Event Listener**: `DataChangeEventListener` receives event asynchronously
6. **Export Generation**: `DataExportService` generates minified JSON export
7. **Supabase Upload**: Export is uploaded to Supabase Storage as `mobile-export.json`

## Configuration

### Async Processing
- Enabled in `CessionAppBackendApplication` with `@EnableAsync`
- Events processed asynchronously to avoid blocking main operations

### Transaction Management
- Uses `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`
- Ensures exports only occur after successful database commits
- Includes rollback handling for logging

### Error Handling
- Export failures don't affect main business operations
- Comprehensive logging for monitoring and debugging
- Retry logic in Supabase upload operations

## Export Data Structure

The system exports data in the following JSON structure:

```json
{
  "metadata": {
    "exportDate": "2024-01-01T00:00:00Z",
    "version": "1.0",
    "recordCount": {
      "clients": 10,
      "cessions": 25
    }
  },
  "clients": [
    {
      "id": "uuid",
      "clientNumber": 1,
      "fullName": "Client Name",
      "cin": "12345678",
      "phoneNumber": "+1234567890",
      "address": "Client Address",
      "workerNumber": "1234567890",
      "workplace": {
        "id": "uuid",
        "name": "Workplace Name"
      },
      "job": {
        "id": "uuid",
        "name": "Job Title"
      },
      "cessions": [
        {
          "id": "uuid",
          "monthlyPayment": 1000.00,
          "startDate": "2024-01-01",
          "endDate": "2025-07-01",
          "expectedPayoffDate": "2025-07-01",
          "remainingBalance": 15000.00,
          "totalLoanAmount": 18000.00,
          "currentProgress": 16.67,
          "monthsRemaining": 15,
          "bankOrAgency": "Bank Name",
          "status": "ACTIVE"
        }
      ]
    }
  ]
}
```

## Monitoring and Logging

### Log Levels
- **INFO**: Successful operations and timing information
- **WARN**: Transaction rollbacks and retry attempts
- **ERROR**: Export failures and exceptions
- **DEBUG**: Detailed export content and event processing

### Key Metrics Logged
- Export generation time
- Upload time to Supabase
- Export data size
- Success/failure rates
- Entity types and operations

## Testing

### Integration Tests
- `DataChangeEventIntegrationTest`: Validates event publishing and processing
- Mock services for isolated testing
- Transaction rollback for test data cleanup

### Manual Testing
1. Create/update/delete clients or cessions via API
2. Check logs for event processing
3. Verify export upload to Supabase Storage
4. Validate mobile client can access updated data

## Troubleshooting

### Common Issues

#### Export Not Generated
- Check if event was published (look for service logs)
- Verify transaction completed successfully
- Check `DataChangeEventListener` logs for errors

#### Supabase Upload Failures
- Verify Supabase configuration in application properties
- Check network connectivity
- Review Supabase Storage permissions
- Check retry logic and error messages

#### Performance Issues
- Monitor export generation time
- Check database query performance
- Verify async processing is working
- Consider export data size optimization

### Debug Steps
1. Enable DEBUG logging for `com.example.cessionappbackend.events`
2. Check database transaction logs
3. Verify Supabase configuration with test connection
4. Monitor system resources during export operations

## Future Enhancements

### Potential Improvements
1. **Incremental Exports**: Only export changed data instead of full exports
2. **Export Versioning**: Maintain multiple export versions for rollback
3. **Compression**: Compress large exports before upload
4. **Batch Processing**: Group multiple events for efficiency
5. **Health Monitoring**: Add health checks for export system
6. **Export Scheduling**: Periodic exports independent of data changes

### Scalability Considerations
- Consider message queues for high-volume environments
- Implement export data partitioning for large datasets
- Add caching for frequently accessed export data
- Monitor and optimize database queries for export generation