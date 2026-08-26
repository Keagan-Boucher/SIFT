import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SiftSigilColor, SiftType } from '@/constants/sift-theme';

const STEP_MS = 400;

/**
 * Three dots that fill in one at a time and reset, so a running search reads
 * as alive without a progress bar. Every dot keeps its slot whether it is
 * showing or not, so nothing beside the heading shifts on each step.
 */
export function RunningDots() {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setShown((n) => (n % 3) + 1), STEP_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.row}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={[styles.dot, { opacity: i < shown ? 1 : 0 }]}>
          .
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  dot: { ...SiftType.label, color: SiftSigilColor['//'] },
});
