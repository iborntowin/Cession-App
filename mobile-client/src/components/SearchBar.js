import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';

const SearchBar = ({ 
  value, 
  onChangeText, 
  placeholder = "Search clients...", 
  onFilterPress,
  hasActiveFilters = false,
  onClear,
  debounceMs = 300
}) => {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onChangeText && localValue !== value) {
        onChangeText(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [localValue, debounceMs, onChangeText, value]);

  const handleTextChange = (text) => {
    setLocalValue(text);
  };

  const handleClear = () => {
    setLocalValue('');
    if (onChangeText) {
      onChangeText('');
    }
    if (onClear) {
      onClear();
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.searchInput}
            value={localValue}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {localValue.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClear}
            >
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {onFilterPress && (
          <TouchableOpacity 
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]} 
            onPress={onFilterPress}
          >
            <Text style={[styles.filterText, hasActiveFilters && styles.filterTextActive]}>
              Filter
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  filterButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
});

export default SearchBar;