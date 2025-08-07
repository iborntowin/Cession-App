import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';

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
    backgroundColor: 'transparent', // Remove background to let parent handle it
    paddingHorizontal: wp(2),
    paddingVertical: hp(1),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: hp(6), // Increased height
  },
  searchInput: {
    flex: 1,
    height: hp(6), // Increased height
    paddingHorizontal: wp(4),
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    minWidth: wp(50), // Increased minimum width
  },
  clearButton: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: wp(8),
  },
  clearText: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#999',
    fontWeight: 'bold',
  },
  filterButton: {
    marginLeft: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5), // Increased to match input height
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    minWidth: wp(16),
    alignItems: 'center',
    justifyContent: 'center',
    height: hp(6), // Match input height
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#007AFF',
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
});

export default SearchBar;