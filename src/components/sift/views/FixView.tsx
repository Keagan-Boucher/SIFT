import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Heading, Input, Row } from '@/components/ui/kit';
import { Icon } from '@/components/ui/Icon';
import { SiftColors } from '@/constants/sift-theme';
import type { SiftFlow } from '@/hooks/use-sift-flow';
import { useOrientation } from '@/hooks/use-orientation';

/**
 * 07 Site failed. Resolution found no readable search page, so the user hands
 * one over. On success the pipeline writes it back to the registry and the
 * site is solved for everyone after.
 */
export function FixView({ flow }: { flow: SiftFlow }) {
  const { fixDomain, fixUrl, session, topIcons, actions } = flow;
  const landscape = useOrientation() === 'landscape';
  const domain = fixDomain ?? 'this site';
  const others = session.sources.length - 1;
  const arrow = <Icon name="arrow" size={11} color={SiftColors.textMute} />;

  return (
    <Screen
      back={{ label: 'Scan', onPress: () => actions.go('live') }}
      icons={topIcons}
      aside={
        <Heading
          alert="SEARCH FAILED"
          title={`Couldn’t find it on ${domain}`}
          sub="Their search page returned nothing we could read. Paste a search URL and Sift will remember it for every future scan."
          step={2}
          landscape={landscape}
          proseSub
        />
      }
      primary={{ label: 'Use this URL', onPress: actions.useUrl, disabled: !fixUrl.trim() || !fixDomain }}>
      <Input
        mono
        label="SEARCH URL"
        value={fixUrl}
        onChangeText={actions.setFixUrl}
        onSubmitEditing={actions.useUrl}
        placeholder={`${domain}/search?q=`}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        accessibilityLabel={`Search URL for ${domain}`}
      />
      <View style={styles.escapes}>
        <Row prose title="Try this site again" meta="ONE MORE ATTEMPT" onPress={actions.retry} right={arrow} />
        {fixDomain && (
          <Row
            prose
            title={`Drop ${fixDomain}`}
            meta={`CARRY ON WITH ${others} ${others === 1 ? 'SOURCE' : 'SOURCES'}`}
            onPress={() => actions.drop(fixDomain)}
            right={arrow}
            last
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  escapes: { marginTop: 8 },
});
