import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SiftMark } from '@/components/sift/SiftMark';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/kit';
import { SiftColors, SiftFontFamily, SiftRadius, SiftSpacing, SiftType } from '@/constants/sift-theme';
import { useOrientation } from '@/hooks/use-orientation';

export interface TopIcon {
  name: IconName;
  label: string;
  onPress: () => void;
  /** Colour of a small badge dot, when the destination has something new. */
  dot?: string;
}

export interface Action {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  arrow?: boolean;
}

interface ScreenProps {
  /** Inside a search the top bar shows a back arrow and label instead of the wordmark. */
  back?: { label: string; onPress: () => void };
  icons: TopIcon[];
  /** Title block. Landscape puts it in the left column, portrait stacks it first. */
  aside?: ReactNode;
  /** Landscape: pinned to the bottom of the left column. Portrait: follows the aside. */
  asideFooter?: ReactNode;
  children?: ReactNode;
  primary?: Action;
  ghost?: Action;
}

function TopBar({ back, icons }: Pick<ScreenProps, 'back' | 'icons'>) {
  return (
    <View style={styles.topBar}>
      {back ? (
        <Pressable onPress={back.onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Back to ${back.label}`} style={styles.topLeft}>
          <Icon name="back" size={10} color={SiftColors.textMute} />
          <Text style={[SiftType.label, { color: SiftColors.textMute }]}>{back.label}</Text>
        </Pressable>
      ) : (
        <View style={styles.topLeft} accessibilityRole="header">
          <SiftMark width={18} />
          <Text style={styles.wordmark}>SIFT</Text>
        </View>
      )}
      <View style={styles.topIcons}>
        {icons.map((icon) => (
          <Pressable
            key={icon.name}
            onPress={icon.onPress}
            hitSlop={11}
            accessibilityRole="button"
            accessibilityLabel={icon.label}
            style={styles.iconButton}>
            <Icon name={icon.name} size={11} color={SiftColors.textDim} />
            {icon.dot && <View style={[styles.iconDot, { backgroundColor: icon.dot }]} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Every app screen: canvas, safe area, top bar, scrolling body and the action
 * bar holding the one acid button. Landscape splits into a 230 px side column
 * and a main column; portrait stacks the same blocks.
 */
export function Screen({ back, icons, aside, asideFooter, children, primary, ghost }: ScreenProps) {
  const landscape = useOrientation() === 'landscape';

  const actions = primary ? (
    <View style={landscape ? styles.actionsLandscape : styles.actionBar}>
      {ghost && <Button variant="ghost" label={ghost.label} onPress={ghost.onPress} disabled={ghost.disabled} />}
      <Button
        label={primary.label}
        onPress={primary.onPress}
        disabled={primary.disabled}
        arrow={primary.arrow}
        style={landscape ? styles.primaryLandscape : styles.flex}
      />
    </View>
  ) : null;

  if (landscape) {
    return (
      <SafeAreaView style={styles.canvas} edges={['top', 'bottom', 'left', 'right']}>
        <TopBar back={back} icons={icons} />
        <View style={styles.split}>
          <View style={styles.aside}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.asideScroll}>
              {aside}
            </ScrollView>
            {asideFooter && <View style={styles.asideFooter}>{asideFooter}</View>}
          </View>
          <View style={styles.main}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.mainScroll}>
              {children}
            </ScrollView>
            {actions}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.canvas} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar back={back} icons={icons} />
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.portraitScroll}>
          {aside}
          {asideFooter}
          {children}
        </ScrollView>
        {actions}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  canvas: { flex: 1, backgroundColor: SiftColors.canvas },

  topBar: {
    height: 44,
    paddingHorizontal: SiftSpacing.s5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: SiftSpacing.s2, minHeight: 44 },
  wordmark: { fontFamily: SiftFontFamily.monoBold, fontSize: 13, letterSpacing: 1, color: SiftColors.text },
  topIcons: { flexDirection: 'row', gap: SiftSpacing.s3 },
  iconButton: {
    width: 22,
    height: 22,
    borderRadius: SiftRadius,
    backgroundColor: SiftColors.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: { position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: 3 },

  portraitScroll: { paddingHorizontal: SiftSpacing.s5, paddingTop: SiftSpacing.s2, paddingBottom: SiftSpacing.s7, gap: SiftSpacing.s6 },
  actionBar: {
    flexDirection: 'row',
    gap: SiftSpacing.s3,
    paddingHorizontal: SiftSpacing.s5,
    paddingTop: SiftSpacing.s4,
    paddingBottom: SiftSpacing.s4,
    backgroundColor: SiftColors.canvas,
    borderTopWidth: 1,
    borderTopColor: SiftColors.hairline,
    // The one shadow in the system: content reads as scrolling beneath the bar.
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },

  split: { flex: 1, flexDirection: 'row' },
  aside: { width: 230, paddingLeft: SiftSpacing.s5, paddingRight: SiftSpacing.s6, paddingBottom: SiftSpacing.s4 },
  asideScroll: { paddingTop: SiftSpacing.s1, gap: SiftSpacing.s5 },
  asideFooter: { borderTopWidth: 1, borderTopColor: SiftColors.hairline, paddingTop: SiftSpacing.s2 },
  main: { flex: 1, paddingRight: SiftSpacing.s5 },
  mainScroll: { paddingTop: SiftSpacing.s1, paddingBottom: SiftSpacing.s4, gap: SiftSpacing.s3 },
  actionsLandscape: { flexDirection: 'row', justifyContent: 'flex-end', gap: SiftSpacing.s3, paddingBottom: SiftSpacing.s3 },
  primaryLandscape: { minWidth: 188 },
});
