import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTranslation } from '../hooks/useTranslation';

const FilterModal = ({ visible, onClose, filters, onApplyFilters, cessionMode = false }) => {
  const [selectedFilters, setSelectedFilters] = React.useState(filters);
  
  // Translation hook
  const { t, isRTL, getTextAlign } = useTranslation();

  const statusOptions = [
    { value: 'ALL', label: t('common.all') + ' ' + t('cession.title') },
    { value: 'ACTIVE', label: t('cession.status.active') },
    { value: 'COMPLETED', label: t('cession.status.completed') },
    { value: 'OVERDUE', label: t('cession.status.overdue') },
    { value: 'PENDING', label: t('cession.status.pending') },
  ];

  const sortOptions = cessionMode ? [
    { value: 'id', label: t('cession.title') + ' ID' },
    { value: 'clientName', label: t('client.full_name') },
    { value: 'monthlyPayment', label: t('cession.monthly_payment') },
    { value: 'remainingBalance', label: t('cession.remaining_balance') },
    { value: 'progress', label: t('cession.progress') },
    { value: 'status', label: t('common.status') },
  ] : [
    { value: 'name', label: t('client.full_name') },
    { value: 'clientNumber', label: t('client.client_number') },
    { value: 'monthlyPayment', label: t('cession.monthly_payment') },
    { value: 'remainingBalance', label: t('cession.remaining_balance') },
    { value: 'progress', label: t('cession.progress') },
  ];

  const handleFilterChange = (key, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    onApplyFilters(selectedFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      status: 'ALL',
      sortBy: 'name',
      sortOrder: 'asc'
    };
    setSelectedFilters(resetFilters);
    onApplyFilters(resetFilters);
    onClose();
  };

  React.useEffect(() => {
    setSelectedFilters(filters);
  }, [filters, visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { textAlign: getTextAlign() }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { textAlign: 'center' }]}>{t('common.filter')} & {t('common.sort')}</Text>
          <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
            <Text style={[styles.applyText, { textAlign: isRTL() ? 'left' : 'right' }]}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Status Filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>{t('cession.title')} {t('common.status')}</Text>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.option}
                onPress={() => handleFilterChange('status', option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionText}>{option.label}</Text>
                  <View style={[
                    styles.radio,
                    selectedFilters.status === option.value && styles.radioSelected
                  ]}>
                    {selectedFilters.status === option.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>{t('common.sort')}</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.option}
                onPress={() => handleFilterChange('sortBy', option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionText}>{option.label}</Text>
                  <View style={[
                    styles.radio,
                    selectedFilters.sortBy === option.value && styles.radioSelected
                  ]}>
                    {selectedFilters.sortBy === option.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort Order */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>{t('common.sort')} {t('common.order')}</Text>
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleFilterChange('sortOrder', 'asc')}
            >
              <View style={[styles.optionContent, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.optionText, { textAlign: getTextAlign() }]}>{t('common.ascending')}</Text>
                <View style={[
                  styles.radio,
                  selectedFilters.sortOrder === 'asc' && styles.radioSelected
                ]}>
                  {selectedFilters.sortOrder === 'asc' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleFilterChange('sortOrder', 'desc')}
            >
              <View style={[styles.optionContent, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.optionText, { textAlign: getTextAlign() }]}>{t('common.descending')}</Text>
                <View style={[
                  styles.radio,
                  selectedFilters.sortOrder === 'desc' && styles.radioSelected
                ]}>
                  {selectedFilters.sortOrder === 'desc' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={[styles.resetText, { textAlign: 'center' }]}>{t('common.clear')} {t('common.all')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  applyButton: {
    padding: 8,
  },
  applyText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default FilterModal;