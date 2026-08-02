import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Gestão de Pedidos',
  description: 'Operação de pedidos, estoque e vendas.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
