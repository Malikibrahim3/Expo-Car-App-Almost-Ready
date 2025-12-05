/**
 * IOSModal - Apple HIG compliant modal
 * Clean, borderless design with proper iOS animations
 */
import React from 'react';
import { Modal, View, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { IOS_PADDING } from './theme';
import { useThemeMode } from '../../context/ThemeContext';

interface IOSModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  dismissable?: boolean;
}

export const IOSModal: React.FC<IOSModalProps> = ({ 
  visible, 
  onDismiss, 
  children,
  dismissable = true 
}) => {
  const { colors } = useThemeMode();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Pressable 
          style={styles.backdrop} 
          onPress={dismissable ? onDismiss : undefined}
        >
          <Pressable 
            style={[styles.content, { backgroundColor: colors.surface }]} 
            onPress={(e) => e.stopPropagation()}
          >
            {/* iOS-style drag indicator */}
            <View style={[styles.dragIndicator, { backgroundColor: colors.textQuaternary }]} />
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: IOS_PADDING,
    paddingTop: 8,
    maxHeight: '90%',
  },
  dragIndicator: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 12,
  },
});
