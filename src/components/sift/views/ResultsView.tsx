import { StyleSheet, Text, View } from 'react-native';

import { CommandHeading } from '@/components/sift/CommandHeading';
import { ResultTile } from '@/components/sift/ResultTile';
import { SiftColors, SiftSpacing, SiftType } from '@/constants/sift-theme';
import type { Orientation } from '@/hooks/use-orientation';
import type { SiftFlow } from '@/hooks/use-sift-flow';

interface ResultsViewProps {
  flow: SiftFlow;
  orientation: Orientation;
}

export function ResultsView({ flow, orientation }: ResultsViewProps) {
  const { resultSuffix, tiles, resultMetadata } = flow;

  const tileGrid = (
    <View style={styles.tiles}>
      {tiles.map((tile) => (
        <View key={tile.retailer} style={styles.tileCol}>
          <ResultTile title={tile.title} tier={tile.tier} confidence={tile.confidence} price={tile.price} retailer={tile.retailer} count={tile.count} lowest={tile.lowest} />
          <Text style={styles.tileDomain} numberOfLines={1}>
            {tile.domain}
          </Text>
        </View>
      ))}
    </View>
  );

  const metadata = (
    <View style={styles.metadata}>
      {resultMetadata.map((line) => (
        <Text key={line} style={styles.metaLine}>
          {line}
        </Text>
      ))}
    </View>
  );

  if (orientation === 'landscape') {
    return (
      <View style={styles.wrap}>
        <CommandHeading sigil="//" text="SEARCH_COMPLETE" suffix={resultSuffix} />
        {tileGrid}
        <View style={styles.bottomRow}>{metadata}</View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <CommandHeading sigil="//" text="SEARCH_COMPLETE" suffix={resultSuffix} />
      {tileGrid}
      {metadata}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: SiftSpacing.space4, gap: SiftSpacing.space3 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: SiftSpacing.space3 },
  tileCol: { gap: 5 },
  tileDomain: { ...SiftType.annot, color: SiftColors.bone, width: 160 },
  bottomRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: SiftSpacing.space4 },
  metadata: { gap: 5 },
  metaLine: { ...SiftType.annot, color: SiftColors.boneDim },
});
