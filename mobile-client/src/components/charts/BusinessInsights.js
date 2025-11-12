import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { wp, hp } from '../../utils/responsive';

const BusinessInsights = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return (
      <View style={{ padding: hp(2) }}>
        <Text style={{ color: '#666', textAlign: 'center' }}>No insights available</Text>
      </View>
    );
  }

  const getInsightColor = (type) => {
    switch (type) {
      case 'positive':
        return '#10b981';
      case 'negative':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive':
        return '📈';
      case 'negative':
        return '📉';
      case 'warning':
        return '⚠️';
      default:
        return '💡';
    }
  };

  return (
    <View style={{ padding: hp(2) }}>
      <Text style={{
        fontSize: wp(5),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: hp(2),
        textAlign: 'center'
      }}>
        Business Insights
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp(2) }}
      >
        {insights.map((insight, index) => (
          <View
            key={index}
            style={{
              backgroundColor: '#fff',
              borderRadius: wp(3),
              padding: wp(4),
              marginBottom: hp(1.5),
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 3.84,
              elevation: 5,
              borderLeftWidth: wp(1),
              borderLeftColor: getInsightColor(insight.type)
            }}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: hp(1)
            }}>
              <Text style={{
                fontSize: wp(6),
                marginRight: wp(2)
              }}>
                {getInsightIcon(insight.type)}
              </Text>

              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: wp(4),
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: hp(0.5)
                }}>
                  {insight.title}
                </Text>

                <Text style={{
                  fontSize: wp(5),
                  fontWeight: 'bold',
                  color: getInsightColor(insight.type)
                }}>
                  {insight.value}
                </Text>
              </View>
            </View>

            <Text style={{
              fontSize: wp(3.5),
              color: '#666',
              lineHeight: wp(5)
            }}>
              {insight.description}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default BusinessInsights;