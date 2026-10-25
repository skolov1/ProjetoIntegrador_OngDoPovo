# LGPD no cadastro de alunos

Este documento resume quais dados pessoais o painel da ONG do Povo guarda, por quê, o que **não** é coletado e como atender o pedido de um titular.

## Dados guardados e finalidade

| Dado | Quem | Finalidade |
|---|---|---|
| Nome, data de nascimento, sexo | Aluno | Identificar o aluno e separar menor de maior de idade. |
| RG ou certidão de nascimento (opcional) | Aluno | Conferência na matrícula. |
| CPF | Só aluno **maior de 18 anos** (opcional) | Identificação do adulto. O menor não tem CPF guardado. |
| Nome, CPF, RG, telefone e endereço | Responsável do menor | Identificar quem responde pelo menor e permitir contato. Nome, CPF e telefone são obrigatórios. |
| Exame de aptidão física: situação (pendente, apto, não apto) e validade | Aluno menor | Saber se o menor pode praticar a atividade e quando o exame vence. |
| Consentimento: nome do responsável, data e hora, versão do termo | Menor | Provar que o responsável autorizou o tratamento dos dados do menor. |
| Turma, mensalidade, situação (ativo/inativo) e presenças | Aluno | Operação da ONG: turmas, cobrança e lista de chamada. |

## O que não é coletado

- **Título de eleitor.** Nunca é pedido nem guardado.
- **Conteúdo do atestado médico.** O sistema guarda só a situação do exame e a validade. O documento fica com a ONG, em papel.
- **Imagem ou arquivo de documento** (RG, CPF, comprovante de residência, certidão). Não há upload. Os documentos são conferidos na matrícula presencial.
- **CPF do menor.** Só o CPF do responsável é guardado.

## Como os dados são protegidos

- O painel exige login de administrador.
- Na listagem de alunos o CPF aparece mascarado (`123.***.***-00`), só para maior de idade. O CPF completo só aparece ao abrir o cadastro para edição. Dados do responsável também não aparecem na listagem.
- CPF e telefone não vão em URL nem em parâmetro de busca. A busca é só por nome.
- Menor de 18 anos só é salvo com o checkbox "Responsável autorizou o tratamento dos dados do menor". Cada autorização vira um registro de consentimento com a versão do termo (`VERSAO_TERMO` em `apidjango/doacoes/models.py`). Ao mudar o texto do termo, aumente a versão.

## Atendendo o pedido de um titular

O titular (o adulto, ou o responsável pelo menor) pode pedir:

- **Correção.** Em *Alunos*, abra o cadastro com o botão de editar, corrija e salve.
- **Saída da atividade sem apagar o histórico.** Use **Inativar**. O aluno sai das turmas e da lista de chamada e o cadastro fica guardado.
- **Exclusão dos dados.** Use **Excluir definitivamente** (botão separado, com confirmação). Isso apaga o cadastro do aluno, o registro de consentimento e as presenças dele. Não dá para desfazer.
- **Cópia dos dados.** Abra o cadastro e entregue ao titular as informações que constam nele. Os dados também podem ser consultados pelo admin do Django (`/admin/`).

Guarde apenas o necessário para a operação e apague o cadastro de quem pediu a exclusão, salvo obrigação legal de manter o dado.

## Pendente

- Registro formal do texto do termo (hoje só a versão é gravada).
- Definir por quanto tempo cadastros de alunos inativos são mantidos.
- Decidir se o CPF/RG do responsável deve ser criptografado no banco (previsto para a migração ao MongoDB).
