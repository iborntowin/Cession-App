package com.example.cessionappbackend.events;

import org.springframework.context.ApplicationEvent;

/**
 * Event fired when client or cession data changes
 */
public class DataChangeEvent extends ApplicationEvent {
    
    private final String entityType;
    private final String operation;
    private final Object entityId;
    
    public DataChangeEvent(Object source, String entityType, String operation, Object entityId) {
        super(source);
        this.entityType = entityType;
        this.operation = operation;
        this.entityId = entityId;
    }
    
    public String getEntityType() {
        return entityType;
    }
    
    public String getOperation() {
        return operation;
    }
    
    public Object getEntityId() {
        return entityId;
    }
    
    @Override
    public String toString() {
        return "DataChangeEvent{" +
                "entityType='" + entityType + '\'' +
                ", operation='" + operation + '\'' +
                ", entityId=" + entityId +
                '}';
    }
}