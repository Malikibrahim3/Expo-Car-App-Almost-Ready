/**
 * IOSSegmentedControl - Linear Dark Theme
 */
import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { IOSText } from './IOSText';
import { IOS_RADIUS, IOS_MIN_TAP, IOS_COLORS } from './theme';

interface Segment {
  value: string;
  label: string;
  icon?: string;
}

interface IOSSegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle | ViewStyle[];
}

export const IOSSegmentedControl: React.FC<IOSSegmentedControlProps> = ({ 
  segments, 
  value, 
  onChange,
  style 
}) => {
  return (
    <View style={[styles.container, style]}>
      {segments.map((segment, index) => {
        const isSelected = segment.value === value;
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;
        
        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            style={({ pressed }) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              isFirst && styles.segmentFirst,
              isLast && styles.segmentLast,
              pressed && styles.segmentPressed,
            ]}
          >
            <IOSText 
              style={[styles.label, isSelected && styles.labelSelected]}
              weight={isSelected ? 'semibold' : 'regular'}
            >
              {segment.label}
            </IOSText>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: IOS_COLORS.tertiarySystemBackground,
    borderRadius: IOS_RADIUS,
    padding: 4,
    minHeight: IOS_MIN_TAP,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  segmentSelected: {
    backgroundColor: IOS_COLORS.brand,
    borderRadius: IOS_RADIUS - 2,
  },
  segmentFirst: {
    borderTopLeftRadius: IOS_RADIUS - 2,
    borderBottomLeftRadius: IOS_RADIUS - 2,
  },
  segmentLast: {
    borderTopRightRadius: IOS_RADIUS - 2,
    borderBottomRightRadius: IOS_RADIUS - 2,
  },
  segmentPressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 13,
    color: IOS_COLORS.labelSecondary,
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
