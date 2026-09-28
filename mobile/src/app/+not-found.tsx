import { router, Stack } from 'expo-router';

import { Button, EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <EmptyState icon="help-circle-outline" title="This page doesn’t exist" body="The link may be old or mistyped." action={<Button title="Go home" onPress={() => router.replace('/')} />} />
    </>
  );
}
