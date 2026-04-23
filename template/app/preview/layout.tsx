// USER TERRITORY — this layout and everything under app/preview/ is freely editable.
// INFRASTRUCTURE NOTE: The <PickBridge /> import below powers the click-to-reference
// feature. If the agent removes it, click-to-reference silently breaks. The system
// prompt explicitly forbids removing this import.
import './globals.css';
import PickBridge from '@/components/PickBridge';

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PickBridge />
      </body>
    </html>
  );
}
