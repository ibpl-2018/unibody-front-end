import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { useAsync, useDebounced } from '@/hooks/use-async';
import { api } from '@/lib/api';
import type { DeviceFamilyDTO, DeviceModelDTO } from '@/shared';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS } from '@/theme/tokens';
import { familyArt } from './catalog-art';
import { Input, Pill, Sheet, Text } from './ui';

let familiesCache: DeviceFamilyDTO[] | null = null;
/** Families with their models (cached for the session — catalog changes rarely). */
export async function loadFamilies(): Promise<DeviceFamilyDTO[]> {
  if (familiesCache) return familiesCache;
  const f = await api.store.families(true);
  familiesCache = f.filter((x) => x.active);
  return familiesCache;
}

export function ModelRow({ model, selected, onPress }: { model: DeviceModelDTO; selected?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${model.fullName}, ${model.aNumbers.join(', ')}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: RADIUS.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.accent : colors.lineSubtle,
        backgroundColor: selected ? colors.accentSoft : colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="callout" weight="600">
          {model.fullName}
        </Text>
        <Text variant="footnote" color="muted">
          {model.yearLabel} · {model.aNumbers.join(' / ')}
          {model.chip ? ` · ${model.chip}` : ''}
        </Text>
      </View>
      {typeof model.productCount === 'number' && (
        <Text variant="footnote" color="muted">
          {model.productCount} parts
        </Text>
      )}
      <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={20} color={selected ? colors.accent : colors.subtle} />
    </Pressable>
  );
}

/** Bottom sheet: pick a device family, then a model — or search by A-number. */
export function ModelPickerSheet({
  visible,
  onClose,
  onPick,
  initialFamily,
  selectedId,
  title = 'Choose your model',
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (m: DeviceModelDTO) => void;
  initialFamily?: string;
  selectedId?: string | null;
  title?: string;
}) {
  const { colors } = useTheme();
  const fam = useAsync(loadFamilies, [], { enabled: visible });
  const [slug, setSlug] = useState<string | undefined>(initialFamily);
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim(), 300);
  const search = useAsync(() => api.store.findModel(dq), [dq], { enabled: visible && dq.length >= 2 });

  // Re-sync the selected family whenever the sheet is (re)opened.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (visible) setSlug(initialFamily);
  }

  const families = fam.data ?? [];
  const current = families.find((f) => f.slug === slug) ?? families[0];
  const models = dq.length >= 2 ? (search.data ?? []) : (current?.models ?? []);

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Input
        placeholder="Search model or A-number (e.g. A2337)"
        value={q}
        onChangeText={setQ}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        right={q ? <Ionicons name="close-circle" size={18} color={colors.subtle} onPress={() => setQ('')} accessibilityLabel="Clear" /> : <Ionicons name="search" size={18} color={colors.subtle} />}
        hint="The A-number is printed on the bottom case, near the regulatory text."
      />
      {dq.length < 2 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {families.map((f) => (
            <Pill
              key={f.id}
              label={f.name}
              active={f.slug === current?.slug}
              onPress={() => setSlug(f.slug)}
              left={
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tint[familyArt(f.slug).tint], alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={familyArt(f.slug).icon} size={15} color={colors.fg} />
                </View>
              }
            />
          ))}
        </ScrollView>
      )}
      {fam.loading || search.loading ? (
        <ActivityIndicator style={{ marginVertical: 24 }} />
      ) : fam.error ? (
        <Text color="danger">{fam.error}</Text>
      ) : models.length === 0 ? (
        <Text color="muted" center style={{ marginVertical: 20 }}>
          {dq.length >= 2 ? `No model matches “${dq}”. Try the A-number from the bottom case.` : 'No models yet.'}
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {models.map((m) => (
            <ModelRow
              key={m.id}
              model={m}
              selected={m.id === selectedId}
              onPress={() => {
                onPick(m);
                onClose();
              }}
            />
          ))}
        </View>
      )}
    </Sheet>
  );
}
