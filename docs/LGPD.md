# LGPD no cadastro de alunos

Este documento resume quais dados pessoais o painel da ONG do Povo guarda, por quê, o que **não** é coletado e como atender o pedido de um titular.

## Dados guardados e finalidade

| Dado | Quem | Finalidade |
|---|---|---|
| Nome, data de nascimento, sexo | Aluno | Identificar o aluno e separar menor de maior de idade. |
| RG ou certidão de nascimento (opcional) | Aluno | Conferência na matrícula. |
| CPF | Só aluno **maior de 18 anos** (opcional) | Identificação do adulto. O menor não tem CPF guardado. |
| Nome, CPF, RG, telefone e endereço | Responsável do menor | Identificar quem responde pelo menor e permitir contato. Nome, CPF e telefone são obrigatórios. |
| Comprovante de residência e título de eleitor: só a situação (pendente ou entregue) | Aluno (título só para maior) | Saber se a documentação da matrícula está completa. O documento em si não é guardado. |
| Exame de aptidão física: situação (pendente, apto, não apto) e validade | Aluno menor | Saber se o menor pode praticar a atividade e quando o exame vence. |
| Consentimento: nome do responsável, data e hora, versão do termo | Menor | Provar que o responsável autorizou o tratamento dos dados do menor. |
| Doação de item: item (ou outro, escrito pela equipe), quantidade, data, observação e nome do doador (opcional; vazio = anônimo) | Doador | Controlar o que a ONG recebeu (alimentos, cadeiras, muletas). Sem telefone, e-mail ou documento. |
| Empréstimo de item: item emprestado (de uma doação), quantidade, nome de quem pegou, data do empréstimo e da devolução, observação | Quem pegou o item | Saber onde está o item e avisar quando passa de 3 meses sem devolução. Só o nome: sem telefone, e-mail ou documento. |
| Registro de auditoria: conta de quem criou, alterou ou excluiu, data e hora, tipo e identificação do registro e os campos alterados | Equipe da ONG (quem usa o painel) | Saber quem fez cada alteração e proteger os dados. CPF, RG, telefone e endereço aparecem ocultos no registro. |
| Turmas, situação (ativo/inativo) e presenças; a mensalidade é calculada (R$ 20 por turma), podendo ser ajustada por aluno | Aluno | Operação da ONG: turmas, cobrança e lista de chamada. |

## O que não é coletado

- **Número do título de eleitor e do comprovante de residência.** Só se guarda a situação (pendente ou entregue).
- **Conteúdo do atestado médico.** O sistema guarda só a situação do exame e a validade. O documento fica com a ONG, em papel.
- **Imagem ou arquivo de documento** (RG, CPF, comprovante de residência, título, certidão). Não há upload. Os documentos são conferidos na matrícula presencial.
- **CPF do menor.** Só o CPF do responsável é guardado.

## Como os dados são protegidos

- O painel exige login de administrador.
- Na listagem de alunos o CPF aparece mascarado (`123.***.***-00`), só para maior de idade. O CPF completo só aparece ao abrir o cadastro para edição. Dados do responsável também não aparecem na listagem.
- CPF e telefone não vão em URL nem em parâmetro de busca. A busca é só por nome.
- Na listagem de professores o CPF também aparece mascarado; o completo só ao abrir a edição. A busca de professores é só por nome (CPF e e-mail não entram na busca).
- A grade da semana da landing (`GET /api/v1/grade/`, pública) mostra só dia, nome, horário e situação (Ativo, Agendado ou, para o visitante, "Procuramos professor"). Não traz nome de professor, aluno nem contagem de pessoas. Só entra turma marcada como "Mostrar na grade" (desligado por padrão) e atividade avulsa visível; turma inativa ou encerrada não aparece.
- Cada pessoa da equipe usa a própria conta, com nome e sobrenome cadastrados no `/admin/`. Não compartilhe a senha: a aba **Auditoria** mostra quem criou, alterou ou excluiu cada registro, e isso só vale se cada pessoa usar a sua conta.
- A auditoria (`django-auditlog`, configurada em `apidjango/doacoes/auditoria.py`) grava só o necessário: CPF, RG, telefone, e-mail e endereço têm o valor oculto no registro (aparece que o campo mudou, não o que estava escrito). Ao **excluir definitivamente** um aluno, o nome e os dados dele são apagados também do histórico; fica só quem excluiu, quando e que foi um aluno.
- Menor de 18 anos só é salvo com o checkbox "Responsável autorizou o tratamento dos dados do menor". Cada autorização vira um registro de consentimento com a versão do termo (`VERSAO_TERMO` em `apidjango/doacoes/models.py`). Ao mudar o texto do termo, aumente a versão.

## Atendendo o pedido de um titular

O titular (o adulto, ou o responsável pelo menor) pode pedir:

- **Correção.** Em *Alunos*, abra o cadastro com o botão de editar, corrija e salve.
- **Saída da atividade sem apagar o histórico.** Use **Inativar**. O aluno sai das turmas e da lista de chamada e o cadastro fica guardado.
- **Exclusão dos dados.** Use **Excluir definitivamente** (botão separado, com confirmação). Isso apaga o cadastro do aluno, o registro de consentimento e as presenças dele. Não dá para desfazer.
- **Cópia dos dados.** Abra o cadastro e entregue ao titular as informações que constam nele. Os dados também podem ser consultados pelo admin do Django (`/admin/`).

Guarde apenas o necessário para a operação e apague o cadastro de quem pediu a exclusão, salvo obrigação legal de manter o dado.

## Pendente

- Por quanto tempo o histórico de auditoria é guardado (hoje não há prazo).
- A auditoria não registra login e logout, e quem tem acesso ao `/admin/` do Django pode apagar o histórico: serve para rastrear, não é prova à prova de adulteração.
- Registro formal do texto do termo (hoje só a versão é gravada).
- Definir por quanto tempo cadastros de alunos inativos são mantidos.
- Decidir se o CPF/RG do responsável deve ser criptografado no banco (previsto para a migração ao MongoDB).
