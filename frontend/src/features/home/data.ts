/**
 * Conteúdo da landing page, separado dos componentes.
 *
 * Por que separar: na Fase 2/3 estes mesmos dados passam a vir de `GET /api/v1/...`
 * (programas, agenda, indicadores). Com o conteúdo num módulo só, a troca é trocar o
 * array estático por um useQuery — sem reescrever o JSX.
 *
 * Fonte: manual de identidade visual e referência de layout em `refs/`.
 */

/* -------------------------------------------------------------------------- */
/* Instituição                                                                 */
/* -------------------------------------------------------------------------- */

export const ONG = {
  nome: 'ONG do Povo',
  slogan: 'Mais oportunidades para um futuro melhor.',
  descricao:
    'A Ong do Povo foi fundada em 2013 por Rodrigo e Ana, que começaram suas atividades na garagem de sua casa no bairro Caieiras, em Praia Grande. Inicialmente, com poucos recursos e estrutura improvisada, eles ofereceram atividades como muay thai, balé e treinamento funcional para crianças da comunidade. A iniciativa foi oficialmente consolidada em 2020, quando Rodrigo e Ana fundaram a ONG do Povo, criando um espaço dedicado à transformação social por meio do esporte e da inclusão. Desde então, a ONG tem impactado positivamente a vida de muitas crianças e jovens, oferecendo uma variedade de atividades e programas que promovem desenvolvimento pessoal e comunitário. O propósito central do projeto é ser um movimento de transformação social, baseado em amor, dedicação e respeito, inspirando e acolhendo gerações da comunidade.',
  assinatura:
    'Juntos por mais inclusão, bem-estar e transformação social.',
  areas: ['Esporte', 'Saúde', 'Educação', 'Comunidade'],
  instagram: 'ongdopovo_',
  instagramUrl: 'https://instagram.com/ongdopovo_',
  facebook: 'https://facebook.com/ongdopovo',
  // DDD 13 — Praia Grande/SP. O manual de marca citava (11) 98268-7879, mas o
  // número da ONG é este. Confirmado pelo time em 04/10/2026.
  whatsapp: 'https://wa.me/5513988066437',
  telefone: '(13) 98806-6437',
  endereco: 'Av. São Francisco de Assis, 1100 - Caieiras, Praia Grande',
  /** Link do Google Maps para a localização da ONG. */
  linkMaps: 'https://maps.app.goo.gl/M9RA1ws8S4NTeubg8',
  /** Cidade separada do endereço para o rodapé não duplicar a informação. */
  cidade: 'Praia Grande/SP',
  /** CNPJ da ONG — também é a chave PIX (somente dígitos). */
  cnpj: '53.289.941/0001-53',
  chavePix: '53289941000153',
  email: 'ongdopovo@outlook.com',
  horarioAtendimento: '9:00~12:00 e 14:00~17:00',
  horarioFuncionamento: '9:00~22:00',
} as const

/* -------------------------------------------------------------------------- */
/* Navegação                                                                   */
/* -------------------------------------------------------------------------- */

export const NAVEGACAO = [
  { label: 'Quem somos', href: '#quem-somos' },
  { label: 'Impacto', href: '#impacto' },
  { label: 'Programas', href: '#programas' },
  { label: 'Nosso espaço', href: '#espaco' },
  { label: 'Doe', href: '#doe' },
  { label: 'Contato', href: '#contato' },
] as const

/* -------------------------------------------------------------------------- */
/* Essência — os cinco valores do manual                                       */
/* -------------------------------------------------------------------------- */

export const VALORES = [
  { label: 'Inclusão', icon: 'users' },
  { label: 'Movimento', icon: 'run' },
  { label: 'Esperança', icon: 'heart' },
  { label: 'Comunidade', icon: 'hands' },
  { label: 'Impacto social', icon: 'star' },
] as const

/* -------------------------------------------------------------------------- */
/* Quem somos — três princípios                                                 */
/* -------------------------------------------------------------------------- */

export const PRINCIPIOS = [
  {
    titulo: 'Acolhimento e Respeito',
    descricao:
      'Cada criança e jovem é recebida com carinho e respeito, independente da sua origem ou condição.',
    icon: 'heart',
    cor: 'vermelho',
  },
  {
    titulo: 'Compromisso Integral',
    descricao:
      'Não entregamos apenas uma aula: acompanhamos a evolução e o bem-estar de cada aluno.',
    icon: 'shield',
    cor: 'azul',
  },
  {
    titulo: 'Sustentabilidade Local',
    descricao:
      'Recursos da própria comunidade circulando dentro dela, gerando oportunidades e autonomia.',
    icon: 'sprout',
    cor: 'verde',
  },
] as const

