import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X, Users, BarChart3, Receipt, Package, Vote, ShieldCheck, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { TextEffect } from '@/components/ui/text-effect'
import { cn } from '@/lib/utils'

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring' as const,
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

export function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <section>
                    <div className="relative pt-24 md:pt-36">
                        <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_10%,transparent_40%,hsl(var(--primary))_100%)]"></div>
                        <div className="absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-background to-transparent"></div>
                        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-background to-transparent"></div>

                        <div className="mx-auto max-w-7xl px-6">
                            <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                                <TextEffect
                                    preset="fade"
                                    per="word"
                                    as="h1"
                                    className="text-balance text-4xl font-serif md:text-6xl lg:text-7xl text-foreground"
                                    delay={0.2}
                                >
                                    Menos burocracia, mais convivência
                                </TextEffect>

                                <TextEffect
                                    per="word"
                                    as="p"
                                    preset="fade"
                                    delay={0.5}
                                    className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground"
                                >
                                    A plataforma definitiva para repúblicas, colivings e moradias compartilhadas. Controle despesas, cartões de crédito, estoque e decisões da casa em um só lugar.
                                </TextEffect>

                                <AnimatedGroup
                                    preset="blur-slide"
                                    className="mt-12 flex flex-col items-center justify-center gap-3 md:flex-row"
                                >
                                    <div key="cta-1">
                                        <Button size="lg" className="rounded-xl px-6 h-12 text-base" asChild>
                                            <Link to="/login">
                                                <span className="text-nowrap">Acessar o Covivo</span>
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                    <div key="cta-2">
                                        <Button size="lg" variant="outline" className="rounded-xl px-6 h-12 text-base bg-background/50 backdrop-blur-sm" asChild>
                                            <a href="#features">
                                                <span className="text-nowrap">Ver recursos</span>
                                            </a>
                                        </Button>
                                    </div>
                                </AnimatedGroup>
                            </div>
                        </div>

                        <AnimatedGroup
                            variants={transitionVariants}
                            className="relative mt-20 overflow-hidden rounded-2xl border border-border bg-background shadow-lg shadow-primary/5 sm:mx-6 lg:mx-auto lg:max-w-5xl"
                        >
                            <div key="hero-img" className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=2878&q=80"
                                    alt="Moradia compartilhada"
                                    className="w-full rounded-2xl"
                                />
                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-border pointer-events-none"></div>
                            </div>
                        </AnimatedGroup>
                    </div>
                </section>

                <section id="features" className="py-24 md:py-32 bg-muted/30">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="mx-auto max-w-2xl text-center mb-16">
                            <span className="text-primary font-semibold tracking-wider uppercase text-sm">Tudo em um só lugar</span>
                            <h2 className="mt-3 text-balance text-3xl font-serif font-bold text-foreground md:text-4xl">
                                Feito para organizar a vida em grupo
                            </h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Chega de planilhas confusas e cobranças no WhatsApp. O Covivo automatiza e dá transparência para toda a casa.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                { icon: Receipt, label: 'Despesas e Cartões', desc: 'Lançamento de gastos à vista, parcelados e controle completo de faturas de cartões de crédito.' },
                                { icon: Users, label: 'Rateio Inteligente', desc: 'Divisão flexível: igualitária para todos ou configurada por porcentagem para cada morador.' },
                                { icon: RefreshCw, label: 'Contas Recorrentes', desc: 'Aluguel, internet e energia lançados automaticamente a cada virada de mês.' },
                                { icon: Package, label: 'Estoque e Compras', desc: 'Acompanhe itens de uso comum e crie listas de supermercado colaborativas.' },
                                { icon: Vote, label: 'Decisões Coletivas', desc: 'Mural de avisos, regras da casa e sistema de votações para decisões democráticas.' },
                                { icon: FileText, label: 'Relatórios e Auditoria', desc: 'Geração de PDF/CSV para prestação de contas mensal e log de todas as ações.' },
                            ].map((f) => (
                                <div
                                    key={f.label}
                                    className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-background p-6 shadow-sm transition-shadow hover:shadow-md"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
                                        <f.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-semibold text-foreground text-lg">{f.label}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {f.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <footer className="border-t border-border py-10 bg-background">
                    <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-1 font-serif text-xl tracking-tight text-foreground">
                            <span className="font-medium">Co</span>
                            <span className="font-bold text-primary">vivo</span>
                        </div>
                        <p className="text-sm text-muted-foreground text-center md:text-left">
                            © {new Date().getFullYear()} Covivo. Todos os direitos reservados.
                        </p>
                    </div>
                </footer>
            </main>
        </>
    )
}

const menuItems = [
    { name: 'Recursos', href: '#features' },
]

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header>
            <nav
                data-state={isScrolled ? 'scrolled' : 'top'}
                className="fixed z-50 w-full px-4 group top-2"
            >
                <div
                    className={cn(
                        'mx-auto max-w-7xl rounded-2xl border border-transparent bg-transparent px-6 py-3 transition-all duration-300 lg:px-8',
                        isScrolled && 'border-border/50 bg-background/80 backdrop-blur-xl shadow-sm'
                    )}
                >
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/" aria-label="Home" className="flex items-center gap-1 font-serif text-2xl tracking-tight">
                                <span className="text-foreground font-medium">Co</span>
                                <span className="text-primary font-bold">vivo</span>
                            </Link>
                            <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary sm:inline-flex">
                                Beta
                            </span>
                        </div>

                        {/* Desktop nav */}
                        <div className="hidden lg:flex lg:items-center lg:gap-8 absolute left-1/2 -translate-x-1/2">
                            <ul className="flex gap-8 text-sm font-medium">
                                {menuItems.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.href}
                                            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                                        >
                                            {item.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Desktop CTA */}
                        <div className="hidden lg:flex lg:items-center">
                            <Button size="sm" className="rounded-full px-5" asChild>
                                <Link to="/login">Entrar</Link>
                            </Button>
                        </div>

                        {/* Mobile Toggle */}
                        <button
                            onClick={() => setMenuState(!menuState)}
                            aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                            className="relative z-20 block cursor-pointer p-2 lg:hidden text-foreground"
                        >
                            {menuState ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>

                        {/* Mobile nav dropdown */}
                        <div
                            className={cn(
                                'absolute inset-x-0 top-[calc(100%+1rem)] origin-top rounded-2xl border border-border bg-background/95 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 lg:hidden',
                                menuState ? 'scale-100 opacity-100 visible' : 'scale-95 opacity-0 invisible'
                            )}
                        >
                            <ul className="space-y-4 text-base font-medium">
                                {menuItems.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.href}
                                            onClick={() => setMenuState(false)}
                                            className="text-muted-foreground hover:text-foreground transition-colors block"
                                        >
                                            {item.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-6 pt-6 border-t border-border">
                                <Button className="w-full rounded-xl h-12 text-base" asChild>
                                    <Link to="/login">Entrar no Covivo</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}

export default HeroSection