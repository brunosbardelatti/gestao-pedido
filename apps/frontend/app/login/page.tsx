import Image from 'next/image';
import { PackageCheck } from 'lucide-react';

import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="login-layout">
      <div className="login-visual" aria-hidden>
        <Image
          src="/images/cosmetics-workspace.png"
          alt=""
          fill
          priority
          quality={70}
          sizes="(max-width: 768px) 100vw, 68vw"
          className="object-cover object-left-center"
        />
        <div className="login-visual-caption">
          <span>Pedidos</span>
          <span>Estoque</span>
          <span>Vendas</span>
        </div>
      </div>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-inner">
          <div className="brand-mark">
            <span className="brand-icon" aria-hidden>
              <PackageCheck className="size-5" strokeWidth={1.8} />
            </span>
            <span>Gestão de Pedidos</span>
          </div>

          <div className="mt-16 animate-form-in sm:mt-24">
            <p className="section-kicker">Acesso ao sistema</p>
            <h1 id="login-title" className="mt-3 text-3xl font-semibold sm:text-4xl">
              Entre na sua conta
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Use seu login e senha para continuar a operação.
            </p>
            <LoginForm />
          </div>

          <p className="mt-auto pt-12 text-xs text-muted-foreground">
            Acesso restrito a usuários autorizados.
          </p>
        </div>
      </section>
    </main>
  );
}