/* -------------------------------------------------------------------------- */
/* Impacto em números                                                          */
/* -------------------------------------------------------------------------- */

export const INDICADORES = [
  { valor: 450, sufixo: '+', rotulo: 'Alunos Ativos' },
  { valor: 1200, sufixo: '+', rotulo: 'Eventos de Vida' },
  { valor: 15, sufixo: '+', rotulo: 'Programas e Modalidades' },
] as const

/* -------------------------------------------------------------------------- */
/* Programas e atividades                                                       */
/* -------------------------------------------------------------------------- */

export const PROGRAMAS = [
  {
    slug: 'ballet',
    nome: 'Ballet Clássico',
    resumo: 'Iniciação à dança com foco em postura, ritmo e confiança.',
    descricao:
      'Aulas de ballet clássico para crianças a partir de 5 anos, com foco em postura, confiança e primeiro contato com a dança.',
    categoria: 'esporte',
    cor: 'roxo',
    icone: 'ballet',
    // 'vagas' removido conforme solicitado Fase 3.
  },
  {
    slug: 'basquete',
    nome: 'Basquete',
    resumo: 'Formação esportiva com foco em técnica e trabalho em equipe.',
    descricao:
      'Treinos de basquete do fundamental ao sub-15, com foco em técnica, condicionamento e trabalho em equipe.',
    categoria: 'esporte',
    cor: 'laranja',
    icone: 'basquete',
    // 'vagas' removido conforme solicitado Fase 3.
  },
  {
    slug: 'futsal',
    nome: 'Futsal',
    resumo: 'Esporte acessível que acolhe todos os níveis de habilidade.',
    descricao:
      'Treinos de futsal em regime aberto, com foco em socialização e integração, sem restrição de nível de habilidade.',
    categoria: 'esporte',
    cor: 'verde',
    icone: 'futsal',
    // 'vagas' removido conforme solicitado Fase 3.
  },
  {
    slug: 'saude-visual',
    nome: 'Exames de Vista e Óculos',
    resumo: 'Exame de vista gratuito. Você paga apenas a armação.',
    descricao:
      'O exame de vista é gratuito. Quem precisar de óculos paga apenas a armação.',
    categoria: 'saude',
    cor: 'azul',
    icone: 'olhos',
    // 'vagas' removido conforme solicitado Fase 3.
  },
  {
    slug: 'capacitacao',
    nome: 'Cursos e Capacitação',
    resumo: 'Cursos profissionalizantes abertos à comunidade.',
    descricao:
      'Cursos profissionalizantes com certificação, voltados a adultos e jovens em situação de vulnerabilidade social.',
    categoria: 'capacitacao',
    cor: 'amarelo',
    icone: 'capacitacao',
    // 'vagas' removido conforme solicitado Fase 3.
  },
  {
    slug: 'eventos',
    nome: 'Eventos e Festivais',
    resumo: 'Integração e ações comunitárias ao longo do ano.',
    descricao:
      'Eventos desportivos, festivais e ações comunitárias que aproximam famílias e celebram as conquistas do bairro.',
    categoria: 'comunidade',
    cor: 'vermelho',
    icone: 'festa',
    // 'vagas' removido conforme solicitado Fase 3.
  },
] as const

/* -------------------------------------------------------------------------- */
/* Doação                                                                       */
/* -------------------------------------------------------------------------- */

export const VALORES_DOACAO = [
  {
    valor: 50,
    descricao: 'Ajuda a manter o ballet acessível a todas as crianças.',
  },
  {
    valor: 100,
    descricao: 'Financia materiais esportivos e fraldas para os alunos.',
  },
  {
    valor: 150,
    descricao: 'Garante oficinas e o food dos eventos comunitários.',
  },
]

/* -------------------------------------------------------------------------- */
/* QR Code e itens de doação                                                    */
/* -------------------------------------------------------------------------- */

export const QR_CODE_IMG = '/img/qr-code-ong.png'

export const ITENS_DOACAO = [
  'Alimentos não perecíveis',
  'Cadeiras de rodas',
  'Muitoes',
  'Cadeiras de banho',
] as const

/* -------------------------------------------------------------------------- */
/* Voluntariado                                                                 */
/* -------------------------------------------------------------------------- */

export const FRONTEIRAS_VOLUNTARIADO = [
  {
    titulo: 'Professores e Técnicos',
    descricao:
      'Você é professor de educação física, instrutor de dança ou técnico de saúde? A ONG do Povo está aberta a uma parceria.',
  },
  {
    titulo: 'Apoio, Família e Saúde',
    descricao:
      'Precisa de orientação sobre saúde, apoio social ou quer ajudar em mutirões? Nossa equipe orienta cada família.',
  },
] as const