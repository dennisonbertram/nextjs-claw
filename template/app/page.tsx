import AppShell from '@/components/AppShell';
import PreviewFrame from '@/components/PreviewFrame';

export default function Shell() {
  return (
    <AppShell>
      <PreviewFrame src="/preview" />
    </AppShell>
  );
}
