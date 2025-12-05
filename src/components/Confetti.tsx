/**
 * Confetti Celebration Component
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { Colors } from '../constants/LinearDesign';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [Colors.brand, Colors.positive, '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7'];
const NUM_CONFETTI = 50;

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  color: string;
  size: number;
  delay: number;
}

interface ConfettiProps {
  visible: boolean;
  onComplete?: () => void;
}

export default function Confetti({ visible, onComplete }: ConfettiProps) {
  const confettiPieces = useRef<ConfettiPiece[]>([]);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!confettiPieces.current.length) {
      confettiPieces.current = Array.from({ length: NUM_CONFETTI }, () => ({
        x: new Animated.Value(Math.random() * SCREEN_WIDTH),
        y: new Animated.Value(-50),
        rotate: new Animated.Value(0),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 8 + Math.random() * 8,
        delay: Math.random() * 500,
      }));
    }
  }, []);

  useEffect(() => {
    if (visible) {
      // Reset positions
      confettiPieces.current.forEach((piece) => {
        piece.x.setValue(Math.random() * SCREEN_WIDTH);
        piece.y.setValue(-50);
        piece.rotate.setValue(0);
      });

      // Fade in
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

      // Animate each piece
      const animations = confettiPieces.current.map((piece) => {
        return Animated.parallel([
          Animated.timing(piece.y, {
            toValue: SCREEN_HEIGHT + 100,
            duration: 3000 + Math.random() * 2000,
            delay: piece.delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(piece.x, {
            toValue: (piece.x as any)._value + (Math.random() - 0.5) * 200,
            duration: 3000 + Math.random() * 2000,
            delay: piece.delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotate, {
            toValue: 360 * (2 + Math.random() * 3),
            duration: 3000 + Math.random() * 2000,
            delay: piece.delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(animations).start(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          onComplete?.();
        });
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      {confettiPieces.current.map((piece, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              width: piece.size,
              height: piece.size * 0.6,
              backgroundColor: piece.color,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                { rotate: piece.rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
              ],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
  },
});
